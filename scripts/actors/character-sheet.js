import { BaseCharacterSheetGfl5r } from "./base-character-sheet.js";
import { TwelveQuestionsDialog } from "./twelve-questions-dialog.js";
import { HUMAN_NATIONALITIES, HUMAN_BACKGROUNDS, TDOLL_FRAMES } from "./character-builder-data.js";

/**
 * Actor / Character Sheet
 */
export class CharacterSheetGfl5r extends BaseCharacterSheetGfl5r {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "actor"],
            template: CONFIG.gfl5r.paths.templates + "actors/character-sheet.html",
            tabs: [
                { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" },
            ],
        });
    }

    /**
     * Add the character builder button in header bar
     * @override
     */
    _getGfl5rHeaderButtons() {
        const buttons = super._getGfl5rHeaderButtons();
        if (!this.isEditable || this.actor.limited) {
            return buttons;
        }

        buttons.unshift({
            label: "gfl5r.twelve_questions.title",
            class: "twelve-questions",
            icon: "fas fa-question-circle",
            onclick: async () => {
                await new TwelveQuestionsDialog(this.actor).render(true);
            },
        });

        return buttons;
    }

    async getData(options = {}) {
        const sheetData = await super.getData(options);

        // Compute XP spent from advancements and techniques
        this._prepareAdvancement(sheetData);

        // Update spent_xp to actor
        this.actor.system.xp_spent = sheetData.data.system.xp_spent;

        // XP remaining
        sheetData.data.system.xp_saved = Math.floor(
            parseInt(sheetData.data.system.xp_total) - parseInt(sheetData.data.system.xp_spent)
        );

        // Skill groups for template rendering (enriched with rank/cost data)
        sheetData.data.skillGroups = this._prepareSkillGroups(sheetData);

        // Approach limit
        sheetData.data.approachLimit = this.actor.system.approach_limit;

        // Fortification
        sheetData.data.fortification = this.actor.system.fortification;

        // Character type info
        sheetData.data.isHuman = this.actor.isHuman;
        sheetData.data.isTDoll = this.actor.isTDoll;

        // Identity option tables (used by sheet identity selectors)
        sheetData.data.identityOptions = {
            nationalities: HUMAN_NATIONALITIES,
            backgrounds: HUMAN_BACKGROUNDS,
            frames: TDOLL_FRAMES,
        };

        // Prepare discipline card data
        sheetData.data.disciplineCards = this._prepareDisciplines(sheetData);

        return sheetData;
    }

    /**
     * Rank XP thresholds (cumulative): Rank 1 = 16, Rank 2 = 36, Rank 3 = 60
     */
    static RANK_THRESHOLDS = [16, 36, 60];

    /**
     * Normalize a display-name associated skill (e.g. "Hand to Hand") to a
     * snake_case skill ID (e.g. "hand_to_hand").
     */
    static normalizeSkillName(name) {
        return String(name || "").trim().toLowerCase().replace(/[\s\-]+/g, "_");
    }

    /**
     * Find discipline slot keys whose associated_skills include the given skillId.
     */
    _findDisciplineSlotsForSkill(skillId) {
        const slots = this.actor.system.disciplines || {};
        const results = [];
        for (const [slotKey, slot] of Object.entries(slots)) {
            if (!slot.disciplineId) continue;
            const disciplineItem = this.actor.items.get(slot.disciplineId);
            if (!disciplineItem) continue;
            const associated = (disciplineItem.system?.associated_skills || [])
                .map(s => CharacterSheetGfl5r.normalizeSkillName(s));
            if (associated.includes(skillId)) results.push(slotKey);
        }
        return results;
    }

    /**
     * Build update-data keys to add xpDelta to every discipline slot that
     * lists the given skill as an associated skill.
     */
    _buildDisciplineXpUpdate(skillId, xpDelta) {
        const slotKeys = this._findDisciplineSlotsForSkill(skillId);
        const updateData = {};
        for (const slotKey of slotKeys) {
            const slot = this.actor.system.disciplines[slotKey];
            const newXp = Math.max(0, (slot.xpSpent || 0) + xpDelta);
            const { currentRank, ranksCompleted } = CharacterSheetGfl5r.computeRankProgress(newXp);
            updateData[`system.disciplines.${slotKey}.xpSpent`] = newXp;
            updateData[`system.disciplines.${slotKey}.currentRank`] = currentRank;
            updateData[`system.disciplines.${slotKey}.ranksCompleted`] = ranksCompleted;
        }
        return updateData;
    }

    /**
     * Compute currentRank and ranksCompleted from cumulative xpSpent.
     * @param {number} xp - Total XP spent in the discipline
     * @returns {{currentRank: number, ranksCompleted: number}}
     */
    static computeRankProgress(xp) {
        const thresholds = CharacterSheetGfl5r.RANK_THRESHOLDS;
        let ranksCompleted = 0;
        for (const threshold of thresholds) {
            if (xp >= threshold) ranksCompleted++;
            else break;
        }
        const currentRank = Math.min(ranksCompleted + 1, 3);
        return { currentRank, ranksCompleted };
    }

    /**
     * Build discipline card data for template rendering.
     * Resolves discipline item IDs to actual items and maps learned technique IDs.
     */
    _prepareDisciplines(sheetData) {
        const slots = sheetData.data.system.disciplines || {};
        const cards = [];

        for (const [slotKey, slot] of Object.entries(slots)) {
            const disciplineItem = slot.disciplineId
                ? this.actor.items.get(slot.disciplineId)
                : null;

            // Resolve perk ID to actual owned item
            const perkItem = slot.perkId
                ? this.actor.items.get(slot.perkId)
                : null;

            // Resolve capstone ID to actual owned item
            const capstoneItem = slot.capstoneId
                ? this.actor.items.get(slot.capstoneId)
                : null;

            // Resolve technique IDs to actual owned items with explicit
            // itemId for reliable tooltip lookup from the template.
            const techniques = (slot.techniquesLearned || [])
                .map((itemId) => {
                    const item = this.actor.items.get(itemId);
                    if (!item) return null;
                    return {
                        itemId,
                        name: item.name,
                        img: item.img,
                        system: item.system,
                    };
                })
                .filter(Boolean);

            // Compute rank progress
            const xp = slot.xpSpent || 0;
            const thresholds = CharacterSheetGfl5r.RANK_THRESHOLDS;
            const currentThreshold = thresholds[Math.min((slot.currentRank || 1) - 1, 2)];
            const prevThreshold = (slot.currentRank || 1) > 1
                ? thresholds[(slot.currentRank || 1) - 2]
                : 0;
            const rankXp = xp - prevThreshold;
            const rankNeeded = currentThreshold - prevThreshold;

            cards.push({
                slotKey,
                active: !!disciplineItem,
                disciplineId: slot.disciplineId || null,
                name: disciplineItem?.name || null,
                img: disciplineItem?.img || null,
                associatedSkills: disciplineItem?.system?.associated_skills || [],
                perk: disciplineItem?.system?.perk || "",
                perkItem,
                capstone: disciplineItem?.system?.capstone || "",
                capstoneItem,
                capstoneEarned: (slot.ranksCompleted || 0) >= 3,
                unlockCost: slot.unlockCost || 0,
                xpSpent: xp,
                currentRank: slot.currentRank || 1,
                ranksCompleted: slot.ranksCompleted || 0,
                currentThreshold,
                rankXp: Math.max(0, rankXp),
                rankNeeded,
                techniques,
            });
        }
        // Only show active cards + the first empty slot
        let emptyShown = false;
        return cards.filter(card => {
            if (card.active) return true;
            if (!emptyShown) {
                emptyShown = true;
                return true;
            }
            return false;
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Update status bar fills (works even when not editable)
        this._updateStatusBars(html);

        // Update discipline progress bar fills
        this._updateDisciplineBars(html);

        if (!this.isEditable) {
            return;
        }

        // XP +/-
        html.find(".xp-control").on("click", this._modifyXP.bind(this));

        // Heat +/-
        html.find(".heat-control").on("click", this._modifyHeat.bind(this));

        // Approach rank +/- (spends XP)
        html.find(".approach-rank-control").on("click", this._modifyApproachRank.bind(this));

        // Skill rank +/- (spends XP)
        html.find(".skill-rank-control").on("click", this._modifySkillRank.bind(this));

        // Discipline card drop zones
        html.find(".discipline-card").on("dragover", this._onDisciplineDragOver.bind(this));
        html.find(".discipline-card").on("dragleave", this._onDisciplineDragLeave.bind(this));
        html.find(".discipline-card").on("drop", this._onDisciplineDrop.bind(this));

        // Remove technique from discipline
        html.find(".discipline-tech-remove").on("click", this._removeTechniqueFromDiscipline.bind(this));

        // Remove discipline from slot
        html.find(".discipline-remove").on("click", this._removeDisciplineFromSlot.bind(this));
    }

    /**
     * Compute and apply status bar fill widths and shifting colors.
     * Danger bars (fatigue, strife, collapse, heat, corruption) shift
     * hsl(120→0, 70%, 45%) i.e. green→red as ratio increases.
     * Fortune bar uses a fixed purple and fills based on remaining ratio.
     */
    _updateStatusBars(html) {
        html.find(".status-bar").each(function () {
            const current = parseFloat(this.dataset.current) || 0;
            const max = parseFloat(this.dataset.max) || 1;
            const ratio = Math.min(Math.max(0, current / max), 1);
            const fill = this.querySelector(".status-bar-fill");
            if (!fill) return;

            fill.style.width = `${(ratio * 100).toFixed(1)}%`;

            // Fortune bar: fixed purple, represents remaining resource
            if (this.classList.contains("fortune-bar")) {
                fill.style.background = `hsl(270, 60%, 55%)`;
            } else {
                // Danger bars: hue shifts 120 (green) → 0 (red) as ratio increases
                const hue = 120 - ratio * 120;
                fill.style.background = `hsl(${hue}, 70%, 45%)`;
            }
        });
    }

    /**
     * Compute and apply discipline rank progress bar fills
     */
    _updateDisciplineBars(html) {
        html.find(".discipline-progress-bar").each(function () {
            const current = parseFloat(this.dataset.current) || 0;
            const max = parseFloat(this.dataset.max) || 1;
            const ratio = Math.min(Math.max(0, current / max), 1);
            const fill = this.querySelector(".discipline-progress-fill");
            if (fill) {
                fill.style.width = `${(ratio * 100).toFixed(1)}%`;
            }
        });
    }

    /**
     * Cumulative XP cost to reach the given skill rank.
     * Each rank N costs N × skillCostMultiplier, so cumulative = mult × N(N+1)/2.
     * @param {number} rank
     * @returns {number}
     */
    static cumulativeSkillXp(rank) {
        const r = Math.max(0, parseInt(rank) || 0);
        const mult = CONFIG.gfl5r.xp.skillCostMultiplier;
        return mult * (r * (r + 1)) / 2;
    }

    /**
     * Cumulative XP cost to reach the given approach rank from the free baseline of 1.
     * Each rank N costs N × approachCostMultiplier, so cumulative = mult × N(N+1)/2.
     * Subtract the cost of rank 1 (which is free) to get net XP spent.
     * @param {number} rank
     * @returns {number}
     */
    static cumulativeApproachXp(rank) {
        const r = Math.max(0, parseInt(rank) || 0);
        const mult = CONFIG.gfl5r.xp.approachCostMultiplier;
        return mult * (r * (r + 1)) / 2;
    }

    /**
     * Compute XP spent from all advancement and technique items
     */
    _prepareAdvancement(sheetData) {
        sheetData.data.system.xp_spent = 0;

        sheetData.items
            .filter((item) => ["narrative", "technique"].includes(item.type))
            .forEach((item) => {
                const xpCost = parseInt(item.system.xp_cost) || 0;
                sheetData.data.system.xp_spent += xpCost;
            });

        // Include discipline unlock costs (5 XP for each discipline beyond the first)
        const slots = sheetData.data.system.disciplines || {};
        for (const slot of Object.values(slots)) {
            sheetData.data.system.xp_spent += slot.unlockCost || 0;
        }

        // Include cumulative XP cost of all skill ranks above the free baseline
        const skills = sheetData.data.system.skills || {};
        const skillsFree = sheetData.data.system.skills_free || {};
        for (const [id, rank] of Object.entries(skills)) {
            const free = parseInt(skillsFree[id]) || 0;
            sheetData.data.system.xp_spent +=
                CharacterSheetGfl5r.cumulativeSkillXp(rank) -
                CharacterSheetGfl5r.cumulativeSkillXp(free);
        }

        // Include cumulative XP cost of all approach ranks above the free baseline of 1
        const approaches = sheetData.data.system.approaches || {};
        for (const rank of Object.values(approaches)) {
            sheetData.data.system.xp_spent +=
                CharacterSheetGfl5r.cumulativeApproachXp(parseInt(rank) || 1) -
                CharacterSheetGfl5r.cumulativeApproachXp(1);
        }
    }

    /**
     * Build enriched skill group data for template rendering.
     * Each skill becomes an object with {id, rank, nextCost, refundAmount}.
     */
    _prepareSkillGroups(sheetData) {
        const skills = sheetData.data.system.skills || {};
        const skillsFree = sheetData.data.system.skills_free || {};
        const mult = CONFIG.gfl5r.xp.skillCostMultiplier;
        return CONFIG.gfl5r.skillGroups.map((group) => ({
            id: group.id,
            label: group.label,
            skills: group.skills.map((id) => {
                const rank = parseInt(skills[id]) || 0;
                const freeRank = parseInt(skillsFree[id]) || 0;
                const canDecrement = rank > freeRank;
                return {
                    id,
                    rank,
                    freeRank,
                    canDecrement,
                    nextCost: (rank + 1) * mult,
                    refundAmount: canDecrement ? rank * mult : 0,
                };
            }),
        }));
    }

    /**
     * Save computed derived values on update
     */
    _updateObject(event, formData) {
        const currentData = this.object.system;

        const characterType = formData["system.identity.characterType"] ?? currentData.identity?.characterType;
        if (characterType === "t-doll") {
            const frameKey = formData["system.identity.frame"] ?? currentData.identity?.frame;
            const frame = TDOLL_FRAMES.find((f) => f.key === frameKey);
            if (frame) {
                formData["system.identity.manufacturer"] = frame.manufacturer;
                formData["system.identity.model"] = frame.model;
            }
        }

        formData["system.focus"] = currentData.focus;
        formData["system.vigilance"] = currentData.vigilance;
        formData["system.endurance"] = currentData.endurance;
        formData["system.composure"] = currentData.composure;
        formData["system.fatigue.max"] = currentData.fatigue.max;
        formData["system.strife.max"] = currentData.strife.max;
        formData["system.fortune_points.max"] = currentData.fortune_points.max;

        // Detect manual skill rank changes and flow XP to matching disciplines
        const currentSkills = currentData.skills || {};
        for (const key of Object.keys(formData)) {
            const match = key.match(/^system\.skills\.(.+)$/);
            if (!match) continue;
            const skillId = match[1];
            const oldRank = parseInt(currentSkills[skillId]) || 0;
            const newRank = parseInt(formData[key]) || 0;
            if (oldRank === newRank) continue;

            const xpDelta =
                CharacterSheetGfl5r.cumulativeSkillXp(newRank) -
                CharacterSheetGfl5r.cumulativeSkillXp(oldRank);
            const slotKeys = this._findDisciplineSlotsForSkill(skillId);
            for (const slotKey of slotKeys) {
                const slot = this.actor.system.disciplines[slotKey];
                const existing = parseFloat(formData[`system.disciplines.${slotKey}.xpSpent`])
                    ?? (slot.xpSpent || 0);
                const newXp = Math.max(0, existing + xpDelta);
                const { currentRank, ranksCompleted } = CharacterSheetGfl5r.computeRankProgress(newXp);
                formData[`system.disciplines.${slotKey}.xpSpent`] = newXp;
                formData[`system.disciplines.${slotKey}.currentRank`] = currentRank;
                formData[`system.disciplines.${slotKey}.ranksCompleted`] = ranksCompleted;
            }
        }

        return super._updateObject(event, formData);
    }

    /**
     * Add or Subtract XP
     * @param {Event} event
     * @private
     */
    async _modifyXP(event) {
        event.preventDefault();
        event.stopPropagation();

        const elmt = $(event.currentTarget);
        let mod = elmt.data("value");
        if (!mod) {
            return;
        }

        const new_xp_total = Math.max(0, this.actor.system.xp_total + mod);
        this.actor.update({
            system: {
                xp_total: new_xp_total,
            },
        });

        if (this.actor.system.xp_spent > new_xp_total) {
            ui.notifications.warn("gfl5r.advancements.warning.total_less_then_spent", { localize: true });
        }

        this.render(false);
    }

    /**
     * Add or Subtract Heat
     * @param {Event} event
     * @private
     */
    async _modifyHeat(event) {
        event.preventDefault();
        event.stopPropagation();

        const elmt = $(event.currentTarget);
        let mod = elmt.data("value");
        if (!mod) {
            return;
        }

        await this.actor.update({
            system: {
                heat: Math.max(0, this.actor.system.heat + mod),
            },
        });
    }

    /**
     * Increase or decrease an approach rank, spending or refunding XP.
     * Cost per rank: newRank × approachCostMultiplier (3).
     * Constraint: the highest approach value must not exceed the sum of the two lowest.
     * @param {Event} event
     * @private
     */
    async _modifyApproachRank(event) {
        event.preventDefault();
        event.stopPropagation();

        const elmt = $(event.currentTarget);
        const approachId = elmt.data("approach");
        const mod = parseInt(elmt.data("mod"));
        if (!approachId || !mod) return;

        const currentRank = parseInt(this.actor.system.approaches?.[approachId]) || 1;
        const newRank = currentRank + mod;

        if (newRank < 1 || newRank > 9) return;

        // XP check when incrementing
        if (mod > 0) {
            const cost = newRank * CONFIG.gfl5r.xp.approachCostMultiplier;
            const xpAvailable = (this.actor.system.xp_total || 0) - (this.actor.system.xp_spent || 0);
            if (xpAvailable < cost) {
                ui.notifications.warn(game.i18n.localize("gfl5r.advancements.warning.total_less_then_spent"));
                return;
            }
        }

        // Validation: highest approach must not exceed sum of the two lowest
        const allApproaches = { ...this.actor.system.approaches, [approachId]: newRank };
        const values = Object.values(allApproaches).map(v => parseInt(v) || 1).sort((a, b) => a - b);
        const highest = values[values.length - 1];
        const twoLowestSum = values[0] + values[1];
        if (highest > twoLowestSum) {
            ui.notifications.warn(game.i18n.localize("gfl5r.approaches.warning.highest_exceeds_two_lowest"));
            return;
        }

        await this.actor.update({
            [`system.approaches.${approachId}`]: newRank,
        });
    }

    /**
     * Increase or decrease a skill rank, spending or refunding XP.
     * @param {Event} event
     * @private
     */
    async _modifySkillRank(event) {
        event.preventDefault();
        event.stopPropagation();

        const elmt = $(event.currentTarget);
        const skillId = elmt.data("skill");
        const mod = parseInt(elmt.data("mod"));
        if (!skillId || !mod) return;

        const currentRank = parseInt(this.actor.system.skills?.[skillId]) || 0;
        const freeRank = parseInt(this.actor.system.skills_free?.[skillId]) || 0;
        const newRank = currentRank + mod;
        const maxRank = 9;

        if (newRank < freeRank || newRank > maxRank) return;

        if (mod > 0) {
            const cost = (currentRank + 1) * CONFIG.gfl5r.xp.skillCostMultiplier;
            const xpAvailable = (this.actor.system.xp_total || 0) - (this.actor.system.xp_spent || 0);
            if (xpAvailable < cost) {
                ui.notifications.warn(
                    game.i18n.localize("gfl5r.advancements.warning.total_less_then_spent")
                );
                return;
            }
        }

        // XP spent/refunded for this rank change
        const xpDelta = mod > 0
            ? (currentRank + 1) * CONFIG.gfl5r.xp.skillCostMultiplier
            : -(currentRank) * CONFIG.gfl5r.xp.skillCostMultiplier;

        const updateData = {
            [`system.skills.${skillId}`]: newRank,
            ...this._buildDisciplineXpUpdate(skillId, xpDelta),
        };

        await this.actor.update(updateData);
    }

    // -- Discipline card drag-drop --

    _onDisciplineDragOver(event) {
        event.preventDefault();
        $(event.currentTarget).closest(".discipline-row").addClass("drag-over");
    }

    _onDisciplineDragLeave(event) {
        $(event.currentTarget).closest(".discipline-row").removeClass("drag-over");
    }

    /**
     * Handle dropping an item onto a discipline card.
     * Techniques get added to the discipline's techniquesLearned array.
     * Discipline items get assigned to empty slots.
     */
    async _onDisciplineDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        const card = $(event.currentTarget).closest(".discipline-card");
        card.closest(".discipline-row").removeClass("drag-over");
        const slotKey = card.data("slot");
        if (!slotKey) return;

        let dropData;
        try {
            dropData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
        } catch {
            return;
        }

        const item = await game.gfl5r.HelpersGfl5r.getDragnDropTargetObject(event.originalEvent);
        if (!item) return;

        const slot = this.actor.system.disciplines?.[slotKey];
        if (!slot) return;

        if (item.type === "technique") {
            if (!slot.disciplineId) {
                ui.notifications.warn("gfl5r.disciplines.warning.assign_discipline_first", { localize: true });
                return;
            }

            const disciplineItem = this.actor.items.get(slot.disciplineId);
            if (!disciplineItem) {
                ui.notifications.warn("gfl5r.disciplines.warning.assign_discipline_first", { localize: true });
                return;
            }

            const normalizeName = (value) => String(value || "").trim().toLowerCase();
            const allowedTechniqueNames = new Set(
                (disciplineItem.system?.techniques || [])
                    .map((entry) => (typeof entry === "string" ? entry : entry?.name))
                    .filter(Boolean)
                    .map(normalizeName)
            );

            if (!allowedTechniqueNames.has(normalizeName(item.name))) {
                ui.notifications.warn(game.i18n.format("gfl5r.disciplines.warning.invalid_technique_for_discipline", {
                    technique: item.name,
                    discipline: disciplineItem.name,
                }));
                return;
            }

            const requiredRank = Math.max(1, parseInt(item.system?.rank_required) || 1);
            const computedRank = CharacterSheetGfl5r.computeRankProgress(slot.xpSpent || 0).currentRank;
            const currentDisciplineRank = Math.max(slot.currentRank || 1, computedRank);

            if (currentDisciplineRank < requiredRank) {
                ui.notifications.warn(game.i18n.format("gfl5r.disciplines.warning.rank_requirement_not_met", {
                    technique: item.name,
                    requiredRank,
                    currentRank: currentDisciplineRank,
                }));
                return;
            }

            // Add technique to this discipline slot
            const ownedItem = this.actor.items.getName(item.name)
                || (await this.actor.createEmbeddedDocuments("Item", [item.toObject(true)]))?.[0];
            const itemId = ownedItem?.id || ownedItem?._id;
            if (!itemId) return;

            const learned = [...(slot.techniquesLearned || [])];
            if (learned.includes(itemId)) {
                ui.notifications.warn(`${item.name} is already in this discipline.`);
                return;
            }
            learned.push(itemId);

            const newXp = (slot.xpSpent || 0) + CONFIG.gfl5r.xp.techniqueCost;
            const { currentRank, ranksCompleted } = CharacterSheetGfl5r.computeRankProgress(newXp);
            const updateData = {
                [`system.disciplines.${slotKey}.techniquesLearned`]: learned,
                [`system.disciplines.${slotKey}.xpSpent`]: newXp,
                [`system.disciplines.${slotKey}.currentRank`]: currentRank,
                [`system.disciplines.${slotKey}.ranksCompleted`]: ranksCompleted,
            };

            // Auto-create capstone item when rank 3 is completed
            if (ranksCompleted >= 3 && (slot.ranksCompleted || 0) < 3 && !slot.capstoneId) {
                const disciplineItem = this.actor.items.get(slot.disciplineId);
                const capstoneData = disciplineItem?.system?.capstone;
                if (capstoneData?.name) {
                    const capstoneItemData = {
                        name: capstoneData.name,
                        type: "technique",
                        img: `${CONFIG.gfl5r.paths.assets}icons/techs/capstone.svg`,
                        system: {
                            source_reference: { source: "GFL5R", page: 0 },
                            flavor: capstoneData.flavor || "",
                            description: capstoneData.description || "",
                            xp_cost: 0,
                            rank_required: 3,
                            technique_type: "capstone",
                            approach: "",
                            skill: "",
                            activation: "passive",
                        },
                    };
                    const created = await this.actor.createEmbeddedDocuments("Item", [capstoneItemData]);
                    updateData[`system.disciplines.${slotKey}.capstoneId`] = created?.[0]?.id || null;
                }
            }

            await this.actor.update(updateData);
        } else if (item.type === "discipline") {
            // Assign discipline to this slot (only if empty)
            if (slot.disciplineId) {
                ui.notifications.warn("This discipline slot is already occupied.");
                return;
            }
            // Create the discipline item on the actor if not already owned
            let ownedItem = this.actor.items.find(i => i.name === item.name && i.type === "discipline");
            if (!ownedItem) {
                const created = await this.actor.createEmbeddedDocuments("Item", [item.toObject(true)]);
                ownedItem = created?.[0];
            }
            if (!ownedItem) return;

            // Determine unlock cost: 5 XP for every discipline beyond the first
            const allSlots = this.actor.system.disciplines || {};
            const activeDisciplineCount = Object.values(allSlots)
                .filter(s => s.disciplineId).length;
            const unlockCost = activeDisciplineCount > 0
                ? CONFIG.gfl5r.xp.disciplineEntryCost
                : 0;

            // Auto-create perk item from the discipline's perk data
            let perkId = null;
            const perkData = ownedItem.system?.perk;
            if (perkData?.name) {
                const perkItemData = {
                    name: perkData.name,
                    type: "technique",
                    img: `${CONFIG.gfl5r.paths.assets}icons/techs/perk.svg`,
                    system: {
                        source_reference: { source: "GFL5R", page: 0 },
                        flavor: perkData.flavor || "",
                        description: perkData.description || "",
                        xp_cost: 0,
                        rank_required: 1,
                        technique_type: "perk",
                        approach: "",
                        skill: "",
                        activation: "passive",
                    },
                };
                const created = await this.actor.createEmbeddedDocuments("Item", [perkItemData]);
                perkId = created?.[0]?.id || null;
            }

            await this.actor.update({
                [`system.disciplines.${slotKey}.disciplineId`]: ownedItem.id,
                [`system.disciplines.${slotKey}.perkId`]: perkId,
                [`system.disciplines.${slotKey}.capstoneId`]: null,
                [`system.disciplines.${slotKey}.unlockCost`]: unlockCost,
                [`system.disciplines.${slotKey}.xpSpent`]: 0,
                [`system.disciplines.${slotKey}.currentRank`]: 1,
                [`system.disciplines.${slotKey}.ranksCompleted`]: 0,
                [`system.disciplines.${slotKey}.techniquesLearned`]: [],
            });
        }
    }

    /**
     * Remove a technique from a discipline's techniquesLearned list
     */
    async _removeTechniqueFromDiscipline(event) {
        event.preventDefault();
        event.stopPropagation();

        const el = $(event.currentTarget);
        const slotKey = el.closest(".discipline-card").data("slot");
        const techId = el.data("tech-id");
        if (!slotKey || !techId) return;

        const slot = this.actor.system.disciplines?.[slotKey];
        if (!slot) return;

        const learned = (slot.techniquesLearned || []).filter(id => id !== techId);

        const newXp = Math.max(0, (slot.xpSpent || 0) - CONFIG.gfl5r.xp.techniqueCost);
        const { currentRank, ranksCompleted } = CharacterSheetGfl5r.computeRankProgress(newXp);
        const updateData = {
            [`system.disciplines.${slotKey}.techniquesLearned`]: learned,
            [`system.disciplines.${slotKey}.xpSpent`]: newXp,
            [`system.disciplines.${slotKey}.currentRank`]: currentRank,
            [`system.disciplines.${slotKey}.ranksCompleted`]: ranksCompleted,
        };

        // Auto-delete capstone item if no longer rank 3
        if (ranksCompleted < 3 && slot.capstoneId) {
            const capstoneStillExists = this.actor.items.has(slot.capstoneId);
            if (capstoneStillExists) {
                await this.actor.deleteEmbeddedDocuments("Item", [slot.capstoneId]);
            }
            updateData[`system.disciplines.${slotKey}.capstoneId`] = null;
        }

        await this.actor.update(updateData);

        // Delete the technique item from the actor if no other discipline references it
        const allSlots = this.actor.system.disciplines || {};
        const stillReferenced = Object.entries(allSlots).some(
            ([key, s]) => key !== slotKey && (s.techniquesLearned || []).includes(techId)
        );
        if (!stillReferenced) {
            await this.actor.deleteEmbeddedDocuments("Item", [techId]);
        }
    }

    /**
     * Remove a discipline from a slot, clearing it and deleting the item + orphaned techniques.
     */
    async _removeDisciplineFromSlot(event) {
        event.preventDefault();
        event.stopPropagation();

        const slotKey = $(event.currentTarget).data("slot");
        if (!slotKey) return;

        const slot = this.actor.system.disciplines?.[slotKey];
        if (!slot || !slot.disciplineId) return;

        // Confirm with the user
        const disciplineItem = this.actor.items.get(slot.disciplineId);
        const confirmed = await Dialog.confirm({
            title: game.i18n.localize("gfl5r.disciplines.remove_discipline"),
            content: `<p>${game.i18n.format("gfl5r.disciplines.remove_discipline_confirm", { name: disciplineItem?.name || "?" })}</p>`,
        });
        if (!confirmed) return;

        // Collect items to delete: the discipline item + perk + capstone + techniques only used in this slot
        const itemsToDelete = [];
        if (slot.disciplineId) itemsToDelete.push(slot.disciplineId);
        if (slot.perkId) itemsToDelete.push(slot.perkId);
        if (slot.capstoneId) itemsToDelete.push(slot.capstoneId);

        const allSlots = this.actor.system.disciplines || {};
        for (const techId of (slot.techniquesLearned || [])) {
            const stillReferenced = Object.entries(allSlots).some(
                ([key, s]) => key !== slotKey && (s.techniquesLearned || []).includes(techId)
            );
            if (!stillReferenced) itemsToDelete.push(techId);
        }

        // Clear the slot
        await this.actor.update({
            [`system.disciplines.${slotKey}.disciplineId`]: null,
            [`system.disciplines.${slotKey}.perkId`]: null,
            [`system.disciplines.${slotKey}.capstoneId`]: null,
            [`system.disciplines.${slotKey}.unlockCost`]: 0,
            [`system.disciplines.${slotKey}.xpSpent`]: 0,
            [`system.disciplines.${slotKey}.currentRank`]: 1,
            [`system.disciplines.${slotKey}.ranksCompleted`]: 0,
            [`system.disciplines.${slotKey}.techniquesLearned`]: [],
        });

        // Delete orphaned items
        const validIds = itemsToDelete.filter(id => this.actor.items.has(id));
        if (validIds.length) {
            await this.actor.deleteEmbeddedDocuments("Item", validIds);
        }
    }
}
