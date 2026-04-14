import { ItemSheetGfl5r } from "./item-sheet.js";

/**
 * @extends {ItemSheet}
 */
export class TechniqueSheetGfl5r extends ItemSheetGfl5r {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "technique"],
            template: CONFIG.gfl5r.paths.templates + "items/technique/technique-sheet.html",
        });
    }

    /** @override */
    async getData(options = {}) {
        const sheetData = await super.getData(options);

        // List all available technique types
        sheetData.data.techniquesList = Array.from(CONFIG.gfl5r.techniques.keys()).map(id => ({
            id,
            label: game.i18n.localize(`gfl5r.techniques.${id}`),
        }));

        // Approaches list for the approach selector
        sheetData.data.approachesList = game.gfl5r.HelpersGfl5r.getRingsList();

        // Build display labels (read-only). Handles null, single value, or array.
        const toLabel = (val, list) => {
            if (val == null || val === "") return "";
            const map = new Map(list.map(o => [o.id, o.label]));
            const arr = Array.isArray(val) ? val : [val];
            return arr.map(v => map.get(v) ?? v).filter(v => v != null && v !== "").join(", ");
        };
        sheetData.data.approachLabel = toLabel(sheetData.data.system.approach, sheetData.data.approachesList);
        sheetData.data.techniqueTypeLabel = toLabel(sheetData.data.system.technique_type, sheetData.data.techniquesList);

        // Sanitize Skill list
        sheetData.data.system.skill = TechniqueSheetGfl5r.translateSkillsList(
            TechniqueSheetGfl5r.formatSkillList(sheetData.data.system.skill.split(",")),
            false
        ).join(", ");

        return sheetData;
    }

    /**
     * This method is called upon form submission after form data is validated
     * @param   {Event}  event    The initial triggering submission event
     * @param   {Object} formData The object of validated form data with which to update the object
     * @returns {Promise}         A Promise which resolves once the update operation has completed
     * @override
     */
    async _updateObject(event, formData) {
        // Change the image according to the type if this is already the case
        if (
            formData["system.technique_type"] &&
            formData.img === `${CONFIG.gfl5r.paths.assets}icons/techs/${this.object.system.technique_type}.svg`
        ) {
            formData.img = `${CONFIG.gfl5r.paths.assets}icons/techs/${formData["system.technique_type"]}.svg`;
        }

        // Sanitize Skill list
        formData["system.skill"] = TechniqueSheetGfl5r.formatSkillList(
            TechniqueSheetGfl5r.translateSkillsList(formData["system.skill"].split(","), true)
        ).join(",");

        return super._updateObject(event, formData);
    }

    /**
     * Listen to html elements
     * @param {jQuery} html HTML content of the sheet.
     * @override
     */
    activateListeners(html) {
        super.activateListeners(html);

        // *** Everything below here is only needed if the sheet is editable ***
        if (!this.isEditable) {
            return;
        }

        // Autocomplete
        game.gfl5r.HelpersGfl5r.autocomplete(
            html,
            "system.skill",
            Object.values(TechniqueSheetGfl5r.getSkillsTranslationMap(false)),
            ","
        );
    }

    /**
     * Get a flat map for skill translation
     * @param  {boolean} bToSkillId if true flip props/values
     * @return {Object}
     */
    static getSkillsTranslationMap(bToSkillId) {
        return Array.from(CONFIG.gfl5r.skills).reduce((acc, [id, cat]) => {
            if (bToSkillId) {
                acc[game.gfl5r.HelpersGfl5r.normalize(game.i18n.localize(`gfl5r.skills.${id}`))] = id;
                acc[game.gfl5r.HelpersGfl5r.normalize(game.i18n.localize(`gfl5r.skills.groups.${cat}`))] = cat;
            } else {
                acc[id] = game.i18n.localize(`gfl5r.skills.${id}`);
                acc[cat] = game.i18n.localize(`gfl5r.skills.groups.${cat}`);
            }
            return acc;
        }, {});
    }

    /**
     * Translate a list of skill and category
     * @param  {string[]}   aIn
     * @param  {boolean} bToSkillId
     * @return {string[]}
     */
    static translateSkillsList(aIn, bToSkillId) {
        const map = TechniqueSheetGfl5r.getSkillsTranslationMap(bToSkillId);
        return aIn.map((skill) => map[game.gfl5r.HelpersGfl5r.normalize(skill)]);
    }

    /**
     * Sanitize the technique skill list
     * @param  {string[]} skillList
     * @return {string[]}
     */
    static formatSkillList(skillList) {
        if (!skillList) {
            return "";
        }
        const categories = game.gfl5r.HelpersGfl5r.getCategoriesSkillsList();

        // List categories
        const unqCatList = new Set();
        skillList.forEach((s) => {
            s = s?.trim();
            if (!!s && categories.has(s)) {
                unqCatList.add(s);
            }
        });

        // List skill (not include in cat)
        const unqSkillList = new Set();
        skillList.forEach((s) => {
            s = s?.trim();
            if (!!s && CONFIG.gfl5r.skills.has(s)) {
                const cat = CONFIG.gfl5r.skills.get(s);
                if (!unqCatList.has(cat)) {
                    unqSkillList.add(s);
                }
            }
        });

        return [...unqCatList, ...unqSkillList];
    }
}
