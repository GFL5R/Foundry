/**
 * Custom Handlebars for GFL5R
 */
export const RegisterHandlebars = function () {
    const sanitizeIfFail = (str) => {
        return str.indexOf("gfl5r.") !== -1 && str.indexOf("undefined") ? "" : str;
    };

    /* ------------------------------------ */
    /* Localizations                        */
    /* ------------------------------------ */
    Handlebars.registerHelper("localizeSkill", function (categoryId, skillId) {
        if (!categoryId) return "";
        const catLower = categoryId.toLowerCase();
        const skillLower = skillId?.toLowerCase();

        // "title" → return the group label (e.g. "Combat")
        if (skillLower === "title") {
            const groupKey = "gfl5r.skills.groups." + catLower;
            const groupResult = game.i18n.localize(groupKey);
            if (groupResult !== groupKey) return groupResult;
            // Fall back to flat skill name (for NPC iteration)
            return sanitizeIfFail(game.i18n.localize("gfl5r.skills." + catLower));
        }

        // Regular skill name (flat structure)
        return sanitizeIfFail(game.i18n.localize("gfl5r.skills." + skillLower));
    });

    Handlebars.registerHelper("localizeSkillId", function (skillId) {
        if (!skillId) return "";
        const key = "gfl5r.skills." + skillId.toLowerCase();
        return sanitizeIfFail(game.i18n.localize(key));
    });

    Handlebars.registerHelper("localizeRing", function (ringId) {
        const key = "gfl5r.rings." + ringId.toLowerCase();
        return sanitizeIfFail(game.i18n.localize(key));
    });

    Handlebars.registerHelper("localizeApproach", function (approachId) {
        if (!approachId || typeof approachId !== "string") {
            return "";
        }
        const key = "gfl5r.approaches." + approachId.toLowerCase();
        return sanitizeIfFail(game.i18n.localize(key));
    });

    Handlebars.registerHelper("localizeStanceTip", function (ringId) {
        const key = "gfl5r.conflict.stances." + ringId.toLowerCase() + "tip";
        return sanitizeIfFail(game.i18n.localize(key));
    });

    Handlebars.registerHelper("localizeTechnique", function (techniqueName) {
        if (!techniqueName || typeof techniqueName !== "string") {
            return "";
        }
        return sanitizeIfFail(game.i18n.localize("gfl5r.techniques." + techniqueName.toLowerCase()));
    });

    Handlebars.registerHelper("localizeInventoryCategory", function (categoryId) {
        if (!categoryId || typeof categoryId !== "string") {
            return "";
        }

        const keyByCategory = {
            weaponry: "gfl5r.weapons.title",
            armor: "gfl5r.armors.title",
            item: "gfl5r.items.title",
            module: "gfl5r.modules.title",
        };

        const key = keyByCategory[categoryId.toLowerCase()] ?? `TYPES.Item.${categoryId.toLowerCase()}`;
        return sanitizeIfFail(game.i18n.localize(key));
    });

    Handlebars.registerHelper("localizeYesNo", function (isYes) {
        return sanitizeIfFail(game.i18n.localize(isYes ? "Yes" : "No"));
    });

    /* ------------------------------------ */
    /* Dice                                 */
    /* ------------------------------------ */
    Handlebars.registerHelper("getDiceFaceUrl", function (diceClass, faceId) {
        return sanitizeIfFail(game.gfl5r[diceClass].getResultSrc(faceId));
    });

    /* ------------------------------------ */
    /* Utility                              */
    /* ------------------------------------ */
    // Json - Display an object in textarea (for debug)
    Handlebars.registerHelper("json", function (...objects) {
        objects.pop(); // remove this function call
        return new Handlebars.SafeString(objects.map((e) => `<textarea>${JSON.stringify(e)}</textarea>`));
    });

    // Add props "checked" if a and b are equal ({{radioChecked a b}}
    Handlebars.registerHelper("radioChecked", function (a, b) {
        return a === b ? new Handlebars.SafeString('checked="checked"') : "";
    });

    // Concatenation
    Handlebars.registerHelper("concat", function (...objects) {
        objects.pop(); // remove this function call
        return objects.join("");
    });

    // Add a setter
    Handlebars.registerHelper("setVar", function (varName, varValue, options) {
        options.data.root[varName] = varValue;
    });

    /**
     * Utility conditional, usable in nested expression
     * {{#ifCond (ifCond advancement.type '==' 'technique') '||' (ifCond item.system.technique_type '==' 'kata')}}
     * {{#ifCond '["distinction","passion"]' 'includes' item.system.peculiarity_type}}
     */
    Handlebars.registerHelper("ifCond", function (a, operator, b, options) {
        let result = false;
        switch (operator) {
            case "==":
                result = a == b;
                break;
            case "===":
                result = a === b;
                break;
            case "!=":
                result = a != b;
                break;
            case "!==":
                result = a !== b;
                break;
            case "<":
                result = +a < +b;
                break;
            case "<=":
                result = +a <= +b;
                break;
            case ">":
                result = +a > +b;
                break;
            case ">=":
                result = +a >= +b;
                break;
            case "&&":
                result = a && b;
                break;
            case "||":
                result = a || b;
                break;
            case "includes":
                result = a && b && a.includes(b);
                break;
            default:
                break;
        }
        if (typeof options.fn === "function") {
            return result ? options.fn(this) : options.inverse(this);
        }
        return result;
    });

    // Basic math helpers
    Handlebars.registerHelper("add", function (a, b) {
        return Number(a) + Number(b);
    });

    Handlebars.registerHelper("subtract", function (a, b) {
        return Number(a) - Number(b);
    });

    Handlebars.registerHelper("gte", function (a, b, options) {
        const result = Number(a) >= Number(b);
        if (typeof options?.fn === "function") {
            return result ? options.fn(this) : options.inverse(this);
        }
        return result;
    });

    Handlebars.registerHelper("lte", function (a, b, options) {
        const result = Number(a) <= Number(b);
        if (typeof options?.fn === "function") {
            return result ? options.fn(this) : options.inverse(this);
        }
        return result;
    });

    Handlebars.registerHelper("lt", function (a, b, options) {
        const result = Number(a) < Number(b);
        if (typeof options?.fn === "function") {
            return result ? options.fn(this) : options.inverse(this);
        }
        return result;
    });

    Handlebars.registerHelper("gt", function (a, b, options) {
        const result = Number(a) > Number(b);
        if (typeof options?.fn === "function") {
            return result ? options.fn(this) : options.inverse(this);
        }
        return result;
    });

    // Lookup helper for accessing objects by dynamic key
    Handlebars.registerHelper("lookup", function (obj, key) {
        return obj && obj[key];
    });

    // Join array with separator
    Handlebars.registerHelper("join", function (arr, sep) {
        if (!Array.isArray(arr)) return "";
        return arr.join(sep || ", ");
    });
};
