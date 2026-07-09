/**
 * GFL5R Twelve Questions data model.
 * Stores all 12 question answers for both Human (Commander) and T-Doll character types.
 * Modeled after L5R5E's TwentyQuestions but adapted for the GFL5R 12-question flow.
 */

import { HUMAN_NATIONALITIES, HUMAN_BACKGROUNDS, TDOLL_FRAMES } from "./character-builder-data.js";

export class TwelveQuestions {

    /**
     * Lists of form field paths that hold approach selections (for validation/summary).
     */
    static approachFields = {
        human: [
            // Nationality gives 2 approaches (handled differently — from lookup, not selects)
            // Background gives 1 approach (same — from lookup)
        ],
        tdoll: [
            // Frame gives full approach spread (from lookup, not selects)
        ],
    };

    /** No approach may exceed this value at character creation. */
    static MAX_APPROACH_AT_CREATION = 3;

    /**
     * Lists of form field paths that hold skill selections.
     */
    static skillFields = {
        human: [
            // Background skill (from lookup)
            // Discipline associated skills (from item)
            // Optional: viewOfDolls "tools" skill
            "step8.viewDollsSkill",
        ],
        tdoll: [
            // Frame skills (from lookup)
            // Discipline associated skills (from item)
        ],
    };

    /**
     * Lists of form field paths that hold drag-drop item arrays.
     */
    static itemsList = {
        human: [
            "step3.discipline",
            "step3.startingTechnique",
            "step4.advantage",
            "step5.disadvantage",
            "step6.passion",
            "step7.anxiety",
        ],
        tdoll: [
            "step2.modules",
            "step3.discipline",
            "step3.techniques",
            "step4.advantage",
            "step5.disadvantage",
            "step6.passion",
            "step7.anxiety",
        ],
        transhuman: [
            "step3.discipline",
            "step3.startingTechnique",
            "step4.advantage",
            "step5.disadvantage",
            "step6.passion",
            "step7.anxiety",
        ],
    };

    /**
     * Default data structure for all 12 steps.
     */
    data = {
        generated: false,
        characterType: "",
        moduleBudget: 60000,

        // Narrative text fields for each question
        step1Narrative: "",
        step2Narrative: "",
        step3Narrative: "",
        step4Narrative: "",
        step5Narrative: "",
        step6Narrative: "",
        step7Narrative: "",
        step8Narrative: "",
        step9Narrative: "",
        step10Narrative: "",

    // ---- Human steps ----
        // Step 1: Nationality (select)
        // Step 2: Background (select)
        // Step 3: Discipline (drag-drop)
        // Step 4: Advantage (drag-drop) + bonus skill
        // Step 5: Disadvantage (drag-drop) + bonus approach
        // Step 6: Passion (drag-drop)
        // Step 7: Anxiety (drag-drop)
        // Step 8: View of Dolls / relationship (select + optional skill)
        // Step 9: Personal Goal (text)
        // Step 10: Name Meaning or Origin (text/select)
        // Step 11: Name (text)
        // Step 12: Story End (text)

        // ---- T-Doll steps ----
        // Step 1: Frame (select)
        // Step 2: Weapon Discipline (drag-drop)
        // Step 3: Modules (drag-drop, multiple)
        // Step 4: Advantage (drag-drop)
        // Step 5: Disadvantage (drag-drop)
        // Step 6: Passion (drag-drop)
        // Step 7: Anxiety (drag-drop)
        // Step 8: Met Commander (text)
        // Step 9: Personal Goal (text)
        // Step 10: Name Origin (select)
        // Step 11: Name (text)
        // Step 12: Story End (text)

        step1: {
            // Human: nationality key; T-Doll: frame key
            selection: "",
        },
        step2: {
            // Human: background key; Doll: modules (item array, multi)
            selection: "",
            modules: [],
        },
        step3: {
            // Human: discipline + starting technique; Doll: discipline + techniques + skill XP
            discipline: [],
            startingTechnique: [],
            techniques: [],
            xpBudget: 16,
            xpSpent: 0,
            skillPurchases: {},
        },
        step4: {
            // Advantage (item array, single)
            advantage: [],
            bonusSkill: "none",
        },
        step5: {
            // Disadvantage (item array, single)
            disadvantage: [],
            bonusApproach: "none",
        },
        step6: {
            // Passion (item array, single)
            passion: [],
        },
        step7: {
            // Anxiety (item array, single)
            anxiety: [],
        },
        step8: {
            // Human: view of dolls (string) + optional skill
            // T-Doll: met commander (text)
            // Transhuman: (shared with modules via step3.modules)
            viewOfDolls: "favor",
            viewDollsSkill: "none",
            metCommander: "",
        },
        step9: {
            // Personal Goal (text)
            personalGoal: "",
        },
        step10: {
            // Human: name meaning (text)
            // T-Doll: name origin (string key)
            nameMeaning: "",
            nameOrigin: "human",
        },
        step11: {
            // Name (text)
            name: "",
        },
        step12: {
            // Story end (text)
            storyEnd: "",
        },
    };

    /**
     * @param {Actor|null} actor - Actor to populate from
     */
    constructor(actor = null) {
        if (actor?.system?.twelve_questions) {
            this.data = foundry.utils.mergeObject(this.data, actor.system.twelve_questions);
            // Override type-derived fields from the actor's actual type
            this._applyActorType(actor);
        } else if (actor) {
            this._fromActor(actor);
        }
    }

    /**
     * Set type-derived fields based on the actor's actual type.
     * @param {Actor} actor
     */
    _applyActorType(actor) {
        // Transhuman is a subtype of human; if a human has is_transhuman,
        // we still treat the twelve-questions as human flow.
        if (actor.type === "human") {
            this.data.characterType = "human";
        } else if (actor.type === "doll") {
            this.data.characterType = "doll";
            this.data.step10.nameOrigin = actor.system.identity?.name_origin || "human";
        }
    }

    /**
     * Populate data from existing actor fields (for characters built with the old generator).
     * @param {Actor} actor
     */
    _fromActor(actor) {
        const sys = actor.system;
        const identity = sys.identity || {};
        const tq = sys.twelve_questions || {};

        // Determine type from actor type
        const isHumanActor = actor.type === "human";
        const isDollActor = actor.type === "doll";
        this.data.characterType = isHumanActor ? "human" : "doll";

        // Load narrative fields
        this.data.step1Narrative = tq.step1Narrative || "";
        this.data.step2Narrative = tq.step2Narrative || "";
        this.data.step3Narrative = tq.step3Narrative || "";
        this.data.step4Narrative = tq.step4Narrative || "";
        this.data.step5Narrative = tq.step5Narrative || "";
        this.data.step6Narrative = tq.step6Narrative || "";
        this.data.step7Narrative = tq.step7Narrative || "";
        this.data.step8Narrative = tq.step8Narrative || "";
        this.data.step9Narrative = tq.step9Narrative || "";
        this.data.step10Narrative = tq.step10Narrative || "";
        this.data.step4.bonusSkill = tq.q4BonusSkill || "none";
        this.data.step5.bonusApproach = tq.q5BonusApproach || "none";

        if (isHumanActor) {
            this.data.step1.selection = identity.nationality || "";
            this.data.step2.selection = identity.background || "";
            this.data.step8.viewOfDolls = sys.social?.view_of_dolls || "favor";
        } else {
            this.data.step1.selection = identity.frame || "";
            this.data.step10.nameOrigin = identity.name_origin || "human";
        }

        this.data.step9.personalGoal = sys.narrative?.personal_goal || "";
        this.data.step10.nameMeaning = sys.narrative?.name_meaning || "";
        this.data.step11.name = actor.name || "";
        this.data.step12.storyEnd = sys.narrative?.story_end || "";
    }

    /**
     * Update data from form submission.
     * @param {Object} formData - Flat form data
     */
    updateFromForm(formData) {
        for (const [key, value] of Object.entries(formData)) {
            foundry.utils.setProperty(this.data, key, value);
        }
    }

    /**
     * Validate the form and return errors.
     * @returns {{ errors: string[], summary: Object }}
     */
    validateForm() {
        const errors = [];
        const characterType = this.data.characterType;
        const isHuman = characterType === "human" || characterType === "transhuman";
        const isDoll = characterType === "doll";

        // Step 1 required
        if (!this.data.step1.selection) {
            errors.push(isDoll ? "Select a frame" : "Select a nationality");
        }

        // Step 2 (Background) required for humans only
        if (isHuman && !this.data.step2.selection) {
            errors.push("Select a background");
        }

        // Discipline required for both
        if (this.data.step3.discipline.length === 0) {
            errors.push(isDoll ? "Select a weapon discipline" : "Select a discipline");
        }

        // Human starting technique required
        if (isHuman && this.data.step3.startingTechnique.length === 0) {
            errors.push("Select a starting technique");
        }

        // Name required
        if (!this.data.step11.name) {
            errors.push("Enter a character name");
        }

        // T-Doll technique/XP budget validation
        if (isDoll && this.data.step3.xpSpent > (this.data.step3.xpBudget || 16)) {
            errors.push(`XP spent (${this.data.step3.xpSpent}) exceeds budget (${this.data.step3.xpBudget || 16})`);
        }

        // Summary of approach assignments
        const summary = {};
        if (isHuman) {
            const nat = HUMAN_NATIONALITIES.find(n => n.key === this.data.step1.selection);
            const bg = HUMAN_BACKGROUNDS.find(b => b.key === this.data.step2.selection);
            if (nat) {
                nat.approaches.forEach(a => { summary[a] = (summary[a] || 1) + 1; });
            }
            if (bg) {
                summary[bg.approach] = (summary[bg.approach] || 1) + 1;
            }
        } else {
            const frame = TDOLL_FRAMES.find(f => f.key === this.data.step1.selection);
            if (frame) {
                Object.entries(frame.approaches).forEach(([k, v]) => { summary[k] = v; });
            }
        }

        // Validate approach limit at character creation (no single approach > 3)
        for (const [approach, value] of Object.entries(summary)) {
            if (value > TwelveQuestions.MAX_APPROACH_AT_CREATION) {
                errors.push(
                    `${approach.charAt(0).toUpperCase() + approach.slice(1)} (${value}) exceeds the character creation limit of ${TwelveQuestions.MAX_APPROACH_AT_CREATION}`
                );
            }
        }

        return { errors, summary };
    }

    /**
     * Apply the twelve questions data to an actor.
     * Delegates to CharacterGenerator for the actual update.
     * @param {Actor} actor
     * @param {Object} cache - Resolved item cache
     */
    async toActor(actor, cache) {
        // Import CharacterGenerator dynamically to avoid circular deps
        const { CharacterGenerator } = await import("./character-generator.js");
        const generator = new CharacterGenerator(actor);

        const isHuman = this.data.characterType === "human";
        const isTranshuman = false;

        if (isHuman) {
            await generator.applyHumanBuild({
                isTranshuman: false,
                nationalityKey: this.data.step1.selection,
                backgroundKey: this.data.step2.selection,
                disciplineUuid: this._getFirstItemUuid(cache, "step3.discipline"),
                startingTechniqueUuid: this._getFirstItemUuid(cache, "step3.startingTechnique"),
                advantageUuid: this._getFirstItemUuid(cache, "step4.advantage"),
                disadvantageUuid: this._getFirstItemUuid(cache, "step5.disadvantage"),
                passionUuid: this._getFirstItemUuid(cache, "step6.passion"),
                anxietyUuid: this._getFirstItemUuid(cache, "step7.anxiety"),
                viewOfDolls: this.data.step8.viewOfDolls,
                viewDollsSkill: this.data.step8.viewDollsSkill,
                goal: this.data.step9.personalGoal,
                nameMeaning: this.data.step10.nameMeaning,
                storyEnd: this.data.step12.storyEnd,
                name: this.data.step11.name,
                q4BonusSkill: this.data.step4.bonusSkill,
                q5BonusApproach: this.data.step5.bonusApproach,
                step1Narrative: this.data.step1Narrative,
                step2Narrative: this.data.step2Narrative,
                step3Narrative: this.data.step3Narrative,
                step4Narrative: this.data.step4Narrative,
                step5Narrative: this.data.step5Narrative,
                step6Narrative: this.data.step6Narrative,
                step7Narrative: this.data.step7Narrative,
                step8Narrative: this.data.step8Narrative,
                step9Narrative: this.data.step9Narrative,
                step10Narrative: this.data.step10Narrative,
            });
        } else if (isTranshuman) {
            // Transhuman uses the same build as human
            await generator.applyHumanBuild({
                isTranshuman: true,
                nationalityKey: this.data.step1.selection,
                backgroundKey: this.data.step2.selection,
                disciplineUuid: this._getFirstItemUuid(cache, "step3.discipline"),
                startingTechniqueUuid: this._getFirstItemUuid(cache, "step3.startingTechnique"),
                advantageUuid: this._getFirstItemUuid(cache, "step4.advantage"),
                disadvantageUuid: this._getFirstItemUuid(cache, "step5.disadvantage"),
                passionUuid: this._getFirstItemUuid(cache, "step6.passion"),
                anxietyUuid: this._getFirstItemUuid(cache, "step7.anxiety"),
                viewOfDolls: this.data.step8.viewOfDolls,
                viewDollsSkill: this.data.step8.viewDollsSkill,
                goal: this.data.step9.personalGoal,
                nameMeaning: this.data.step10.nameMeaning,
                storyEnd: this.data.step12.storyEnd,
                name: this.data.step11.name,
                q4BonusSkill: this.data.step4.bonusSkill,
                q5BonusApproach: this.data.step5.bonusApproach,
                step1Narrative: this.data.step1Narrative,
                step2Narrative: this.data.step2Narrative,
                step3Narrative: this.data.step3Narrative,
                step4Narrative: this.data.step4Narrative,
                step5Narrative: this.data.step5Narrative,
                step6Narrative: this.data.step6Narrative,
                step7Narrative: this.data.step7Narrative,
                step8Narrative: this.data.step8Narrative,
                step9Narrative: this.data.step9Narrative,
                step10Narrative: this.data.step10Narrative,
            });
        } else {
            await generator.applyDollBuild({
                frameKey: this.data.step1.selection,
                disciplineUuid: this._getFirstItemUuid(cache, "step3.discipline"),
                techniqueUuids: this._getItemUuids(cache, "step3.techniques"),
                moduleUuids: this._getItemUuids(cache, "step2.modules"),
                advantageUuid: this._getFirstItemUuid(cache, "step4.advantage"),
                disadvantageUuid: this._getFirstItemUuid(cache, "step5.disadvantage"),
                passionUuid: this._getFirstItemUuid(cache, "step6.passion"),
                anxietyUuid: this._getFirstItemUuid(cache, "step7.anxiety"),
                nameOrigin: this.data.step10.nameOrigin,
                goal: this.data.step9.personalGoal,
                metCommander: this.data.step8.metCommander,
                storyEnd: this.data.step12.storyEnd,
                name: this.data.step11.name,
                skillPurchases: this.data.step3.skillPurchases || {},
                q4BonusSkill: this.data.step4.bonusSkill,
                q5BonusApproach: this.data.step5.bonusApproach,
                step1Narrative: this.data.step1Narrative,
                step2Narrative: this.data.step2Narrative,
                step3Narrative: this.data.step3Narrative,
                step4Narrative: this.data.step4Narrative,
                step5Narrative: this.data.step5Narrative,
                step6Narrative: this.data.step6Narrative,
                step7Narrative: this.data.step7Narrative,
                step8Narrative: this.data.step8Narrative,
                step9Narrative: this.data.step9Narrative,
                step10Narrative: this.data.step10Narrative,
            });
        }

        // Store twelve_questions data and mark generated
        this.data.generated = true;
        await actor.update({
            "system.twelve_questions": this.data,
        });
    }

    /**
     * Get the first item's UUID from cache for a given step key.
     * @param {Object} cache
     * @param {string} stepKey
     * @returns {string|null}
     */
    _getFirstItemUuid(cache, stepKey) {
        const items = foundry.utils.getProperty(cache, stepKey);
        if (Array.isArray(items) && items.length > 0) {
            return items[0].uuid || null;
        }
        return null;
    }

    /**
     * Get all item UUIDs from cache for a given step key.
     * @param {Object} cache
     * @param {string} stepKey
     * @returns {string[]}
     */
    _getItemUuids(cache, stepKey) {
        const items = foundry.utils.getProperty(cache, stepKey);
        if (Array.isArray(items)) {
            return items.map(i => i.uuid).filter(Boolean);
        }
        return [];
    }
}
