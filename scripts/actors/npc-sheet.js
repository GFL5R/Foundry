import { BaseCharacterSheetGfl5r } from "./base-character-sheet.js";

/**
 * NPC Sheet
 */
export class NpcSheetGfl5r extends BaseCharacterSheetGfl5r {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "npc"],
            template: CONFIG.gfl5r.paths.templates + "actors/npc-sheet.html",
        });
    }

    /**
     * Add header buttons
     * @override
     */
    _getGfl5rHeaderButtons() {
        const buttons = super._getGfl5rHeaderButtons();
        if (!this.isEditable || this.actor.limited) {
            return buttons;
        }
        return buttons;
    }

    /** @inheritdoc */
    async getData(options = {}) {
        const sheetData = await super.getData();

        // NPC threat levels
        sheetData.data.threatLevels = CONFIG.gfl5r.threatLevels.map((e) => ({
            id: e,
            label: game.i18n.localize("gfl5r.npc.threat_levels." + e),
        }));

        // Character type info
        sheetData.data.isHuman = this.actor.system.identity?.characterType === "human";
        sheetData.data.isTDoll = this.actor.system.identity?.characterType === "t-doll";

        return sheetData;
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (!this.isEditable) {
            return;
        }
    }

    _updateObject(event, formData) {
        return super._updateObject(event, formData);
    }
}
