import { BaseItemSheetGfl5r } from "./base-item-sheet.js";

/**
 * Sheet for Discipline items.
 * @extends {BaseItemSheetGfl5r}
 */
export class DisciplineSheetGfl5r extends BaseItemSheetGfl5r {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "discipline"],
            template: CONFIG.gfl5r.paths.templates + "items/discipline/discipline-sheet.html",
            width: 720,
            height: 680,
        });
    }

    /** @override */
    async getData(options = {}) {
        const sheetData = await super.getData(options);
        const sys = sheetData.data.system;
        const enrich = foundry.applications.ux.TextEditor.implementation.enrichHTML;

        // Enrich HTML fields
        sheetData.data.enrichedHtml = {
            flavor: await enrich(sys.flavor ?? "", { async: true }),
            perkFlavor: await enrich(sys.perk?.flavor ?? "", { async: true }),
            perkDescription: await enrich(sys.perk?.description ?? "", { async: true }),
            capstoneFlavor: await enrich(sys.capstone?.flavor ?? "", { async: true }),
            capstoneDescription: await enrich(sys.capstone?.description ?? "", { async: true }),
        };

        // Group techniques by rank
        const byRank = {};
        for (const tech of sys.techniques ?? []) {
            const rank = tech.rank ?? 1;
            if (!byRank[rank]) byRank[rank] = [];
            byRank[rank].push(tech);
        }
        sheetData.data.techniquesByRank = Object.entries(byRank)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([rank, techs]) => ({ rank: Number(rank), techniques: techs }));

        // Weapon category options for the starting weapon grant
        sheetData.data.weaponCategories = Array.from(CONFIG.gfl5r.weaponCategories.entries()).map(([id, info]) => ({
            id,
            label: game.i18n.localize(info.label),
        }));

        return sheetData;
    }
}
