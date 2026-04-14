import { ItemSheetGfl5r } from "./item-sheet.js";

/**
 * @extends {ItemSheet}
 */
export class WeaponSheetGfl5r extends ItemSheetGfl5r {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "weaponry"],
            template: CONFIG.gfl5r.paths.templates + "items/weapon/weapon-sheet.html",
        });
    }

    async getData(options = {}) {
        const sheetData = await super.getData(options);

        // Combat skills only
        sheetData.data.skills = Array.from(CONFIG.gfl5r.skills)
            .filter(([id, cat]) => cat === "combat")
            .map(([id, cat]) => ({
                id,
                label: "gfl5r.skills." + id,
            }));

        return sheetData;
    }
}
