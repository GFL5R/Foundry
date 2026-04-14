import { TwelveQuestions } from "./twelve-questions.js";
import { HUMAN_NATIONALITIES, HUMAN_BACKGROUNDS, TDOLL_FRAMES } from "./character-builder-data.js";

/**
 * GFL5R Twelve Questions Dialog
 * A multi-step character creation wizard with 12 questions per character type.
 * Modeled after L5R5E's TwentyQuestionsDialog.
 *
 * @extends {FormApplication}
 */
export class TwelveQuestionsDialog extends FormApplication {
    /** Current actor */
    actor = null;

    /** Validation summary & errors */
    summary = { errors: [], summary: {} };

    /** Cache for resolved items (disciplines, narratives, modules) */
    cache = null;

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "gfl5r-twelve-questions-dialog",
            classes: ["gfl5r", "twelve-questions-dialog"],
            template: CONFIG.gfl5r.paths.templates + "actors/twelve-questions-dialog.html",
            title: game.i18n.localize("gfl5r.twelve_questions.title"),
            width: 740,
            height: 820,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "part0" }],
            resizable: true,
            closeOnSubmit: false,
            submitOnClose: false,
            submitOnChange: true,
        });
    }

    get id() {
        return `gfl5r-twelve-questions-dialog-${this.actor.id}`;
    }

    constructor(actor = null, options = {}) {
        super({}, options);
        this._initialize(actor);
    }

    /** Initialize actor and TwelveQuestions object */
    _initialize(actor) {
        this.actor = actor;
        this.object = new TwelveQuestions(actor);
        this.summary = this.object.validateForm();
    }

    /** Refresh when updated externally (e.g. socket) */
    async refresh() {
        if (!this.actor) return;
        this._initialize(game.actors.get(this.actor.id));
        await this._constructCache();
        this.render(false);
    }

    /** Build cache before first render */
    async _render(force = false, options = {}) {
        if (this.cache === null) {
            await this._constructCache();
        }
        return super._render(force, options);
    }

    /** Provide template data */
    async getData(options = null) {
        const isHuman = this.data.characterType === "human";
        const skillsList = game.gfl5r.HelpersGfl5r.getSkillsList(true);

        return {
            ...(await super.getData(options)),
            data: this.object.data,
            cache: this.cache,
            summary: {
                ...this.summary,
                errors: this.summary.errors.join(", "),
            },
            isHuman,
            isTDoll: !isHuman,
            nationalities: HUMAN_NATIONALITIES,
            backgrounds: HUMAN_BACKGROUNDS,
            frames: TDOLL_FRAMES,
            approachesList: game.gfl5r.HelpersGfl5r.getRingsList(),
            skillsList,
            skillsListFlat: game.gfl5r.HelpersGfl5r.getSkillsList(false),
        };
    }

    /** Shortcut for character type */
    get data() {
        return this.object.data;
    }

    /** Activate UI listeners */
    activateListeners(html) {
        super.activateListeners(html);

        // Common helpers
        game.gfl5r.HelpersGfl5r.commonListeners(html, this.actor);

        // Bind drop zones directly via DOM events
        const dropZones = html.find(".tq-drop-zone");
        dropZones.each((i, el) => {
            el.addEventListener("dragover", (ev) => {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = "copy";
            });
            el.addEventListener("drop", this._onDrop.bind(this));
        });

        // Next/Prev tab buttons
        html.find(".tq-next").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const tab = this._tabs.find(e => e._navSelector === ".sheet-tabs");
            const current = parseInt(tab.active.replace(/[^0-9]/g, "")) || 0;
            tab.activate("part" + (current + 1));
            $(event.currentTarget).closest(".window-content").scrollTop(0);
        });

        html.find(".tq-prev").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const tab = this._tabs.find(e => e._navSelector === ".sheet-tabs");
            const current = parseInt(tab.active.replace(/[^0-9]/g, "")) || 0;
            if (current > 0) tab.activate("part" + (current - 1));
            $(event.currentTarget).closest(".window-content").scrollTop(0);
        });

        if (!this.isEditable) return;

        // Delete a drag-dropped element
        html.find(".tq-item-delete").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const dropZone = $(event.currentTarget).closest(".tq-drop-zone");
            const stepKey = dropZone.data("step");
            const itemId = $(event.currentTarget).closest(".tq-item").data("itemId");
            this._deleteOwnedItem(stepKey, itemId);
            this.submit();
        });

        // Generate button
        html.find("#tq-generate").on("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Final validation
            const validation = this.object.validateForm();
            if (validation.errors.length > 0) {
                ui.notifications?.warn(validation.errors.join("; "));
                return;
            }

            $(event.currentTarget).prop("disabled", true);
            await this.object.toActor(this.actor, this.cache);
            await this.close({ submit: true, force: true });
        });

    }

    /**
     * Handle items dropped onto drop zones.
     * @param {DragEvent} event - Raw DOM drag event from DragDrop handler
     */
    async _onDrop(event) {
        event.preventDefault();

        if (!this.isEditable) return;

        // Find the drop zone — event.currentTarget is the matched dropSelector element
        const dropZone = event.currentTarget;
        const stepKey = dropZone?.dataset?.step;
        if (!stepKey) return;

        try {
            const item = await game.gfl5r.HelpersGfl5r.getDragnDropTargetObject(event);
            if (!item || item.documentName !== "Item") return;

            // Validate item type for the drop zone
            const validation = this._validateDropType(stepKey, item);
            if (!validation.allowed) {
                ui.notifications?.warn(validation.message || `Item type "${item.type}" not allowed here`);
                return;
            }

            // Add item
            this._addOwnedItem(item, stepKey);
            this.submit();
        } catch (err) {
            console.warn("GFL5R | 12Q | Drop error:", err);
        }
    }

    /**
     * Validate that a dropped item is the correct type for the step.
     */
    _validateDropType(stepKey, item) {
        // Discipline drop zones
        if (stepKey === "step3.discipline" || stepKey === "step2.discipline") {
            return { allowed: item.type === "discipline" };
        }

        // Human starting technique drop zone (requires selected discipline)
        if (stepKey === "step3.startingTechnique") {
            if (item.type !== "technique") return { allowed: false };

            const disciplineItem = foundry.utils.getProperty(this.cache, "step3.discipline")?.[0] || null;
            if (!disciplineItem) {
                return {
                    allowed: false,
                    message: game.i18n.localize("gfl5r.disciplines.warning.assign_discipline_first"),
                };
            }

            return this._validateTechniqueForDiscipline({
                techniqueItem: item,
                disciplineItem,
                currentRank: 1,
            });
        }

        // Module drop zone (T-Doll step 3)
        if (stepKey === "step3.modules") {
            return { allowed: item.type === "module" };
        }

        // Narrative drop zones
        if (stepKey === "step4.advantage") {
            return { allowed: item.type === "narrative" && item.system.narrative_type === "advantage" };
        }
        if (stepKey === "step5.disadvantage") {
            return { allowed: item.type === "narrative" && item.system.narrative_type === "disadvantage" };
        }
        if (stepKey === "step6.passion") {
            return { allowed: item.type === "narrative" && item.system.narrative_type === "passion" };
        }
        if (stepKey === "step7.anxiety") {
            return { allowed: item.type === "narrative" && item.system.narrative_type === "anxiety" };
        }

        return { allowed: false };
    }

    _validateTechniqueForDiscipline({ techniqueItem, disciplineItem, currentRank = 1 }) {
        const normalizeName = (value) => String(value || "").trim().toLowerCase();
        const allowedTechniqueNames = new Set(
            (disciplineItem.system?.techniques || [])
                .map((entry) => (typeof entry === "string" ? entry : entry?.name))
                .filter(Boolean)
                .map(normalizeName)
        );

        if (!allowedTechniqueNames.has(normalizeName(techniqueItem.name))) {
            return {
                allowed: false,
                message: game.i18n.format("gfl5r.disciplines.warning.invalid_technique_for_discipline", {
                    technique: techniqueItem.name,
                    discipline: disciplineItem.name,
                }),
            };
        }

        const requiredRank = Math.max(1, parseInt(techniqueItem.system?.rank_required) || 1);
        if (currentRank < requiredRank) {
            return {
                allowed: false,
                message: game.i18n.format("gfl5r.disciplines.warning.rank_requirement_not_met", {
                    technique: techniqueItem.name,
                    requiredRank,
                    currentRank,
                }),
            };
        }

        return { allowed: true };
    }

    /**
     * Add an item to the data and cache.
     */
    _addOwnedItem(item, stepKey) {
        const list = foundry.utils.getProperty(this.data, stepKey);
        if (!Array.isArray(list)) {
            console.warn(`GFL5R | 12Q | Step key "${stepKey}" does not point to an array`);
            return;
        }

        // For single-item slots, replace; for multi-item slots, append
        const singleSlots = [
            "step3.discipline", "step2.discipline",
            "step3.startingTechnique",
            "step4.advantage", "step5.disadvantage",
            "step6.passion", "step7.anxiety",
        ];

        const itemRef = item.uuid || item.id;

        if (singleSlots.includes(stepKey)) {
            foundry.utils.setProperty(this.data, stepKey, [itemRef]);
            foundry.utils.setProperty(this.cache, stepKey, [item]);

            if (stepKey === "step3.discipline") {
                foundry.utils.setProperty(this.data, "step3.startingTechnique", []);
                foundry.utils.setProperty(this.cache, "step3.startingTechnique", []);
            }
        } else {
            // Multi-slot (modules)
            if (!list.includes(itemRef)) {
                list.push(itemRef);
                const cached = foundry.utils.getProperty(this.cache, stepKey) || [];
                cached.push(item);
                foundry.utils.setProperty(this.cache, stepKey, cached);
            }
        }
    }

    /**
     * Delete an item from a step.
     */
    _deleteOwnedItem(stepKey, itemId) {
        const list = foundry.utils.getProperty(this.data, stepKey);
        if (!Array.isArray(list)) return;

        const idx = list.findIndex(ref => ref === itemId || ref.endsWith?.(itemId));
        if (idx >= 0) list.splice(idx, 1);

        const cached = foundry.utils.getProperty(this.cache, stepKey);
        if (Array.isArray(cached)) {
            const cacheIdx = cached.findIndex(i =>
                i.id === itemId || i.uuid === itemId || i._id === itemId
            );
            if (cacheIdx >= 0) cached.splice(cacheIdx, 1);
        }
    }

    /**
     * Build item cache from stored UUIDs/IDs.
     */
    async _constructCache() {
        this.cache = {};

        const itemArrayKeys = [
            "step2.discipline",
            "step3.discipline",
            "step3.startingTechnique",
            "step3.modules",
            "step4.advantage",
            "step5.disadvantage",
            "step6.passion",
            "step7.anxiety",
        ];

        for (const key of itemArrayKeys) {
            const refs = foundry.utils.getProperty(this.data, key);
            if (!Array.isArray(refs) || refs.length === 0) {
                foundry.utils.setProperty(this.cache, key, []);
                continue;
            }

            const resolved = [];
            for (const ref of refs) {
                try {
                    // Try UUID first, then world item ID
                    let item = await fromUuid(ref);
                    if (!item && game.items) {
                        item = game.items.get(ref);
                    }
                    if (item) resolved.push(item);
                } catch (err) {
                    console.warn(`GFL5R | 12Q | Could not resolve item ref: ${ref}`, err);
                }
            }
            foundry.utils.setProperty(this.cache, key, resolved);
        }
    }

    /**
     * Handle form submission — save data to actor.
     * formData is flat with dot-notation keys (e.g. "step1.selection").
     * updateFromForm uses setProperty to navigate dot-notation correctly.
     */
    async _updateObject(event, formData) {
        // Update TwelveQuestions data from flat form fields
        this.object.updateFromForm(formData);

        // Re-validate
        this.summary = this.object.validateForm();

        // Persist to actor
        await this.actor.update({
            "system.twelve_questions": this.object.data,
        });

        // Explicit re-render (Foundry v13/14 FormApplication requires this)
        this.render(false);
    }
}
