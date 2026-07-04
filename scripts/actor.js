/**
 * Extends the actor for GFL5R-specific processing.
 */
export class ActorGfl5r extends Actor {
    /**
     * @override
     */
    static async create(docData, options = {}) {
        // Replace default image
        if (docData.img === undefined) {
            const iconName = docData.type === "npc" ? "character" : docData.type;
            docData.img = `${CONFIG.gfl5r.paths.assets}icons/actors/${iconName}.svg`;
        }

        // Token defaults
        docData.prototypeToken = docData.prototypeToken || {};
        switch (docData.type) {
            case "character":
                foundry.utils.mergeObject(
                    docData.prototypeToken,
                    {
                        actorLink: true,
                        disposition: 1,
                        bar1: { attribute: "fatigue" },
                        bar2: { attribute: "strife" },
                    },
                    { overwrite: false }
                );
                break;

            case "npc":
                foundry.utils.mergeObject(
                    docData.prototypeToken,
                    {
                        actorLink: true,
                        disposition: 0,
                        bar1: { attribute: "fatigue" },
                        bar2: { attribute: "strife" },
                    },
                    { overwrite: false }
                );
                break;
        }
        return super.create(docData, options);
    }

    /**
     * @override
     */
    async update(docData = {}, context = {}) {
        docData = foundry.utils.flattenObject(docData);

        if (!docData["_id"]) {
            docData["_id"] = this.id;
        }

        context.parent = this.parent;
        context.pack = this.pack;

        // Only on linked Actor: sync token name/image
        if (
            !!docData["prototypeToken.actorLink"] ||
            (docData["prototypeToken.actorLink"] === undefined && this.prototypeToken?.actorLink)
        ) {
            Object.entries({ name: "name", img: "texture.src" }).forEach(([dataProp, TknProp]) => {
                if (
                    docData[dataProp] &&
                    !docData["prototypeToken." + TknProp] &&
                    this[dataProp] === foundry.utils.getProperty(this.prototypeToken, TknProp) &&
                    this[dataProp] !== docData[dataProp]
                ) {
                    docData["prototypeToken." + TknProp] = docData[dataProp];
                }
            });
        }

        return Actor.updateDocuments([docData], context).then(() => {
            if (game.settings.get(CONFIG.gfl5r.namespace, "gm-monitor-actors").some((uuid) => uuid === this.uuid)) {
                game.gfl5r.HelpersGfl5r.refreshLocalAndSocket("gfl5r-gm-monitor");
            }
        });
    }

    /** @inheritDoc */
    async _preUpdate(changes, options, user) {
        if (this.isCharacterType) {
            const strife = changes.system?.strife?.value ?? this.system.strife.value;
            const isCompromised = strife > this.system.composure;
            const fatigue = changes.system?.fatigue?.value ?? this.system.fatigue.value;
            const isIncapacitated = fatigue > this.system.endurance;
            await Promise.all([
                this.toggleStatusEffect('compromised', {active: isCompromised}),
                this.toggleStatusEffect('incapacitated', {active: isIncapacitated}),
            ]);
        }
    }

    /** @override */
    prepareData() {
        super.prepareData();

        if (this.isCharacterType) {
            const system = this.system;

            // Derive stats for PCs (NPCs set stats manually)
            if (this.isCharacter) {
                ActorGfl5r.computeDerivedAttributes(system);
            }

            const isCompromised = this.statuses.has("compromised");

            // Attribute bars
            system.fatigue.max = system.endurance;
            system.strife.max = system.composure;
            system.fortune_points.max = system.approaches.fortune;

            // If compromised, vigilance = 1
            system.is_compromised = isCompromised;

            // Clamp fortune points
            if (system.fortune_points.value > system.fortune_points.max) {
                system.fortune_points.value = system.fortune_points.max;
            }

            // Compute Fortification (sum of completed discipline ranks)
            if (system.disciplines) {
                system.fortification = Object.values(system.disciplines).reduce(
                    (sum, slot) => sum + (slot.ranksCompleted || 0), 0
                );
            }

            // Compute Collapse max (humans and transhumans): sum of all approaches × 5
            const collapseTypes = ["human", "transhuman"];
            if (collapseTypes.includes(system.identity?.characterType) && system.collapse) {
                const app = system.approaches;
                system.collapse.max = (
                    Number(app.power) + Number(app.precision) + Number(app.swiftness) +
                    Number(app.resilience) + Number(app.fortune)
                ) * 5;
            }

            // Compute Approach Limit (display only): no approach may exceed sum of two lowest
            if (system.approaches) {
                const vals = Object.values(system.approaches).map(Number).sort((a, b) => a - b);
                system.approach_limit = vals[0] + vals[1];
            }
        }
    }

    /**
     * Compute derived attributes from approaches.
     * Endurance: humans and transhumans (×2), T-Dolls (×3).
     * @param {Object} system
     */
    static computeDerivedAttributes(system) {
        const app = system.approaches;
        const power = Number(app.power);
        const precision = Number(app.precision);
        const swiftness = Number(app.swiftness);
        const resilience = Number(app.resilience);

        const charType = system.identity?.characterType;
        const enduranceMultiplier = charType === "t-doll" ? 3 : 2;

        system.endurance = (power + resilience) * enduranceMultiplier;
        system.composure = (resilience + swiftness) * 2;
        system.focus = power + precision;
        system.vigilance = Math.ceil((precision + swiftness) / 2);

        // Modifiers from active effects
        const modifiers = system.modifiers?.character;
        system.endurance = system.endurance + (Number(modifiers?.endurance) || 0);
        system.composure = system.composure + (Number(modifiers?.composure) || 0);
        system.focus = system.focus + (Number(modifiers?.focus) || 0);
        system.vigilance = system.vigilance + (Number(modifiers?.vigilance) || 0);
    }

    /**
     * Remove conditions by known string ids
     * @param conditions {Set<string>}
     * @returns {Promise<void>}
     */
    async removeConditions(conditions) {
        const effectsToRemove = this.statuses.intersection(conditions);
        const idsToRemove = this.effects.contents
            .filter(effect => effect.statuses.isSubsetOf(effectsToRemove))
            .map(effect => effect.id);
        await this.deleteEmbeddedDocuments("ActiveEffect", idsToRemove);
    }

    /**
     * Render the text template for this Actor
     * @return {Promise<string|null>}
     */
    async renderTextTemplate() {
        const sheetData = (await this.sheet?.getData()) || this;
        const tpl = await foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}actors/actor-text.html`, sheetData);
        if (!tpl) {
            return null;
        }
        return tpl;
    }

    get isCharacterType() {
        return ["character", "npc"].includes(this.type);
    }

    get isCharacter() {
        return this.type === "character";
    }

    get isNpc() {
        return this.type === "npc";
    }

    get isMinion() {
        return this.isNpc && this.system.threat_level === "minion";
    }

    get isHuman() {
        return this.isCharacterType && this.system.identity?.characterType === "human";
    }

    get isTDoll() {
        return this.isCharacterType && this.system.identity?.characterType === "t-doll";
    }

    get isTranshuman() {
        return this.isCharacterType && this.system.identity?.characterType === "transhuman";
    }

    get hasPlayerOwnerActive() {
        return game.users.find((u) => !!u.active && u.character?.id === this.id);
    }

    get canDoInitiativeRoll() {
        return game.combat?.combatants.some(
            (c) => !c.initiative && (c.tokenId === this.token?._id || (!this.token && c.actorId === this._id))
        );
    }

    get haveWeaponEquipped() {
        return this.items.some((e) => e.type === "weaponry" && !!e.system.equipped);
    }

    get haveWeaponReadied() {
        return this.items.some((e) => e.type === "weaponry" && !!e.system.equipped && !!e.system.readied);
    }

    get haveArmorEquipped() {
        return this.items.some((e) => e.type === "armor" && !!e.system.equipped);
    }

    get isPrepared() {
        if (!this.isCharacterType) {
            return false;
        }

        const npcPreparedSetting = this.system.threat_level === "minion"
            ? "initiative-prepared-minion"
            : "initiative-prepared-adversary";

        const cfg = {
            character: game.settings.get(CONFIG.gfl5r.namespace, "initiative-prepared-character"),
            npc: game.settings.get(CONFIG.gfl5r.namespace, npcPreparedSetting),
        };

        let isPrepared = this.isCharacter ? cfg.character : cfg.npc;
        if (isPrepared === "actor") {
            isPrepared = this.system.prepared ? "true" : "false";
        }

        return isPrepared;
    }

    get statusRank() {
        if (!this.isCharacterType) {
            return null;
        }
        return Math.floor(this.system.social.status / 10);
    }
}
