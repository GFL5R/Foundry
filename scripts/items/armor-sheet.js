import { ItemSheetGfl5r } from "./item-sheet.js";

/**
 * @extends {ItemSheet}
 */
export class ArmorSheetGfl5r extends ItemSheetGfl5r {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "armor"],
            template: CONFIG.gfl5r.paths.templates + "items/armor/armor-sheet.html",
        });
    }
}
