import { TacticalGridSettingsGFL5R } from "./settings/tactical-grid-settings.js"
import { Gfl5rSetField } from "./data/gfl5r-setfield.js"

/**
 * Custom system settings register
 */
export const RegisterSettings = function () {

    /* ------------------------------------ */
    /* User settings                        */
    /* ------------------------------------ */
    game.settings.register(CONFIG.gfl5r.namespace, "rnk-deleteOldMessage", {
        name: "SETTINGS.RollNKeep.DeleteOldMessage",
        hint: "SETTINGS.RollNKeep.DeleteOldMessageHint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });
    game.settings.register(CONFIG.gfl5r.namespace, "initiative-setTn1OnTypeChange", {
        name: "SETTINGS.Initiative.SetTn1OnTypeChange",
        hint: "SETTINGS.Initiative.SetTn1OnTypeChangeHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
    game.settings.register(CONFIG.gfl5r.namespace, "show-all-status-effects", {
        name: "SETTINGS.ShowAllStatusEffects.Title",
        hint: "SETTINGS.ShowAllStatusEffects.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true,
    });

    /* ------------------------------------ */
    /* Client preferences                   */
    /* ------------------------------------ */
    game.settings.register(CONFIG.gfl5r.namespace, "custom-items-windows-height", {
        name: "SETTINGS.CustomItemsHeight.Title",
        hint: "SETTINGS.CustomItemsHeight.Hint",
        scope: "client",
        config: true,
        requiresReload: true,
        type: Number,
        range: {
            min: 400,
            max: 2000,
            step: 50
        },
        default: 800,
    });
    game.settings.register(CONFIG.gfl5r.namespace, "token-reverse-token-bars", {
        name: "SETTINGS.ReverseTokenBars.Title",
        hint: "SETTINGS.ReverseTokenBars.Hint",
        scope: "client",
        config: true,
        default: "none",
        choices: {
            "none": "SETTINGS.ReverseTokenBars.None",
            "fatigue": "SETTINGS.ReverseTokenBars.Fatigue",
            "strife": "SETTINGS.ReverseTokenBars.Strife",
            "both": "SETTINGS.ReverseTokenBars.Both"
        },
        type: String,
    });

    /* -------------------------------------- */
    /* Compendium view Settings (GM only)     */
    /* -------------------------------------- */
    game.settings.register(CONFIG.gfl5r.namespace, "all-compendium-references", {
        type: new foundry.data.fields.SetField(new foundry.data.fields.StringField()),
        default: Object.keys(CONFIG.gfl5r.sourceReference),
        config: false,
        scope: "world",
    });

    game.settings.register(CONFIG.gfl5r.namespace, "compendium-official-content-for-players", {
        name: "SETTINGS.Compendium.AllowedOfficialSources.Title",
        hint: "SETTINGS.Compendium.AllowedOfficialSources.Hint",
        type: new Gfl5rSetField({
            groups: Array.from(new Set(Object.values(CONFIG.gfl5r.sourceReference).map(value =>
                    (value.type.split(",")).map(value => value.trim())
                ).flat())).map(value => ({ label: value, rule: (option) => option.group === value })),
            options: Object.entries(CONFIG.gfl5r.sourceReference).map(([key, value]) => ({
                value: key,
                label: value.label,
                group: value.type.split(",")[0].trim(),
            })),
        }),
        default: [],
        config: true,
        scope: "world",
    });

    game.settings.register(CONFIG.gfl5r.namespace, "compendium-unofficial-content-for-players", {
        name: "SETTINGS.Compendium.AllowedUnofficialSources.Title",
        hint: "SETTINGS.Compendium.AllowedUnofficialSources.Hint",
        type: new foundry.data.fields.SetField(new foundry.data.fields.StringField()),
        default: [],
        config: true,
        scope: "world",
    });

    game.settings.register(CONFIG.gfl5r.namespace, "compendium-hide-empty-sources-from-players", {
        name: "SETTINGS.Compendium.HideEmptySourcesFromPlayers.Title",
        hint: "SETTINGS.Compendium.HideEmptySourcesFromPlayers.Hint",
        type: Boolean,
        default: false,
        config: true,
        scope: "world",
    });

    game.settings.register(CONFIG.gfl5r.namespace, "compendium-hide-disabled-sources", {
        name: "SETTINGS.Compendium.HideDisabledSources.Title",
        hint: "SETTINGS.Compendium.HideDisabledSources.Hint",
        type: Boolean,
        default: true,
        config: true,
        scope: "world",
    });

    /* ------------------------------------ */
    /* Update                               */
    /* ------------------------------------ */
    game.settings.register(CONFIG.gfl5r.namespace, "systemMigrationVersion", {
        name: "System Migration Version",
        scope: "world",
        config: false,
        type: String,
        default: "0.1.0",
    });

    /* ------------------------------------ */
    /* Initiative Roll Dialog (GM only)     */
    /* ------------------------------------ */
    game.settings.register(CONFIG.gfl5r.namespace, "initiative-difficulty-hidden", {
        name: "Initiative difficulty is hidden",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        onChange: () => game.gfl5r.HelpersGfl5r.notifyDifficultyChange(),
    });
    game.settings.register(CONFIG.gfl5r.namespace, "initiative-difficulty-value", {
        name: "Initiative difficulty value",
        scope: "world",
        config: false,
        type: Number,
        default: 2,
        onChange: () => game.gfl5r.HelpersGfl5r.notifyDifficultyChange(),
    });
    game.settings.register(CONFIG.gfl5r.namespace, "initiative-encounter", {
        name: "Initiative encounter type",
        scope: "world",
        config: false,
        type: String,
        default: "skirmish",
        onChange: () => {
            if (game.settings.get(CONFIG.gfl5r.namespace, "initiative-setTn1OnTypeChange")) {
                game.settings.set(CONFIG.gfl5r.namespace, "initiative-difficulty-value", 1);
            }
            ui.combat.render(true);
        },
    });
    game.settings.register(CONFIG.gfl5r.namespace, "initiative-prepared-character", {
        name: "Initiative PC prepared or not",
        scope: "world",
        config: false,
        type: String,
        default: "actor",
        onChange: () => {
            game.gfl5r.HelpersGfl5r.refreshLocalAndSocket("gfl5r-gm-monitor");
            ui.combat.render(true);
        },
    });
    game.settings.register(CONFIG.gfl5r.namespace, "initiative-prepared-adversary", {
        name: "Initiative NPC adversary are prepared or not",
        scope: "world",
        config: false,
        type: String,
        default: "actor",
        onChange: () => {
            game.gfl5r.HelpersGfl5r.refreshLocalAndSocket("gfl5r-gm-monitor");
            ui.combat.render(true);
        },
    });
    game.settings.register(CONFIG.gfl5r.namespace, "initiative-prepared-minion", {
        name: "Initiative NPC minion are prepared or not",
        scope: "world",
        config: false,
        type: String,
        default: "actor",
        onChange: () => {
            game.gfl5r.HelpersGfl5r.refreshLocalAndSocket("gfl5r-gm-monitor");
            ui.combat.render(true);
        },
    });

    /* ------------------------------------ */
    /* GM Monitor windows (GM only)         */
    /* ------------------------------------ */
    game.settings.register(CONFIG.gfl5r.namespace, "gm-monitor-actors", {
        name: "Gm Monitor",
        scope: "world",
        config: false,
        type: Array,
        default: [],
        onChange: () => game.gfl5r.HelpersGfl5r.refreshLocalAndSocket("gfl5r-gm-monitor"),
    });

    /* -------------------------------------- */
    /* Grid Settings (GM only)                */
    /* -------------------------------------- */
    game.settings.register(CONFIG.gfl5r.namespace, "tactical-grid-settings-world", {
        scope: "world",
        config: false,
        type: TacticalGridSettingsGFL5R.worldSchema,
    });

    game.settings.register(CONFIG.gfl5r.namespace, "tactical-grid-settings-client", {
        scope: "client",
        config: false,
        type: TacticalGridSettingsGFL5R.clientSchema,
    });

    game.settings.registerMenu(CONFIG.gfl5r.namespace, "tactical-grid-settings", {
        name:  "gfl5r.tactical_grid.settings.title",
        label: "gfl5r.tactical_grid.settings.label",
        hint:  "gfl5r.tactical_grid.settings.hint",
        icon: "fa-solid fa-table-layout",
        type: TacticalGridSettingsGFL5R
    });
};
