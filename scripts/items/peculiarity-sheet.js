import { ItemSheetGfl5r } from "./item-sheet.js";

/**
 * Commun class for Advantages / Disadvantages types
 * @extends {ItemSheet}
 */
export class PeculiaritySheetGfl5r extends ItemSheetGfl5r {
    /**
     * Sub Types of Advantage/Disadvantage
     */
    static types = ["advantage", "passion", "disadvantage", "anxiety"];

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "peculiarity"],
            template: CONFIG.gfl5r.paths.templates + "items/peculiarity/peculiarity-sheet.html",
        });
    }

    async getData(options = {}) {
        const sheetData = await super.getData(options);

        sheetData.data.subTypesList = PeculiaritySheetGfl5r.types.map((e) => ({
            id: e,
            label: game.i18n.localize("gfl5r.peculiarities.types." + e),
        }));

        // Approaches list for the approach selector
        sheetData.data.approachesList = game.gfl5r.HelpersGfl5r.getRingsList();

        return sheetData;
    }
}
