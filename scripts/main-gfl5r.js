// Import Commons Modules
import { GFL5R } from "./config.js";
import { HelpersGfl5r } from "./helpers.js";
import { SocketHandlerGfl5r } from "./socket-handler.js";
import { RegisterSettings } from "./settings.js";
import { PreloadTemplates } from "./preloadTemplates.js";
import { RegisterHandlebars } from "./handlebars.js";
import HooksGfl5r from "./hooks.js";
// Actors
import { ActorGfl5r } from "./actor.js";
import { CharacterSheetGfl5r } from "./actors/character-sheet.js";
import { NpcSheetGfl5r } from "./actors/npc-sheet.js";
import { RulerGfl5r, TokenRulerGfl5r } from "./tatical-grid-rulers.js";
// Dice and rolls
import { Gfl5rBaseDie } from "./dice/dietype/gfl5r-base-die.js";
import { SkillDie } from "./dice/dietype/ability-die.js";
import { ApproachDie } from "./dice/dietype/ring-die.js";
import { RollGfl5r } from "./dice/roll.js";
import { DicePickerDialog } from "./dice/dice-picker-dialog.js";
import { RollnKeepDialog } from "./dice/roll-n-keep-dialog.js";
import { CombatGfl5r } from "./combat.js";
// Items
import { ItemGfl5r } from "./item.js";
import { ItemSheetGfl5r } from "./items/item-sheet.js";
import { ArmorSheetGfl5r } from "./items/armor-sheet.js";
import { WeaponSheetGfl5r } from "./items/weapon-sheet.js";
import { TechniqueSheetGfl5r } from "./items/technique-sheet.js";
import { PeculiaritySheetGfl5r } from "./items/peculiarity-sheet.js";
import { DisciplineSheetGfl5r } from "./items/discipline-sheet.js";
// JournalEntry
import { JournalGfl5r } from "./journal.js";
import { BaseJournalSheetGfl5r } from "./journals/base-journal-sheet.js";
// Compendium
import { CompendiumDirectoryGfl5r } from "./compendium/gfl5r-compendium-directory.js";
// GM Tools
import { GmToolbox } from "./gm/gm-toolbox.js";
import { GmMonitor } from "./gm/gm-monitor.js";
import { Storage } from "./storage.js";
import { MigrationGfl5r } from "./migration.js";
// Misc
import { Gfl5rHtmlMultiSelectElement } from "./misc/gfl5r-multiselect.js";
import { GFL5RHtmlComboBoxElement } from "./misc/gfl5r-combo-box.js";

window.customElements.define(Gfl5rHtmlMultiSelectElement.tagName, Gfl5rHtmlMultiSelectElement);
window.customElements.define(GFL5RHtmlComboBoxElement.tagName, GFL5RHtmlComboBoxElement);

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
Hooks.once("init", async () => {
    console.log(
        "   ___ _____ _    ___  ___\n" +
            "  / __|  ___| |  | __|| _ \\\n" +
            " | (_ | |_  | |__|__ ||   /\n" +
            "  \\___|_|   |____|___/|_|_\\\n" +
            " "
    );

    // Global config
    CONFIG.gfl5r = GFL5R;

    // Sidebar icons
    CONFIG.ChatMessage.sidebarIcon = "gfl5r chatIcon";
    CONFIG.Combat.sidebarIcon = "gfl5r combatIcon";
    CONFIG.Scene.sidebarIcon = "gfl5r sceneIcon";
    CONFIG.Actor.sidebarIcon = "gfl5r actorIcon";
    CONFIG.Item.sidebarIcon = "gfl5r itemIcon";
    CONFIG.JournalEntry.sidebarIcon = "gfl5r journalIcon";
    CONFIG.RollTable.sidebarIcon = "gfl5r rolltableIcon";
    CONFIG.Playlist.sidebarIcon = "gfl5r playlistIcon";
    CONFIG.Cards.sidebarIcon += " gfl5r cardsIcon";
    CONFIG.Macro.sidebarIcon += " gfl5r macroIcon";

    foundry.applications.sidebar.Sidebar.TABS.compendium.icon = "gfl5r compendiumIcon";
    foundry.applications.sidebar.Sidebar.TABS.settings.icon = "gfl5r settingsIcon";

    // Document classes
    CONFIG.Combat.documentClass = CombatGfl5r;
    CONFIG.Actor.documentClass = ActorGfl5r;
    CONFIG.Item.documentClass = ItemGfl5r;
    CONFIG.JournalEntry.documentClass = JournalGfl5r;
    CONFIG.Token.rulerClass = TokenRulerGfl5r;
    CONFIG.Canvas.rulerClass = RulerGfl5r;

    CONFIG.ui.compendium = CompendiumDirectoryGfl5r;

    // Custom Roll class
    CONFIG.Dice.rolls.unshift(RollGfl5r);

    // Custom DiceTerms
    CONFIG.Dice.terms[SkillDie.DENOMINATION] = SkillDie;
    CONFIG.Dice.terms[ApproachDie.DENOMINATION] = ApproachDie;

    // Game namespace
    game.gfl5r = {
        Gfl5rBaseDie,
        ApproachDie,
        SkillDie,
        HelpersGfl5r,
        ItemGfl5r,
        JournalGfl5r,
        RollGfl5r,
        ActorGfl5r,
        DicePickerDialog,
        RollnKeepDialog,
        GmToolbox,
        GmMonitor,
        storage: new Storage(),
        sockets: new SocketHandlerGfl5r(),
        migrations: MigrationGfl5r,
    };

    // Register settings, handlebars, templates
    RegisterSettings();
    RegisterHandlebars();
    PreloadTemplates().then(() => {});

    // ***** Register sheets *****
    const fdc = foundry.documents.collections;
    const fav1s = foundry.appv1.sheets;

    // Actors
    fdc.Actors.unregisterSheet("core", fav1s.ActorSheet);
    fdc.Actors.registerSheet(GFL5R.namespace, CharacterSheetGfl5r, {
        types: ["character"],
        label: "TYPES.Actor.character",
        makeDefault: true,
    });
    fdc.Actors.registerSheet(GFL5R.namespace, NpcSheetGfl5r, {
        types: ["npc"],
        label: "TYPES.Actor.npc",
        makeDefault: true,
    });

    // Items
    fdc.Items.unregisterSheet("core", fav1s.ItemSheet);
    fdc.Items.registerSheet(GFL5R.namespace, TechniqueSheetGfl5r, {
        types: ["technique"],
        label: "TYPES.Item.technique",
        makeDefault: true,
    });
    fdc.Items.registerSheet(GFL5R.namespace, WeaponSheetGfl5r, {
        types: ["weaponry"],
        label: "TYPES.Item.weaponry",
        makeDefault: true,
    });
    fdc.Items.registerSheet(GFL5R.namespace, ArmorSheetGfl5r, {
        types: ["armor"],
        label: "TYPES.Item.armor",
        makeDefault: true,
    });
    fdc.Items.registerSheet(GFL5R.namespace, PeculiaritySheetGfl5r, {
        types: ["narrative"],
        label: "TYPES.Item.narrative",
        makeDefault: true,
    });
    fdc.Items.registerSheet(GFL5R.namespace, ItemSheetGfl5r, {
        types: ["item"],
        label: "TYPES.Item.item",
        makeDefault: true,
    });
    // Discipline sheet
    fdc.Items.registerSheet(GFL5R.namespace, DisciplineSheetGfl5r, {
        types: ["discipline"],
        label: "TYPES.Item.discipline",
        makeDefault: true,
    });
    // New GFL5R types: module, condition, vehicle
    // These will use generic item sheets until their dedicated sheets are built
    fdc.Items.registerSheet(GFL5R.namespace, ItemSheetGfl5r, {
        types: ["module", "condition", "vehicle"],
        label: "TYPES.Item.item",
        makeDefault: true,
    });

    // Journal
    fdc.Journal.unregisterSheet("core", fav1s.JournalSheet);
    fdc.Journal.registerSheet(GFL5R.namespace, BaseJournalSheetGfl5r, {
        label: "TYPES.Journal.journal",
        makeDefault: true,
    });

    // Override enrichHTML for Symbol replacement
    const oldEnrichHTML = foundry.applications.ux.TextEditor.implementation.prototype.constructor.enrichHTML;
    foundry.applications.ux.TextEditor.implementation.prototype.constructor.enrichHTML = async function (content, options = {}) {
        return HelpersGfl5r.convertSymbols(await oldEnrichHTML.call(this, content, options), true);
    };

    // Override the default Token _drawBar function to allow fatigue bar reversing.
    foundry.canvas.placeables.Token.prototype._drawBar = function (number, bar, data) {
        const barSettings = game.settings.get(GFL5R.namespace, "token-reverse-token-bars");
        const reverseBar = barSettings === 'both' || barSettings === data.attribute;

        const pct = Math.clamp(Number(data.value), 0, data.max) / data.max;

        let color = number === 0 ? [pct / 1.2, 1 - pct, 0] : [0.5 * pct, 0.7 * pct, 0.5 + pct / 2];

        // Red if compromised
        if (data.attribute === "strife" && data.value > data.max) {
            color = [1, 0.1, 0.1];
        }

        let h = Math.max(canvas.dimensions.size / 12, 8);
        if (this.height >= 2) {
            h *= 1.6;
        }

        bar.clear()
            .beginFill(0x000000, 0.5)
            .lineStyle(2, 0x000000, 0.9)
            .drawRoundedRect(0, 0, this.w, h, 3)
            .beginFill(PIXI.utils.rgb2hex(color), 0.8)
            .lineStyle(1, 0x000000, 0.8)
            .drawRoundedRect(1, 1, (reverseBar ? 1 - pct : pct) * (this.w - 2), h - 2, 2);

        bar.position.set(0, number === 0 ? this.h - h : 0);
    };
});

/* ------------------------------------ */
/* Hooks Once                           */
/* ------------------------------------ */
Hooks.once("setup", HooksGfl5r.setup);
Hooks.once("ready", HooksGfl5r.ready);
Hooks.once("init", HooksGfl5r.init);
Hooks.once("diceSoNiceReady", (dice3d) => HooksGfl5r.diceSoNiceReady(dice3d));

/* ------------------------------------ */
/* Hooks On                             */
/* ------------------------------------ */
Hooks.on("renderSidebarTab", (app, html, data) => HooksGfl5r.renderSidebarTab(app, html, data));
Hooks.on("activateSettings", async (app)=> HooksGfl5r.activateSettings(app));
Hooks.on("renderChatMessageHTML", (message, html, data) => HooksGfl5r.renderChatMessage(message, html, data));
Hooks.on("renderCombatTracker", (app, html, data) => HooksGfl5r.renderCombatTracker(app, html, data));
Hooks.on("diceSoNiceRollStart", (messageId, context) => HooksGfl5r.diceSoNiceRollStart(messageId, context));
