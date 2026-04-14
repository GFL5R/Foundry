import { ItemCompendiumGfl5r } from "./compendium/gfl5r-item-compendium.js"

export default class HooksGfl5r {
    /**
     * Do initialization
     */
    static async init() {
        // L5R conditions
        if (game.settings.get(CONFIG.gfl5r.namespace, "show-all-status-effects")) {
            // Add L5R conditions to foundry conditions (don't restrict users)
            CONFIG.statusEffects.push(...CONFIG.gfl5r.conditions);
        } else {
            // L5R conditions only
            CONFIG.statusEffects = CONFIG.gfl5r.conditions;
        }
    }

    /**
     * Do anything after initialization but before ready
     */
    static setup() {
        // Enable embed Babele compendiums only if custom compendium is not found or disabled
        if (
            game.babele &&
            game.babele.modules.every((module) => module.module !== game.settings.get(CONFIG.gfl5r.namespace, "custom-compendium-name"))
        ) {
            game.babele.setSystemTranslationsDir("babele"); // Since Babele v2.0.7
        }

        ItemCompendiumGfl5r.applyToPacks();
    }

    /**
     * Do anything once the system is ready
     */
    static async ready() {
        // If multiple GM connected, tag the 1st alive, useful for some traitements that need to be done once (migration, delete...)
        Object.defineProperty(game.user, "isFirstGM", {
            get: function () {
                return game.user.isGM && game.user.id === game.users.find((u) => u.active && u.isGM)?.id;
            },
        });

        // Migration stuff
        if (game.user.isFirstGM && game.gfl5r.migrations.needUpdate(game.gfl5r.migrations.NEEDED_VERSION)) {
            game.gfl5r.migrations.migrateWorld({ force: false }).then();
        }

        // Taken from dnd5 : Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
        Hooks.on("hotbarDrop", (bar, data, slot) => {
            if (data.type === "Item") {
                HooksGfl5r.#createItemMacro(data, slot);
                return false;
            }
        });

        // For some reason, not always really ready, so wait a little
        await new Promise((r) => setTimeout(r, 2000));

        // Settings TN and EncounterType
        if (game.user.isGM) {
                new game.gfl5r.GmToolbox().render(true);
        }

        // ***** UI *****
        // If any disclaimer "not translated by Edge"
        const disclaimer = game.i18n.localize("gfl5r.global.edge_translation_disclaimer");
        if (disclaimer !== "" && disclaimer !== "gfl5r.global.edge_translation_disclaimer") {
            ui.notifications.info(disclaimer);
        }

        // Find all additional source references that is not the official ones:
        const references = new Set(Object.keys(CONFIG.gfl5r.sourceReference));
        for(let pack of game.packs) {
            if(pack.metadata.packageType === "system") {
                continue;
            }
            const documents = await pack.getDocuments();
            for(let document of documents) {
                if(document?.system?.source_reference) {
                    references.add(document.system.source_reference.source);
                }
            }
        }
        game.settings.set(CONFIG.gfl5r.namespace, "all-compendium-references", references);
    }

    /**
     * SidebarTab
     */
    static renderSidebarTab(app, html, data) {
        html = $(html); // basic patch for v13

        switch (app.tabName) {
            case "chat":
                // Add DP on dice icon
                html.find(`.chat-control-icon`).on("mousedown", async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    switch (event.which) {
                        case 1:
                            // Left clic - Local DP
                            new game.gfl5r.DicePickerDialog().render();
                            break;
                        case 3:
                            // Right clic - Players DP
                            if (game.user.isGM) {
                                game.gfl5r.HelpersGfl5r.debounce(
                                    "gm-request-dp",
                                    () => {
                                        game.gfl5r.sockets.openDicePicker({
                                            users: game.users.players.filter((u) => u.active && u.hasPlayerOwner),
                                            dpOptions: {
                                                skillsList: "artisan,martial,scholar,social,trade",
                                            },
                                        });
                                        ui.notifications.info("gfl5r.dice.dicepicker.gm_request_dp_to_players", {localize: true});
                                    },
                                    3000,
                                    true
                                )();
                            }
                            break;
                    }
                });

                // Add title on button dice icon
                html.find(".chat-control-icon")[0].title = game.i18n.localize("gfl5r.dice.dicepicker.title");
                break;
            }
    }

    static async activateSettings(app) {
        const html = app.element
        const pip = html.querySelector(".info .system .notification-pip");
        html.querySelector(".info.system.gfl5r")?.remove();

        const section = document.createElement("section");
        section.className = "info system gfl5r";
        const tpl = await foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}settings/logo.html`, {
            SystemVersion: game.system.version
        });
        section.append(foundry.utils.parseHTML(tpl));
        if ( pip ) section.querySelector(".system-info").insertAdjacentElement("beforeend", pip);
        html.querySelector(".info").insertAdjacentElement("afterend", section);
    }

    /**
     * Chat Message
     */
    static renderChatMessage(message, html, data) {
        html = $(html); // basic patch for v13

        if (message.isRoll) {
            // Add an extra CSS class to roll
            html.addClass("roll");
            html.on("click", ".chat-dice-rnk", game.gfl5r.RollnKeepDialog.onChatAction.bind(this));

            // Remove specific elements
            if (game.user.isGM) {
                html.find(".player-only").remove();
            } else {
                html.find(".gm-only").remove();
            }
        }

        // Compendium folder link
        html.find(".compendium-link").on("click", (event) => {
            const packId = $(event.currentTarget).data("pack");
            if (packId) {
                const pack = game.packs.get(packId);
                if (pack) {
                    pack.render(true);
                }
            }
        });
    }

    /**
     * Combat tracker
     */
    static async renderCombatTracker(app, html, data) {
        // Display Combat bar (only for GMs)
        await this._gmCombatBar(app, $(html), data);
    }

    /**
     * Display a GM bar for Combat/Initiative
     * @private
     */
    static async _gmCombatBar(app, html, data) {
        // Only for GMs
        if (!game.user.isGM) {
            return;
        }

        html = $(html); // basic patch for v13

        // *** Conf ***
        const encounterTypeList = Object.keys(CONFIG.gfl5r.initiativeSkills);
        const prepared = {
            character: game.settings.get(CONFIG.gfl5r.namespace, "initiative-prepared-character"),
            adversary: game.settings.get(CONFIG.gfl5r.namespace, "initiative-prepared-adversary"),
            minion: game.settings.get(CONFIG.gfl5r.namespace, "initiative-prepared-minion"),
        };

        // *** Template ***
        const tpl = await foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}gm/combat-tracker-bar.html`, {
            encounterType: game.settings.get(CONFIG.gfl5r.namespace, "initiative-encounter"),
            encounterTypeList,
            prepared,
        });

        // Add/replace in bar
        const elmt = html.find("#gfl5r_gm_combat_tracker_bar");
        if (elmt.length > 0) {
            elmt.replaceWith(tpl);
        } else {
            html.find(".combat-tracker-header").append(tpl);
        }

        // Buttons Listeners
        html.find(".encounter-control").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const encounter = $(event.currentTarget).data("id");
            if (!encounterTypeList.includes(encounter)) {
                return;
            }
            game.settings.set(CONFIG.gfl5r.namespace, "initiative-encounter", encounter);
        });

        html.find(".prepared-control").on("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const preparedId = $(event.currentTarget).data("id");
            if (!Object.hasOwnProperty.call(prepared, preparedId)) {
                return;
            }
            const rev = event.which === 3;
            const nextValue = {
                false: rev ? "true" : "actor",
                true: rev ? "actor" : "false",
                actor: rev ? "false" : "true",
            };
            game.settings.set(CONFIG.gfl5r.namespace, `initiative-prepared-${preparedId}`, nextValue[prepared[preparedId]]);
        });
    }

    /**
     * DiceSoNice - Add L5R DicePresets
     */
    static diceSoNiceReady(dice3d) {
        const texturePath = `${CONFIG.gfl5r.paths.assets}dices/default/3d/`;

        // dice3d.addSystem({
        //     id: "gfl5r",
        //     name: "Legend of the Five Rings 5E"
        // }, "force");

        // Rings
        dice3d.addDicePreset(
            {
                name: "L5R Ring Dice",
                type: "da",
                labels: Object.keys(game.gfl5r.ApproachDie.FACES).map(
                    (e) => `${texturePath}${game.gfl5r.ApproachDie.FACES[e].image.replace("approach_", "")}.png`
                ),
                bumpMaps: Object.keys(game.gfl5r.ApproachDie.FACES).map(
                    (e) => `${texturePath}${game.gfl5r.ApproachDie.FACES[e].image.replace("approach_", "")}_bm.png`
                ),
                colorset: "black",
                system: "standard",
            },
            "d6"
        );

        // Skills
        dice3d.addDicePreset(
            {
                name: "L5R Skill Dice",
                type: "ds",
                labels: Object.keys(game.gfl5r.AbilityDie.FACES).map(
                    (e) => `${texturePath}${game.gfl5r.AbilityDie.FACES[e].image.replace("skill_", "")}.png`
                ),
                bumpMaps: Object.keys(game.gfl5r.AbilityDie.FACES).map(
                    (e) => `${texturePath}${game.gfl5r.AbilityDie.FACES[e].image.replace("skill_", "")}_bm.png`
                ),
                colorset: "white",
                system: "standard",
            },
            "d12"
        );
    }

    /**
     * DiceSoNice - Do not show 3D roll for the Roll n Keep series
     *
     * @param {string} messageId
     * @param {object} context
     */
    static diceSoNiceRollStart(messageId, context) {
        // In DsN 4.2.1+ the roll is altered in context.
        // So we need to get the original message instead of "context.roll.gfl5r?.history"
        const message = game.messages.get(messageId);
        if (message?.rolls?.[0]?.gfl5r?.history) {
            context.blind = true;
        }
    }

    /**
     * Attempt to create a macro from the dropped data. Will use an existing macro if one exists.
     * @param {object} dropData     The dropped data
     * @param {number} slot         The hotbar slot to use
     * @returns {Promise}
     */
    static async #createItemMacro(dropData, slot) {
        const itemData = await Item.implementation.fromDropData(dropData);
        if (!itemData) {
            console.log("GFL5R | HK | Fail to get itemData", dropData);
            return null;
        }

        const macroData = {
            type: "script",
            scope: "actor",
            name: (itemData.actor?.name ? `${itemData.actor?.name} : ` : '') + itemData.name,
            img: itemData.img,
            command: `await Hotbar.toggleDocumentSheet("${itemData.uuid}")`,
        };

        // Assign the macro to the hotbar
        const macro = game.macros.find((m) =>
                m.name === macroData.name
                && m.command === macroData.command
                && m.isAuthor
            ) || await Macro.create(macroData);

        await game.user.assignHotbarMacro(macro, slot);
    }

    static async createCombatant(document, options, userId) {

        console.log(document, options, userId);

        new game.gfl5r.CombatActions().render(true);
    }
}
