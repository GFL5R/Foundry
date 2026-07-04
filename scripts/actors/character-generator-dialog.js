import { CharacterGenerator } from "./character-generator.js";
import { HUMAN_NATIONALITIES, HUMAN_BACKGROUNDS, TDOLL_FRAMES } from "./character-builder-data.js";

/**
 * GFL5R Character Builder Dialog
 * A multi-step form for creating Human or T-Doll characters.
 */
export class CharacterGeneratorDialog extends FormApplication {
    constructor(actor, options = {}) {
        super({}, options);
        this.actor = actor;
        this.generator = new CharacterGenerator(actor);
        this.builderState = {
            step: 0,
            buildType: actor.system.identity?.characterType || "human",
            formValues: {},
        };
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "gfl5r-character-builder",
            title: "Character Creation",
            template: CONFIG.gfl5r.paths.templates + "actors/character-generator-dialog.html",
            classes: ["gfl5r", "character-builder"],
            width: 700,
            height: 550,
            resizable: true,
            submitOnChange: false,
        });
    }

    async getData() {
        return {
            actor: this.actor,
            state: this.builderState,
            nationalities: HUMAN_NATIONALITIES,
            backgrounds: HUMAN_BACKGROUNDS,
            frames: TDOLL_FRAMES,
            approaches: CONFIG.gfl5r.stances,
            isHuman: this.builderState.buildType === "human",
            isTDoll: this.builderState.buildType === "t-doll",
            isTranshuman: this.builderState.buildType === "transhuman",
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find("[name='buildType']").on("change", (ev) => {
            this.builderState.buildType = ev.currentTarget.value;
            this.render(false);
        });

        html.find("[data-action='builder-next']").on("click", (ev) => {
            ev.preventDefault();
            this.builderState.step = Math.min(3, this.builderState.step + 1);
            this.render(false);
        });

        html.find("[data-action='builder-prev']").on("click", (ev) => {
            ev.preventDefault();
            this.builderState.step = Math.max(0, this.builderState.step - 1);
            this.render(false);
        });

        html.find(".cg-item-drop").each((_, el) => {
            el.addEventListener("dragover", (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
            });
            el.addEventListener("drop", this._onItemDrop.bind(this));
        });
    }

    async _onItemDrop(event) {
        event.preventDefault();

        const input = event.currentTarget;
        if (!input) return;

        const item = await game.gfl5r.HelpersGfl5r.getDragnDropTargetObject(event);
        if (!item || item.documentName !== "Item") return;

        const dropType = input.dataset.dropType;
        if (dropType === "discipline") {
            if (item.type !== "discipline") {
                ui.notifications?.warn(`Item type "${item.type}" not allowed here`);
                return;
            }

            input.value = item.uuid || item.id || "";

            // Changing discipline invalidates any previously selected starting technique.
            const linkedTechniqueInput = input.form?.querySelector(
                `[data-drop-type='starting-technique'][data-discipline-field='${input.name}']`
            );
            if (linkedTechniqueInput) linkedTechniqueInput.value = "";
            return;
        }

        if (dropType === "starting-technique") {
            if (item.type !== "technique") {
                ui.notifications?.warn(`Item type "${item.type}" not allowed here`);
                return;
            }

            const disciplineField = input.dataset.disciplineField;
            const disciplineInput = disciplineField
                ? input.form?.querySelector(`[name='${disciplineField}']`)
                : null;
            const disciplineUuid = disciplineInput?.value?.trim() || "";

            if (!disciplineUuid) {
                ui.notifications?.warn("gfl5r.disciplines.warning.assign_discipline_first", { localize: true });
                return;
            }

            const disciplineItem = await fromUuid(disciplineUuid);
            if (!disciplineItem || disciplineItem.type !== "discipline") {
                ui.notifications?.warn("gfl5r.disciplines.warning.assign_discipline_first", { localize: true });
                return;
            }

            const isValidTechnique = this.generator._validateTechniqueForDiscipline({
                techniqueItem: item,
                disciplineItem,
                currentRank: 1,
            });
            if (!isValidTechnique) return;

            input.value = item.uuid || item.id || "";
        }
    }

    async _updateObject(event, formData) {
        if (this.builderState.buildType === "transhuman") {
            await this.generator.applyTranshumanBuild({
                nationalityKey: formData["human.nationality"],
                backgroundKey: formData["human.background"],
                disciplineUuid: formData["discipline"],
                startingTechniqueUuid: formData["startingTechnique"],
                advantageUuid: formData["advantage"],
                disadvantageUuid: formData["disadvantage"],
                passionUuid: formData["passion"],
                anxietyUuid: formData["anxiety"],
                viewOfDolls: formData["human.viewOfDolls"] || "favor",
                viewDollsSkill: formData["human.viewDollsSkill"] || "",
                goal: formData["goal"] || "",
                nameMeaning: formData["nameMeaning"] || "",
                storyEnd: formData["storyEnd"] || "",
                name: formData["name"] || "",
            });
        } else if (this.builderState.buildType === "t-doll") {
            await this.generator.applyTDollBuild({
                frameKey: formData["tdoll.frame"],
                disciplineUuid: formData["tdoll.discipline"],
                startingTechniqueUuid: formData["tdoll.startingTechnique"],
                advantageUuid: formData["advantage"],
                disadvantageUuid: formData["disadvantage"],
                passionUuid: formData["passion"],
                anxietyUuid: formData["anxiety"],
                nameOrigin: formData["tdoll.nameOrigin"] || "human",
                goal: formData["goal"] || "",
                storyEnd: formData["storyEnd"] || "",
                name: formData["name"] || "",
            });
        } else {
            await this.generator.applyHumanBuild({
                nationalityKey: formData["human.nationality"],
                backgroundKey: formData["human.background"],
                disciplineUuid: formData["discipline"],
                startingTechniqueUuid: formData["startingTechnique"],
                advantageUuid: formData["advantage"],
                disadvantageUuid: formData["disadvantage"],
                passionUuid: formData["passion"],
                anxietyUuid: formData["anxiety"],
                viewOfDolls: formData["human.viewOfDolls"] || "favor",
                viewDollsSkill: formData["human.viewDollsSkill"] || "",
                goal: formData["goal"] || "",
                nameMeaning: formData["nameMeaning"] || "",
                storyEnd: formData["storyEnd"] || "",
                name: formData["name"] || "",
            });
        }
        this.close();
    }
}
