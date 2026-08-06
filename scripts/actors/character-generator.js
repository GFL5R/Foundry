/**
 * GFL5R Character Builder
 * Ported from old-gfl5r-foundry's CharacterBuilderApp, adapted for the new data model.
 * 4-step wizard: Identity -> Training -> Traits -> Motivation
 */

import { HUMAN_NATIONALITIES, HUMAN_BACKGROUNDS, TDOLL_FRAMES } from "./character-builder-data.js";
import { NATIONALITY_ITEMS, BACKGROUND_GEAR, DISCIPLINE_WEAPON_GRANTS } from "./starting-equipment.js";

export class CharacterGenerator {
    static STEPS = [
        { num: 0, humanLabel: "Nationality", tdollLabel: "Frame" },
        { num: 1, humanLabel: "Background", tdollLabel: "Weapon Discipline" },
        { num: 2, humanLabel: "Discipline & Traits", tdollLabel: "Upgrades & Traits" },
        { num: 3, humanLabel: "Motivation", tdollLabel: "Motivation" },
    ];

    /**
     * @param {Actor} actor
     */
    constructor(actor) {
        this.actor = actor;
    }

    /**
     * Apply human character creation to the actor
     */
    async applyHumanBuild({
        isTranshuman = false,
        nationalityKey, backgroundKey, disciplineUuid, startingTechniqueUuid = "",
        advantageUuid, disadvantageUuid, passionUuid, anxietyUuid,
        viewOfDolls = "favor", viewDollsSkill = "",
        goal = "", nameMeaning = "", storyEnd = "", name = "",
        q4BonusSkill = "none", q5BonusApproach = "none",
        step1Narrative = "", step2Narrative = "", step3Narrative = "",
        step4Narrative = "", step5Narrative = "", step6Narrative = "",
        step7Narrative = "", step8Narrative = "", step9Narrative = "",
        step10Narrative = "",
    }) {
        const nationality = HUMAN_NATIONALITIES.find(n => n.key === nationalityKey);
        const background = HUMAN_BACKGROUNDS.find(b => b.key === backgroundKey);

        if (!nationality || !background) {
            ui.notifications?.warn("Select both a nationality and background.");
            return;
        }

        const isStartingTechniqueValid = await this._validateStartingTechniqueSelection({
            disciplineUuid,
            startingTechniqueUuid,
            currentRank: 1,
        });
        if (!isStartingTechniqueValid) return;

        // Clear existing items
        const allItemIds = this.actor.items.map(i => i.id);
        if (allItemIds.length) await this.actor.deleteEmbeddedDocuments("Item", allItemIds);

        // Build approaches: all start at 1, nationality adds +1 to two, background adds +1 to one
        const approaches = { power: 1, precision: 1, swiftness: 1, resilience: 1, fortune: 1 };
        nationality.approaches.forEach(key => { approaches[key] = (approaches[key] || 1) + 1; });
        approaches[background.approach] = (approaches[background.approach] || 1) + 1;

        // Q5 bonus approach
        if (q5BonusApproach && q5BonusApproach !== "none") {
            approaches[q5BonusApproach] = (approaches[q5BonusApproach] || 1) + 1;
        }

        // Build skills
        const skills = {};
        const ensureSkill = (key, min) => { if (key) skills[key] = Math.max(skills[key] || 0, min); };
        ensureSkill(background.skill, 1);

        // Q4 bonus skill
        if (q4BonusSkill && q4BonusSkill !== "none") {
            ensureSkill(q4BonusSkill, 1);
        }

        // View of Dolls bonus
        let humanityBonus = 0;
        if (viewOfDolls === "favor") {
            humanityBonus = 5;
        } else if (viewOfDolls === "tools" && viewDollsSkill && viewDollsSkill !== "none") {
            ensureSkill(viewDollsSkill, 1);
        }

        // Apply discipline (creates item, gets associated skills)
        const disciplineResult = await this._applyDiscipline(disciplineUuid);
        if (disciplineResult.associatedSkills) {
            disciplineResult.associatedSkills.forEach(sk => {
                skills[sk] = (skills[sk] || 0) + 1;
            });
        }

        await this._applyStartingTechnique({
            disciplineSlotKey: "slot1",
            disciplineItem: disciplineResult.disciplineItem,
            startingTechniqueUuid,
            currentRank: 1,
        });

        // Create narrative items
        await this._createNarrativeItem(advantageUuid, "advantage");
        await this._createNarrativeItem(disadvantageUuid, "disadvantage");
        await this._createNarrativeItem(passionUuid, "passion");
        await this._createNarrativeItem(anxietyUuid, "anxiety");

        // Grant starting equipment
        await this._grantNationalityGear(nationalityKey);
        await this._grantBackgroundGear(backgroundKey);
        await this._grantDisciplineWeapon(disciplineResult?.label || "");

        // Update actor
        const updates = {
            "system.identity.is_transhuman": false,
            "system.identity.nationality": nationalityKey,
            "system.identity.background": backgroundKey,
            "system.social.humanity": 50 + humanityBonus,
            "system.social.fame": 40,
            "system.social.status": 30,
            "system.social.view_of_dolls": viewOfDolls,
        };
        for (const [k, v] of Object.entries(approaches)) {
            updates[`system.approaches.${k}`] = v;
        }
        // Reset all skill_free baselines, then set the granted ones
        for (const k of Object.keys(this.actor.system.skills_free || {})) {
            updates[`system.skills_free.${k}`] = 0;
        }
        for (const [k, v] of Object.entries(skills)) {
            updates[`system.skills.${k}`] = v;
            updates[`system.skills_free.${k}`] = v;
        }

        if (name) updates["name"] = name;
        if (goal) updates["system.narrative.personal_goal"] = goal;
        if (nameMeaning) updates["system.narrative.name_meaning"] = nameMeaning;
        if (storyEnd) updates["system.narrative.story_end"] = storyEnd;

        // Q4/Q5 stored for reference
        updates["system.twelve_questions.q4BonusSkill"] = q4BonusSkill;
        updates["system.twelve_questions.q5BonusApproach"] = q5BonusApproach;

        await this.actor.update(updates);
        ui.notifications?.info("Human character creation applied.");
    }

    /**
     * Apply transhuman character creation to the actor.
     * Transhumans use nationality + background like humans,
     * but also get T-Doll modules like T-Dolls.
     */
    async applyTranshumanBuild({
        nationalityKey, backgroundKey, disciplineUuid, startingTechniqueUuid = "",
        advantageUuid, disadvantageUuid, passionUuid, anxietyUuid,
        viewOfDolls = "favor", viewDollsSkill = "",
        goal = "", nameMeaning = "", storyEnd = "", name = "",
        q4BonusSkill = "none", q5BonusApproach = "none",
        step1Narrative = "", step2Narrative = "", step3Narrative = "",
        step4Narrative = "", step5Narrative = "", step6Narrative = "",
        step7Narrative = "", step8Narrative = "", step9Narrative = "",
        step10Narrative = "",
    }) {
        const nationality = HUMAN_NATIONALITIES.find(n => n.key === nationalityKey);
        const background = HUMAN_BACKGROUNDS.find(b => b.key === backgroundKey);

        if (!nationality || !background) {
            ui.notifications?.warn("Select both a nationality and background.");
            return;
        }

        const isStartingTechniqueValid = await this._validateStartingTechniqueSelection({
            disciplineUuid,
            startingTechniqueUuid,
            currentRank: 1,
        });
        if (!isStartingTechniqueValid) return;

        // Clear existing items
        const allItemIds = this.actor.items.map(i => i.id);
        if (allItemIds.length) await this.actor.deleteEmbeddedDocuments("Item", allItemIds);

        // Build approaches: all start at 1, nationality adds +1 to two, background adds +1 to one
        const approaches = { power: 1, precision: 1, swiftness: 1, resilience: 1, fortune: 1 };
        nationality.approaches.forEach(key => { approaches[key] = (approaches[key] || 1) + 1; });
        approaches[background.approach] = (approaches[background.approach] || 1) + 1;

        // Q5 bonus approach
        if (q5BonusApproach && q5BonusApproach !== "none") {
            approaches[q5BonusApproach] = (approaches[q5BonusApproach] || 1) + 1;
        }

        // Build skills
        const skills = {};
        const ensureSkill = (key, min) => { if (key) skills[key] = Math.max(skills[key] || 0, min); };
        ensureSkill(background.skill, 1);

        // Q4 bonus skill
        if (q4BonusSkill && q4BonusSkill !== "none") {
            ensureSkill(q4BonusSkill, 1);
        }

        // Apply discipline
        const disciplineResult = await this._applyDiscipline(disciplineUuid);
        if (disciplineResult.associatedSkills) {
            disciplineResult.associatedSkills.forEach(sk => {
                skills[sk] = (skills[sk] || 0) + 1;
            });
        }

        await this._applyStartingTechnique({
            disciplineSlotKey: "slot1",
            disciplineItem: disciplineResult.disciplineItem,
            startingTechniqueUuid,
            currentRank: 1,
        });

        // Create narrative items
        await this._createNarrativeItem(advantageUuid, "advantage");
        await this._createNarrativeItem(disadvantageUuid, "disadvantage");
        await this._createNarrativeItem(passionUuid, "passion");
        await this._createNarrativeItem(anxietyUuid, "anxiety");

        // Grant starting equipment
        await this._grantNationalityGear(nationalityKey);
        await this._grantBackgroundGear(backgroundKey);
        await this._grantDisciplineWeapon(disciplineResult?.label || "");

        // Update actor
        const updates = {
            "system.identity.is_transhuman": true,
            "system.identity.nationality": nationalityKey,
            "system.identity.background": backgroundKey,
            "system.social.humanity": 50 + humanityBonus,
            "system.social.fame": 40,
            "system.social.status": 30,
            "system.social.view_of_dolls": viewOfDolls,
        };
        for (const [k, v] of Object.entries(approaches)) {
            updates[`system.approaches.${k}`] = v;
        }
        // Reset all skill_free baselines, then set the granted ones
        for (const k of Object.keys(this.actor.system.skills_free || {})) {
            updates[`system.skills_free.${k}`] = 0;
        }
        for (const [k, v] of Object.entries(skills)) {
            updates[`system.skills.${k}`] = v;
            updates[`system.skills_free.${k}`] = v;
        }

        if (name) updates["name"] = name;
        if (goal) updates["system.narrative.personal_goal"] = goal;
        if (nameMeaning) updates["system.narrative.name_meaning"] = nameMeaning;
        if (storyEnd) updates["system.narrative.story_end"] = storyEnd;

        // Q4/Q5 stored for reference
        updates["system.twelve_questions.q4BonusSkill"] = q4BonusSkill;
        updates["system.twelve_questions.q5BonusApproach"] = q5BonusApproach;

        await this.actor.update(updates);
        ui.notifications?.info("Transhuman character creation applied.");
    }

    /**
     * Apply T-Doll character creation to the actor
     */
    async applyDollBuild({
        frameKey, disciplineUuid, techniqueUuids = [], moduleUuids = [],
        advantageUuid, disadvantageUuid, passionUuid, anxietyUuid,
        nameOrigin = "human",
        goal = "", storyEnd = "", name = "", metCommander = "",
        skillPurchases = {},
        q4BonusSkill = "none", q5BonusApproach = "none",
        step1Narrative = "", step2Narrative = "", step3Narrative = "",
        step4Narrative = "", step5Narrative = "", step6Narrative = "",
        step7Narrative = "", step8Narrative = "", step9Narrative = "",
        step10Narrative = "",
    }) {
        const frame = TDOLL_FRAMES.find(f => f.key === frameKey);

        if (!frame) {
            ui.notifications?.warn("Select a frame.");
            return;
        }

        // Clear existing items
        const allItemIds = this.actor.items.map(i => i.id);
        if (allItemIds.length) await this.actor.deleteEmbeddedDocuments("Item", allItemIds);

        // Approaches come directly from frame
        const approaches = { ...frame.approaches };

        // Q5 bonus approach
        if (q5BonusApproach && q5BonusApproach !== "none") {
            approaches[q5BonusApproach] = (approaches[q5BonusApproach] || 0) + 1;
        }

        // Frame starting skills
        const skills = {};
        frame.skills.forEach(sk => { skills[sk] = Math.max(skills[sk] || 0, 1); });

        // Q4 bonus skill
        if (q4BonusSkill && q4BonusSkill !== "none") {
            skills[q4BonusSkill] = Math.max(skills[q4BonusSkill] || 0, 1);
        }

        // Apply discipline (T-Dolls start at Rank 2)
        const disciplineResult = await this._applyDiscipline(disciplineUuid);
        if (disciplineResult.associatedSkills) {
            disciplineResult.associatedSkills.forEach(sk => {
                skills[sk] = (skills[sk] || 0) + 1;
            });
        }

        // Apply skill purchases from Q3 XP spending (+1 per purchase, stacking on top of discipline +1)
        if (skillPurchases) {
            for (const [skillId, purchased] of Object.entries(skillPurchases)) {
                skills[skillId] = (skills[skillId] || 0) + purchased;
            }
        }

        // Apply techniques from Q3 drop zone
        if (techniqueUuids && techniqueUuids.length > 0) {
            const slot = this.actor.system.disciplines?.slot1 || {};
            const disciplineItem = disciplineResult.disciplineItem
                || (slot.disciplineId ? this.actor.items.get(slot.disciplineId) : null);
            for (const uuid of techniqueUuids) {
                await this._applyStartingTechnique({
                    disciplineSlotKey: "slot1",
                    disciplineItem,
                    startingTechniqueUuid: uuid,
                    currentRank: 1,
                });
            }
        }

        // Apply modules from Q3 (step2.modules): create module items and
        // apply their approach/skill rank bonuses to the doll's stats.
        if (moduleUuids && moduleUuids.length > 0) {
            const { approachBonuses, skillBonuses } = await this._applyModules(moduleUuids);
            for (const approachId of approachBonuses) {
                approaches[approachId] = (approaches[approachId] || 0) + 1;
            }
            for (const skillId of skillBonuses) {
                skills[skillId] = (skills[skillId] || 0) + 1;
            }
        }

        // Name origin bonuses
        let humanityBonus = 0;
        let fameBonus = 0;
        switch (nameOrigin) {
            case "human": humanityBonus = 5; break;
            case "callsign": fameBonus = 5; break;
            case "weapon":
                skills["firearms"] = (skills["firearms"] || 0) + 1;
                humanityBonus = -5;
                break;
            case "weird": fameBonus = -5; break;
        }

        // Create narrative items
        await this._createNarrativeItem(advantageUuid, "advantage");
        await this._createNarrativeItem(disadvantageUuid, "disadvantage");
        await this._createNarrativeItem(passionUuid, "passion");
        await this._createNarrativeItem(anxietyUuid, "anxiety");

        // Grant starting equipment (T-Dolls get discipline weapon only)
        await this._grantDisciplineWeapon(disciplineResult?.label || "");

        // Update actor
        const updates = {
            "system.identity.is_transhuman": false,
            "system.identity.frame": frameKey,
            "system.identity.manufacturer": frame.manufacturer,
            "system.identity.model": frame.model,
            "system.identity.name_origin": nameOrigin,
            "system.social.humanity": 40 + humanityBonus,
            "system.social.fame": 40 + fameBonus,
            "system.social.status": 30,
            "system.ew.ew_rating": 1,
            "system.ew.security_rating": 2,
        };
        for (const [k, v] of Object.entries(approaches)) {
            updates[`system.approaches.${k}`] = v;
        }
        // Reset all skill_free baselines, then set the granted ones
        for (const k of Object.keys(this.actor.system.skills_free || {})) {
            updates[`system.skills_free.${k}`] = 0;
        }
        for (const [k, v] of Object.entries(skills)) {
            updates[`system.skills.${k}`] = v;
            updates[`system.skills_free.${k}`] = v;
        }
        if (name) updates["name"] = name;
        if (goal) updates["system.narrative.personal_goal"] = goal;
        if (storyEnd) updates["system.narrative.story_end"] = storyEnd;
        if (metCommander) updates["system.narrative.met_commander"] = metCommander;

        // Q4/Q5 stored for reference
        updates["system.twelve_questions.q4BonusSkill"] = q4BonusSkill;
        updates["system.twelve_questions.q5BonusApproach"] = q5BonusApproach;

        await this.actor.update(updates);
        ui.notifications?.info("T-Doll character creation applied.");
    }

    /**
     * Apply a discipline from UUID, creating the item on the actor
     * @returns {{ label: string, associatedSkills: string[] }}
     */
    async _applyDiscipline(uuid) {
        if (!uuid) return { label: "", associatedSkills: [], disciplineItem: null };

        try {
            const source = await fromUuid(uuid);
            if (!source || source.type !== "discipline") return { label: "", associatedSkills: [], disciplineItem: null };

            const itemData = source.toObject();
            const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
            const associatedSkills = Array.isArray(source.system?.associated_skills)
                ? source.system.associated_skills.map(sk =>
                    sk.toLowerCase().replace(/[\s\-]+/g, "_")
                )
                : [];

            // Auto-create perk item from the discipline's perk data
            let perkId = null;
            const perkData = created?.system?.perk;
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
                const [perkCreated] = await this.actor.createEmbeddedDocuments("Item", [perkItemData]);
                perkId = perkCreated?.id || null;
            }

            // Set discipline in slot1
            await this.actor.update({
                "system.disciplines.slot1.disciplineId": created?.id || null,
                "system.disciplines.slot1.perkId": perkId,
                "system.disciplines.slot1.capstoneId": null,
                "system.disciplines.slot1.unlockCost": 0,
                "system.disciplines.slot1.xpSpent": 0,
                "system.disciplines.slot1.currentRank": 1,
                "system.disciplines.slot1.ranksCompleted": 0,
                "system.disciplines.slot1.techniquesLearned": [],
            });

            return { label: created?.name || source.name, associatedSkills, disciplineItem: created || null };
        } catch (err) {
            console.warn("GFL5R | Failed to apply discipline", uuid, err);
            return { label: "", associatedSkills: [], disciplineItem: null };
        }
    }

    /**
     * Validate a starting technique against a selected discipline before applying character creation.
     */
    async _validateStartingTechniqueSelection({ disciplineUuid, startingTechniqueUuid, currentRank = 1 }) {
        if (!startingTechniqueUuid) return true;

        if (!disciplineUuid) {
            ui.notifications?.warn("gfl5r.disciplines.warning.assign_discipline_first", { localize: true });
            return false;
        }

        try {
            const disciplineItem = await fromUuid(disciplineUuid);
            if (!disciplineItem || disciplineItem.type !== "discipline") {
                ui.notifications?.warn("gfl5r.disciplines.warning.assign_discipline_first", { localize: true });
                return false;
            }

            const techniqueItem = await fromUuid(startingTechniqueUuid);
            if (!techniqueItem || techniqueItem.type !== "technique") {
                ui.notifications?.warn("Starting technique must be a technique item.");
                return false;
            }

            return this._validateTechniqueForDiscipline({
                techniqueItem,
                disciplineItem,
                currentRank,
            });
        } catch (err) {
            console.warn("GFL5R | Failed to validate starting technique", startingTechniqueUuid, err);
            return false;
        }
    }

    /**
     * Add a single starting technique to a discipline without charging XP.
     */
    async _applyStartingTechnique({
        disciplineSlotKey = "slot1",
        disciplineItem = null,
        startingTechniqueUuid = "",
        currentRank = 1,
    }) {
        if (!startingTechniqueUuid) return;

        try {
            const slot = this.actor.system.disciplines?.[disciplineSlotKey] || {};
            const resolvedDiscipline = disciplineItem
                || (slot.disciplineId ? this.actor.items.get(slot.disciplineId) : null);

            if (!resolvedDiscipline) {
                ui.notifications?.warn("gfl5r.disciplines.warning.assign_discipline_first", { localize: true });
                return;
            }

            const techniqueItem = await fromUuid(startingTechniqueUuid);
            if (!techniqueItem || techniqueItem.type !== "technique") return;

            const slotRank = Math.max(slot.currentRank || 1, currentRank);
            if (!this._validateTechniqueForDiscipline({
                techniqueItem,
                disciplineItem: resolvedDiscipline,
                currentRank: slotRank,
            })) {
                return;
            }

            let ownedTechnique = this.actor.items.find(i => i.type === "technique" && i.name === techniqueItem.name);
            if (!ownedTechnique) {
                const itemData = techniqueItem.toObject(true);
                itemData.system = itemData.system || {};
                itemData.system.xp_cost = 0;
                const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
                ownedTechnique = created || null;
            }

            const techniqueId = ownedTechnique?.id || ownedTechnique?._id;
            if (!techniqueId) return;

            const learned = [...(slot.techniquesLearned || [])];
            if (learned.includes(techniqueId)) return;

            learned.push(techniqueId);
            await this.actor.update({
                [`system.disciplines.${disciplineSlotKey}.techniquesLearned`]: learned,
            });
        } catch (err) {
            console.warn("GFL5R | Failed to apply starting technique", startingTechniqueUuid, err);
        }
    }

    /**
     * Create module items on the actor from their UUIDs and return the stat
     * bonuses they confer.
     *
     * Each module contributes either an approach bonus (+1) or a skill bonus
     * (+1), stored as `system.approach` / `system.skill` on the compiled item
     * (normalized ids, e.g. "power" / "hand_to_hand").
     *
     * @param {string[]} moduleUuids - UUIDs of the selected modules.
     * @returns {Promise<{approachBonuses: string[], skillBonuses: string[]}>}
     */
    async _applyModules(moduleUuids) {
        const approachBonuses = [];
        const skillBonuses = [];

        for (const uuid of moduleUuids) {
            if (!uuid) continue;

            try {
                const moduleItem = await fromUuid(uuid);
                if (!moduleItem || moduleItem.type !== "module") {
                    console.warn("GFL5R | Module UUID did not resolve to a module item", uuid);
                    continue;
                }

                // Create the module item on the actor.
                const itemData = moduleItem.toObject();
                await this.actor.createEmbeddedDocuments("Item", [itemData]);

                const approachId = moduleItem.system?.approach;
                const skillId = moduleItem.system?.skill;
                if (approachId) approachBonuses.push(String(approachId).toLowerCase());
                if (skillId) skillBonuses.push(String(skillId).toLowerCase().replace(/[\s\-]+/g, "_"));
            } catch (err) {
                console.warn("GFL5R | Failed to apply module", uuid, err);
            }
        }

        return { approachBonuses, skillBonuses };
    }

    /**
     * Validate that a technique belongs to the selected discipline and meets rank requirements.
     */
    _validateTechniqueForDiscipline({ techniqueItem, disciplineItem, currentRank = 1 }) {
        const normalizeName = (value) => String(value || "").trim().toLowerCase();
        const allowedTechniqueNames = new Set(
            (disciplineItem.system?.techniques || [])
                .map((entry) => (typeof entry === "string" ? entry : entry?.name))
                .filter(Boolean)
                .map(normalizeName)
        );

        if (!allowedTechniqueNames.has(normalizeName(techniqueItem.name))) {
            ui.notifications?.warn(game.i18n.format("gfl5r.disciplines.warning.invalid_technique_for_discipline", {
                technique: techniqueItem.name,
                discipline: disciplineItem.name,
            }));
            return false;
        }

        const requiredRank = Math.max(1, parseInt(techniqueItem.system?.rank_required) || 1);
        if (currentRank < requiredRank) {
            ui.notifications?.warn(game.i18n.format("gfl5r.disciplines.warning.rank_requirement_not_met", {
                technique: techniqueItem.name,
                requiredRank,
                currentRank,
            }));
            return false;
        }

        return true;
    }

    /**
     * Grant starting nationality gear by searching compendiums for matching item names.
     * Falls back to creating basic item data if compendium items aren't found.
     */
    async _grantNationalityGear(nationalityKey) {
        const itemNames = NATIONALITY_ITEMS[nationalityKey];
        if (!itemNames?.length) return;
        await this._grantItemsByName(itemNames, "item");
    }

    /**
     * Grant starting background gear + optional armor.
     */
    async _grantBackgroundGear(backgroundKey) {
        const gear = BACKGROUND_GEAR[backgroundKey];
        if (!gear) return;
        if (gear.items?.length) await this._grantItemsByName(gear.items, "item");
        if (gear.armor) await this._grantItemsByName([gear.armor], "armor");
    }

    /**
     * Grant a weapon matching the discipline's grant (category + maxPrice).
     * Searches the gfl5r-weapons compendium for the best fit.
     */
    async _grantDisciplineWeapon(disciplineTitle) {
        const grant = DISCIPLINE_WEAPON_GRANTS[disciplineTitle];
        if (!grant) return;

        try {
            const pack = game.packs.get("gfl5r.gfl5r-weapons");
            if (!pack) return;

            const index = await pack.getIndex({ fields: ["name", "system.category", "system.price"] });
            const candidates = index
                .filter(entry => entry.system?.category === grant.category && (entry.system?.price || 0) <= grant.maxPrice)
                .sort((a, b) => (b.system?.price || 0) - (a.system?.price || 0));

            if (candidates.length) {
                const doc = await pack.getDocument(candidates[0]._id);
                if (doc) {
                    const itemData = doc.toObject();
                    await this.actor.createEmbeddedDocuments("Item", [itemData]);
                }
            }
        } catch (err) {
            console.warn("GFL5R | Failed to grant discipline weapon", disciplineTitle, err);
        }
    }

    /**
     * Grant items by name: search compendiums for matching names,
     * fall back to creating placeholder item data.
     */
    async _grantItemsByName(itemNames, itemType) {
        const packMap = {
            item: "gfl5r.gfl5r-items",
            armor: "gfl5r.gfl5r-armor",
            weapon: "gfl5r.gfl5r-weapons",
        };
        const packId = packMap[itemType] || "gfl5r.gfl5r-items";

        for (const name of itemNames) {
            try {
                const pack = game.packs.get(packId);
                if (!pack) {
                    await this._createFallbackItem(name, itemType);
                    continue;
                }

                const index = await pack.getIndex({ fields: ["name"] });
                const entry = index.find(e => e.name === name);

                if (entry) {
                    const doc = await pack.getDocument(entry._id);
                    if (doc) {
                        const itemData = doc.toObject();
                        await this.actor.createEmbeddedDocuments("Item", [itemData]);
                        continue;
                    }
                }

                // Fallback: create a basic placeholder item
                await this._createFallbackItem(name, itemType);
            } catch (err) {
                console.warn("GFL5R | Failed to grant item", name, err);
                await this._createFallbackItem(name, itemType);
            }
        }
    }

    /**
     * Create a basic placeholder item on the actor when compendium lookup fails.
     */
    async _createFallbackItem(name, itemType) {
        try {
            const foundryType = itemType === "weapon" ? "weaponry" : itemType;
            const itemData = {
                name,
                type: foundryType,
                img: "icons/svg/item-bag.svg",
                system: {
                    source_reference: { source: "GFL5R", page: 0 },
                    flavor: `Starting gear (${itemType}). Full stats not found in compendium.`,
                    description: "",
                },
            };

            if (foundryType === "item") {
                itemData.system.quantity = 1;
                itemData.system.price = 0;
                itemData.system.rarity = "common";
            } else if (foundryType === "armor") {
                itemData.system.weight = 0;
                itemData.system.protection = 0;
                itemData.system.price = 0;
                itemData.system.equipped = true;
            } else if (foundryType === "weaponry") {
                itemData.system.category = "HG";
                itemData.system.skill = "firearms";
                itemData.system.ideal_range = 2;
                itemData.system.damage = 0;
                itemData.system.deadliness = 0;
                itemData.system.grip = "1-Handed";
                itemData.system.price = 0;
                itemData.system.equipped = true;
            }

            await this.actor.createEmbeddedDocuments("Item", [itemData]);
        } catch (err) {
            console.warn("GFL5R | Failed to create fallback item", name, err);
        }
    }

    /**
     * Create a narrative item from UUID
     */
    async _createNarrativeItem(uuid, narrativeType) {
        if (!uuid) return "";

        try {
            const source = await fromUuid(uuid);
            if (!source) return "";

            const itemData = source.toObject();
            itemData.type = "narrative";
            itemData.system = itemData.system || {};
            itemData.system.narrative_type = narrativeType;

            const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
            return created?.name || "";
        } catch (err) {
            console.warn("GFL5R | Failed to create narrative item", uuid, err);
            return "";
        }
    }
}
