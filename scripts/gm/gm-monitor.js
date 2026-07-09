import { Gfl5rPopupManager } from '../misc/gfl5r-popup-manager.js';

const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const ApplicationV2 = foundry.applications.api.ApplicationV2;

export class GmMonitor extends HandlebarsApplicationMixin(ApplicationV2) {
    /** @override ApplicationV2 */
    static get DEFAULT_OPTIONS() {
        return {
            id: "gfl5r-gm-monitor",
            tag: "div",
            window: {
                contentClasses: ["gfl5r", "gm-monitor"],
                title: "gfl5r.gm.monitor.title",
                minimizable: true,
                controls: [
                    {
                        label: game.i18n.localize("gfl5r.gm.monitor.add_selected_tokens"),
                        icon: "fas fa-users",
                        action: "add_selected_tokens",
                    },
                    {
                        label: game.i18n.localize("gfl5r.gm.monitor.switch_view"),
                        icon: "fas fa-repeat",
                        action: "change_view_tab"
                    }
                ],
                resizable: true,
                editable: true,
            },
            position: {
                width: "600",
                height: "150"
            },
            actions: {
                add_selected_tokens: GmMonitor.#addSelectedTokens,
                change_view_tab: GmMonitor.#rotateViewTab,
                remove_actor: GmMonitor.#removeActor,
                toggle_prepared: GmMonitor.#togglePrepared,
                change_stance: {
                    buttons: [0, 2],
                    handler: GmMonitor.#changeStance,
                },
                modify_fatigue: {
                    buttons: [0, 1, 2],
                    handler: GmMonitor.#modifyFatigue,
                },
                modify_strife: {
                    buttons: [0, 1, 2],
                    handler: GmMonitor.#modifyStrife,
                },
                modify_voidPoint: {
                    buttons: [0, 1, 2],
                    handler: GmMonitor.#modifyVoidPoint,
                },
                modify_casualties: {
                    buttons: [0, 1, 2],
                    handler: GmMonitor.#modifyCasualties,
                },
                modify_panic: {
                    buttons: [0, 1, 2],
                    handler: GmMonitor.#modifyPanic,
                }
            },
            dragDrop: [{ dragSelector: null, dropSelector: null }],
        }
    };

    /** @override HandlebarsApplicationMixin */
    static PARTS = {
        hidden_tabs: {
            template: "templates/generic/tab-navigation.hbs"
        },
        character: {
            id: "character",
            template: "systems/gfl5r/templates/" + "gm/monitor/character-view.html"
        },
    };

    /**
     * @type {Record<string, string>}
     * @override ApplicationV2
     */
    tabGroups = {
        view: "character"
    };

    /**
     * Data that is pushed to html
     */
    context = {
        actors: []
    }

    /**
     * hooks we act upon, saved since we need to remove them when this window is not open
     */
    #hooks = [];

    /**
     * The DragDrop instance which handles interactivity resulting from DragTransfer events.
     * @type {DragDrop}
     */
    #dragDrop;

    constructor() {
        super();
        this.#initialize();
    }

    /** @override ApplicationV2 */
    async _preClose(options) {
        await super._preClose(options);
        options.animate = false;

        for (const hook of this.#hooks) {
            Hooks.off(hook.hook, hook.fn);
        }
    }

    /** @override ApplicationV2 */
    async _onRender(context, options) {
        await super._onRender(context, options);

        // Todo: Move this to common gfl5r application v2
        game.gfl5r.HelpersGfl5r.commonListeners($(this.element));

        this.#dragDrop = new foundry.applications.ux.DragDrop.implementation({
          dragSelector: null,
          dropSelector: null,
          callbacks: {
            drop: this.#onDrop.bind(this)
          }
        }).bind(this.element);

        // Tooltips
        new Gfl5rPopupManager(
            $(this.element).find(".actor-infos-control"),
            async (event) => {
                const type = $(event.currentTarget).data("type");
                if (!type) return;
        
                if (type === "text") {
                    return $(event.currentTarget).data("text");
                }
        
                const uuid = $(event.currentTarget).data("actor-uuid");
                if (!uuid) return;
        
                const actor = this.context.actors.find(actor => actor.uuid === uuid);
                if (!actor) return;
        
                switch (type) {
                    case "armors":
                        return this.#getTooltipArmors(actor);
                    case "weapons":
                        return this.#getTooltipWeapons(actor);
                    case "global":
                        return this.#getTooltipGlobal(actor);
                }
            }
        );

        // Apply global interface theme if it is set
        if (!this.options.classes.includes("themed")) {
            this.element.classList.remove("theme-light", "theme-dark");
            const {colorScheme} = game.settings.get("core", "uiConfig");
            if (colorScheme.interface) {
                this.element.classList.add("themed", `theme-${colorScheme.interface}`);
            }
        }
    }

    /** @override ApplicationV2 */
    async _prepareContext() {
        return {
            tabs: this.getTabs(),
        }
    }

    /**
     * @param {string} partId                         The part being rendered
     * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
     * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
     *
     * @override HandlebarsApplicationMixin
     */
    async _preparePartContext(partId, context) {
        switch (partId) {
            case "character":
                break;
        }
        return context;
    }

    /**
     * Prepare an array of form header tabs.
     * @returns {Record<string, Partial<ApplicationTab>>}
     */
    getTabs() {
        const tabs = {
            character: { id: "character", group: "view", icon: "fa-solid fa-tag", label: "REGION.SECTIONS.identity" },
        }
        for (const v of Object.values(tabs)) {
            v.active = this.tabGroups[v.group] === v.id;
            v.cssClass = v.active ? "active" : "";
        }
        return tabs;
    }

    /**
     * Handle dropped data on the Actor sheet
     * @param {DragEvent} event       The originating DragEvent
     */
    async #onDrop(event) {

        if (!this.options.window.editable) {
            return;
        }

        const json = event.dataTransfer.getData("text/plain");
        if (!json) {
            return;
        }

        const data = JSON.parse(json);
        if (!data || data.type !== "Actor" || !data.uuid || !!this.context.actors.find((a) => a.uuid === data.uuid)) {
            return;
        }

        const actor = fromUuidSync(data.uuid);
        if (!actor) {
            return;
        }

        // Switch to character view
        this.changeTab("character", "view");

        this.context.actors.push(actor);

        return this.saveActorsIds();
    }

    /** required for updating via our socket implementation game.gfl5r.HelpersGfl5r.refreshLocalAndSocket("gfl5r-gm-monitor")*/
    async refresh() {
        this.render();
    }

    /**
     * Save the actors ids in setting
     * @private
     */
    async saveActorsIds() {
        return game.settings.set(
            CONFIG.gfl5r.namespace,
            "gm-monitor-actors",
            this.context.actors.map((a) => a.uuid)
        );
    }

    #initialize() {
        let actors;
        const uuidList = game.settings.get(CONFIG.gfl5r.namespace, "gm-monitor-actors");
        if (uuidList.length > 0) {
            // Get actors from stored uuids
            actors = uuidList
                .map(uuid => {
                    const doc = fromUuidSync(uuid);
                    if (doc instanceof TokenDocument) {
                        return doc.actor;
                    }
                    return doc;
                })
                .filter(actor => !!actor); // skip null

        } else {
            // If empty add pc with owner
            actors = game.actors.filter((actor) => actor.isCharacter && actor.hasPlayerOwnerActive);
            this.saveActorsIds();
        }

        // Sort by name asc
        actors.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        this.context.actors = actors;

        this.#hooks.push({
            hook: "updateActor",
            fn: Hooks.on("updateActor", (actor) => this.#onUpdateActor(actor))
        });
        this.#hooks.push({
            hook: "updateSetting",
            fn: Hooks.on("updateSetting", (actor) => this.#onUpdateSetting(actor))
        });
    }

    /**
     * Switch between the available views in sequence
     */
    static #rotateViewTab() {
        const tabArray = Object.values(this.getTabs());
        const activeTabIndex = tabArray.findIndex((tab) => tab.active);
        const nextTabIndex = activeTabIndex + 1 < tabArray.length ? activeTabIndex + 1 : 0;
        this.changeTab(tabArray[nextTabIndex].id, tabArray[nextTabIndex].group)
    }

    /**
     * Add selected token on monitor if not already present
     */
    static #addSelectedTokens() {
        if (canvas.tokens.controlled.length > 0) {
            const actors2Add = canvas.tokens.controlled
                .map(t => t.actor)
                .filter(t => !!t && !this.context.actors.find((a) => a.uuid === t.uuid));

            if (actors2Add.length < 1) {
                return;
            }

            this.context.actors = [
                ...this.context.actors,
                ...actors2Add
            ];
            this.saveActorsIds();
        }
    }

    /**
     * Update baseValue based on the type of event
     * @param {Int} baseValue   The Base value we can to modify
     * @param {Int} whichButton  The type of click made
     */
    static #newValue(baseValue, whichButton) {
        switch (whichButton) {
            case 0:   //Left click
                return Math.max(0, baseValue + 1);
            case 1:   //Middle click
                return 0;
            case 2:   //Right click
                return Math.max(0, baseValue - 1);
        }
    }

    /**
     * @param {HTMLElement} target Html target to get actor information from
     */
    static async #getActorValidated(target) {
        const uuid = $(target).data("actor-uuid");
        if (!uuid) {
            console.warn("GFL5R | GMM | actor uuid not set", type);
            return {isValid: false, actor: null};
        }
        const actor = await fromUuid(uuid);
        if (!actor) {
            console.warn("GFL5R | GMM | Actor not found", type);
            return {isValid: false, actor: null};
        }
        return {isValid:true, actor: actor};
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #modifyCasualties(event, target) {
        const {isValid, actor} = await GmMonitor.#getActorValidated(target);
        if (!isValid) {
            return;
        }

        const casualties_strength = actor.system.battle_readiness.casualties_strength.value;
        return actor.update({
            system: {
                battle_readiness: {
                    casualties_strength: {
                        value: GmMonitor.#newValue(casualties_strength, event.button),
                    }
                },
            },
        });
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #modifyPanic(event, target) {
        const {isValid, actor} = await GmMonitor.#getActorValidated(target);
        if (!isValid) {
            return;
        }

        const panic_discipline = actor.system.battle_readiness.panic_discipline.value;
        return actor.update({
            system: {
                battle_readiness: {
                    panic_discipline: {
                        value: GmMonitor.#newValue(panic_discipline, event.button),
                    }
                },
            },
        });
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #togglePrepared(event, target) {
        const {isValid, actor} = await GmMonitor.#getActorValidated(target);
        if (!isValid) {
            return;
        }

        return actor.update({
            system: {
                prepared: !actor.system.prepared
            }
        });
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #changeStance(event, target) {
        const {isValid, actor} = await GmMonitor.#getActorValidated(target);
        if (!isValid) {
            return;
        }

        let stanceIdx = CONFIG.gfl5r.stances.findIndex((stance) => stance === actor.system.stance) + (event.button === 0 ? 1 : -1);
        if (stanceIdx < 0) {
            stanceIdx = CONFIG.gfl5r.stances.length - 1;
        } else if (stanceIdx > CONFIG.gfl5r.stances.length - 1) {
            stanceIdx = 0;
        }

        return actor.update({
            system: {
                stance: CONFIG.gfl5r.stances[stanceIdx]
            },
        });
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #modifyFatigue(event, target) {
        const {isValid, actor} = await GmMonitor.#getActorValidated(target);
        if (!isValid) {
            return;
        }

        const fatigue = actor.system.fatigue.value;
        return actor.update({
            system: {
                fatigue: {
                    value: GmMonitor.#newValue(fatigue, event.button)
                }
            }
        });
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #modifyStrife(event, target) {
        const {isValid, actor} = await GmMonitor.#getActorValidated(target);
        if (!isValid) {
            return;
        }

        const strife = actor.system.strife.value;
        return actor.update({
            system: {
                strife: {
                    value: GmMonitor.#newValue(strife, event.button),
                },
            },
        });
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #modifyVoidPoint(event, target) {
        const {isValid, actor} = await GmMonitor.#getActorValidated(target);
        if (!isValid) {
            return;
        }

        const fortune_points = actor.system.fortune_points.value;
        const fortune_points_max = actor.system.fortune_points.max;
        return actor.update({
            system: {
                fortune_points: {
                    value: Math.min(
                            fortune_points_max,
                            GmMonitor.#newValue(fortune_points, event.button)
                    ),
                },
            },
        });
    }

    /**
     * @param {PointerEvent} event      The originating click event
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action]
     */
    static async #removeActor(event, target) {
        const uuid = $(target).data("actor-uuid");
        if (!uuid) {
            return;
        }

        this.context.actors = this.context.actors.filter((actor) => actor.uuid !== uuid);
        return this.saveActorsIds();
    }

    /**
     * Get armors information for this actor
     * @param {ActorGfl5r} actor
     * @return {string}
     * @private
     */
    async #getTooltipArmors(actor) {
        // Equipped Armors
        const armors = actor.items
            .filter((item) => item.type === "armor" && item.system.equipped)
            .map(
                (item) =>
                    item.name +
                    ` (<i class="fas fa-tint">${item.system.armor.physical}</i>` +
                    ` / <i class="fas fa-bolt">${item.system.armor.supernatural}</i>)`
            );

        // *** Template ***
        return foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}gm/monitor/tooltips/armors.html`, {
            armors,
        });
    }

          /**
     * Get weapons information for this actor
     * @param {ActorGfl5r} actor
     * @return {string}
     * @private
     */
    async #getTooltipWeapons(actor) {
        const display = (weapon) => {
            return (
                weapon.name +
                ` (<i class="fas fa-arrows-alt-h"> ${weapon.system.range}</i>` +
                ` / <i class="fas fa-tint"> ${weapon.system.damage}</i>` +
                ` / <i class="fas fa-skull"> ${weapon.system.deadliness}</i>)`
            );
        };

        // Readied Weapons
        const equippedWeapons = actor.items.filter((item) => item.type === "weapon" && item.system.equipped);

        const readied = equippedWeapons
            .filter((weapon) => !!weapon.system.readied)
            .map((weapon) => display(weapon));

        // Equipped Weapons
        const sheathed = equippedWeapons
            .filter((weapon) => !weapon.system.readied)
            .map((weapon) => display(weapon));

        // *** Template ***
        return foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}gm/monitor/tooltips/weapons.html`, {
            readied,
            sheathed,
        });
    }

          /**
     * Get tooltips information for this character
     * @param {ActorGfl5r} actor
     * @return {string}
     * @private
     */
    async #getTooltipGlobal(actor) {
        const actorData = (await actor.sheet?.getData()?.data) || actor;

        // Peculiarities
        const Peculiarities = actor.items.filter((e) => e.type === "peculiarity");
        const advantages = Peculiarities
            .filter((item) => ["distinction", "passion"].includes(item.system.peculiarity_type))
            .map((item) => item.name)
            .join(", ");
        const disadvantages = Peculiarities
            .filter((item) => ["adversity", "anxiety"].includes(item.system.peculiarity_type))
            .map((item) => item.name)
            .join(", ");

        // *** Template ***
        return foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}gm/monitor/tooltips/global.html`, {
            actorData: actorData,
            advantages: advantages,
            disadvantages: disadvantages,
            suffix: actorData.system.template === "pow" ? "_pow" : "",
            actor_type: actor.type,
        });
    }

    /**
     * @param {ActorGfl5r} actor
     * @return {string}
     * @private
     */
    /**
     * @param {ActorGfl5r} actor The actor that is being updated
     */
    #onUpdateActor(actor) {
        if (this.context.actors.includes(actor)) {
            this.render(false);
        }
    }

    /**
     * @param {Setting} setting The setting that is being updated
     */
    #onUpdateSetting(setting) {
        switch (setting.key) {
            case "gfl5r.gm-monitor-actors":
                this.render(false);
                break;
            case "gfl5r.initiative-prepared-character":
            case "gfl5r.initiative-prepared-adversary":
            case "gfl5r.initiative-prepared-minion":
                this.render(false);
                break;
            default:
                return;
        }
    }
}
