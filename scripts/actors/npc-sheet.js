import { BaseCharacterSheetGfl5r } from "./base-character-sheet.js";

/**
 * NPC Sheet
 */
export class NpcSheetGfl5r extends BaseCharacterSheetGfl5r {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "npc"],
            template: CONFIG.gfl5r.paths.templates + "actors/npc-sheet.html",
            tabs: [
                { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "summary" },
            ],
        });
    }

    /** @inheritdoc */
    async getData(options = {}) {
        const sheetData = await super.getData(options);

        // Threat-level dropdown options
        sheetData.data.threatLevels = CONFIG.gfl5r.threatLevels.map((id) => ({
            id,
            label: game.i18n.localize("gfl5r.npc.threat_levels." + id),
        }));

        // Skill groups (4 rollup values on an NPC)
        const skills = sheetData.data.system.skills || {};
        sheetData.data.skillGroups = CONFIG.gfl5r.skillGroups.map((group) => ({
            id: group.id,
            label: "gfl5r.npc.skill_groups." + group.id,
            rank: parseInt(skills[group.id]) || 0,
        }));

        // Summary tab buckets
        const techniques = sheetData.items.filter((i) => i.type === "technique");
        sheetData.data.summaryPerksCapstones = techniques.filter(
            (i) => ["perk", "capstone"].includes(i.system.technique_type)
        );
        sheetData.data.summaryTechniques = techniques.filter(
            (i) => !["perk", "capstone"].includes(i.system.technique_type)
        );

        sheetData.data.summaryWeapons = sheetData.items.filter((i) => i.type === "weaponry");

        const narrative = sheetData.items.filter((i) => i.type === "narrative");
        sheetData.data.summaryAdvantages = narrative.filter((i) => i.system.narrative_type === "advantage");
        sheetData.data.summaryDisadvantages = narrative.filter((i) => i.system.narrative_type === "disadvantage");
        sheetData.data.summaryPassions = narrative.filter((i) => i.system.narrative_type === "passion");
        sheetData.data.summaryAnxieties = narrative.filter((i) => i.system.narrative_type === "anxiety");

        return sheetData;
    }
}
