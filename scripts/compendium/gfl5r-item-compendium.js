import { Gfl5rHtmlMultiSelectElement } from "../misc/gfl5r-multiselect.js";

const { Compendium } = foundry.applications.sidebar.apps;

/**
 * Extended Compendium application for GFL5R.
 * Adds source/rank/ring/rarity filters to Item compendiums
 * @extends {Compendium}
 */
export class ItemCompendiumGfl5r extends Compendium {
    /** @override */
    static DEFAULT_OPTIONS = {
        actions: {
            applyPlayerView: ItemCompendiumGfl5r.#onApplyPlayerView,
        },
        window: {
            resizable: true
        }
    };

    /**
     * Our own entry partial which mirrors Foundry's index-partial.hbs structure
     * and appends ring/rarity/rank badges using data from _prepareDirectoryContext.
     *
     * NOTE: We intentionally duplicate Foundry's <li> structure here rather than
     * trying to include their partial, because their partial renders a complete <li>
     * element which cannot be nested or extended from outside. If Foundry ever
     * changes their index-partial.hbs, this file will need updating to match.
     * @override
     */
    static _entryPartial = "systems/gfl5r/templates/" + "compendium/gfl5r-index-partial.html";

    /**
     * Sources present in this specific compendium, populated during _prepareContext.
     * @type {Set<string>}
     */
    #sourcesInThisCompendium = new Set();

    /**
     * Sources unavailable to players based on permission settings.
     * @type {Set<string>}
     */
    #unavailableSourceForPlayersSet = new Set();

    /**
     * Whether to hide entries with empty sources from players.
     * @type {boolean}
     */
    #hideEmptySourcesFromPlayers = false;

    /**
     * Which filter UI controls are worth showing.
     * Determined during _prepareContext by checking whether at least two
     * distinct values exist for each filterable property.
     * @type {{ rank: boolean, rarity: boolean, source: boolean, ring: boolean }|null}
     */
    #filtersToShow = null;

    /**
     * Cached active filter values, read from the DOM once at the start of
     * each filter pass in #reapplyFilters and held for _onMatchSearchEntry
     * to consume per-entry without re-querying the DOM.
     * @type {{ userFilter: string[], rankFilter: string[], ringFilter: string[], rarityFilter: string[] }}
     */
    #activeFilters = {
        userFilter: [],
        rankFilter: [],
        ringFilter: [],
        rarityFilter: [],
    };

    /**
     * Insert the filter part between header and directory by composing with
     * the parent parts rather than replacing them, so future Foundry changes
     * to Compendium.PARTS are picked up automatically.
     * @override
     */
    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);

        const ordered = {};
        for (const [key, value] of Object.entries(parts)) {
            ordered[key] = value;
            if (key === "header") {
                ordered.filter = {
                    template: `${CONFIG.gfl5r.paths.templates}compendium/filter-bar.html`,
                };
            }
        }

        return ordered;
    }

    /**
     * @override
     */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        this.#sourcesInThisCompendium = new Set();
        this.#resolvePermissions();
        this.#filtersToShow = this.#computeFilterVisibility();
        return context;
    }

    /* -------------------------------------------- */

    /**
     * @override
     */
    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        if (partId === "filter") {
            const ns = CONFIG.gfl5r.namespace;
            const allCompendiumReferencesSet = game.settings.get(ns, "all-compendium-references");
            const hideDisabledOptions = game.settings.get(ns, "compendium-hide-disabled-sources");

            context.filtersToShow = this.#filtersToShow;
            context.ranks = [1, 2, 3, 4, 5];
            context.rarities = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            context.rings = ["fire", "water", "earth", "air", "void"];
            context.hideDisabledOptions = hideDisabledOptions;
            context.showPlayerView = game.user.isGM && this.#unavailableSourceForPlayersSet.size > 0;

            // Source multiselect options — plain data for {{selectOptions}} in the template.
            context.sources = [...allCompendiumReferencesSet].map((reference) => ({
                value: reference,
                label: CONFIG.gfl5r.sourceReference[reference]?.label ?? reference,
                translate: true,
                group:
                    CONFIG.gfl5r.sourceReference[reference]?.type.split(",")[0] ??
                    "gfl5r.multiselect.sources_categories.others",
                disabled:
                    !this.#sourcesInThisCompendium.has(reference) ||
                    (!game.user.isGM && this.#unavailableSourceForPlayersSet.has(reference)),
            }));
        }

        if (partId === "directory") {
            context.entryFilterData = Object.fromEntries(
                [...this.collection.index.values()].map((entry) => [
                    entry._id,
                    {
                        rank: entry.system?.rank,
                        ring: entry.system?.ring,
                        rarity: entry.system?.rarity,
                    },
                ])
            );
        }

        return context;
    }

    /**
     * @override
     */
    async _onRender(context, options) {
        await super._onRender(context, options);

        if (options.parts.includes("filter")) {
            this.#bindButtonFilter(".rank-filter");
            this.#bindButtonFilter(".rarity-filter");
            this.#bindButtonFilter(".ring-filter");
            this.#bindSourceFilter();
        }

        // Reapply filters whenever the filter controls or the entry list changes.
        if (options.parts.some((p) => p === "filter" || p === "directory")) {
            this.#reapplyFilters();
        }
    }

    /* -------------------------------------------- */

    /**
     * @override
     */
    _preSyncPartState(partId, newElement, priorElement, state) {
        super._preSyncPartState(partId, newElement, priorElement, state);

        if (partId === "filter") {
            state.selectedRanks = [...priorElement.querySelectorAll(".rank-filter .selected")].map((element) => element.dataset.rank);
            state.selectedRarities = [...priorElement.querySelectorAll(".rarity-filter .selected")].map((element) => element.dataset.rarity);
            state.selectedRings = [...priorElement.querySelectorAll(".ring-filter .selected")].map((element) => element.dataset.ring);
            state.sourceValue = priorElement.querySelector("gfl5r-multi-select")?.value;
        }
    }

    /**
     * Restore filter selections after the filter part has been re-rendered.
     * The [data-clear] button visibility is derived from whether any values
     * were restored — no extra state needed.
     * @override
     */
    _syncPartState(partId, newElement, priorElement, state) {
        super._syncPartState(partId, newElement, priorElement, state);

        if (partId === "filter") {
            for (const rank of state.selectedRanks ?? []) {
                newElement.querySelector(`.rank-filter [data-rank="${rank}"]`)?.classList.add("selected");
            }
            const rankClear = newElement.querySelector(".rank-filter [data-clear]");
            if (rankClear) {
                rankClear.style.display = state.selectedRanks?.length ? "" : "none";
            }

            for (const rarity of state.selectedRarities ?? []) {
                newElement.querySelector(`.rarity-filter [data-rarity="${rarity}"]`)?.classList.add("selected");
            }
            const rarityClear = newElement.querySelector(".rarity-filter [data-clear]");
            if (rarityClear) {
                rarityClear.style.display = state.selectedRarities?.length ? "" : "none";
            }

            for (const ring of state.selectedRings ?? []) {
                newElement.querySelector(`.ring-filter [data-ring="${ring}"]`)?.classList.add("selected");
            }
            const ringClear = newElement.querySelector(".ring-filter [data-clear]");
            if (ringClear) {
                ringClear.style.display = state.selectedRings?.length ? "" : "none";
            }

            if (state.sourceValue) {
                const multiSelect = newElement.querySelector("gfl5r-multi-select");
                if (multiSelect) {
                    multiSelect.value = state.sourceValue;
                }
            }
        }
    }

    /**
     * @override
     */
    _onMatchSearchEntry(query, entryIds, entry, options) {
        super._onMatchSearchEntry(query, entryIds, entry, options);
        if (entry.style.display === "none") {
            return;
        }
        this.#applyEntryFilter(entry);
    }

    /**
     * Snapshot active filter state then re-run the search filter (or walk entries directly as fallback).
     * @private
     */
    #reapplyFilters() {
        this.#refreshActiveFilters();

        const searchFilter = this._searchFilters?.[0];
        if (searchFilter) {
            searchFilter.filter(null, searchFilter.query);
            return;
        }

        // Fallback
        for (const entry of this.element.querySelectorAll(".directory-item")) {
            this.#applyEntryFilter(entry);
        }
    }

    /**
     * Read current filter selections from the DOM and cache them in #activeFilters.
     * @private
     */
    #refreshActiveFilters() {
        const filterElement = this.element.querySelector("[data-application-part=\"filter\"]");
        const multiSelect = filterElement?.querySelector("gfl5r-multi-select");

        const collectSelected = (containerSelector, dataKey) =>
            [...(filterElement?.querySelectorAll(`${containerSelector} .selected`) ?? [])]
                .map((element) => element.dataset[dataKey])
                .filter(Boolean);

        this.#activeFilters = {
            userFilter: multiSelect?.value ?? [],
            rankFilter: collectSelected(".rank-filter", "rank"),
            ringFilter: collectSelected(".ring-filter", "ring"),
            rarityFilter: collectSelected(".rarity-filter", "rarity"),
        };
    }

    /**
     * Apply all active filters to a single directory entry, showing or hiding it accordingly.
     * @param {HTMLElement} entry
     * @private
     */
    #applyEntryFilter(entry) {
        const indexEntry = this.collection.index.get(entry.dataset.entryId);
        if (!indexEntry) {
            return;
        }

        const system = indexEntry.system;
        const lineSource = system?.source_reference?.source ?? null;
        const { userFilter, rankFilter, ringFilter, rarityFilter } = this.#activeFilters;
        let shouldShow = true;

        const sourceUnavailable =
            (lineSource && this.#unavailableSourceForPlayersSet.has(lineSource)) ||
            (lineSource === "" && this.#hideEmptySourcesFromPlayers);

        if (sourceUnavailable) {
            if (game.user.isGM) {
                entry.classList.add("not-for-players");
                entry.dataset.tooltip = game.i18n.localize("gfl5r.compendium.not_for_players");
            } else {
                shouldShow = false;
            }
        }

        if (rankFilter.length) {
            shouldShow &&= rankFilter.includes(String(system?.rank));
        }
        if (rarityFilter.length) {
            shouldShow &&= rarityFilter.includes(String(system?.rarity));
        }
        if (ringFilter.length) {
            shouldShow &&= ringFilter.includes(system?.ring);
        }
        if (userFilter.length) {
            shouldShow &&= userFilter.includes(lineSource);
        }

        entry.style.display = shouldShow ? "" : "none";
    }

    /**
     * Iterate the compendium index to:
     *   1. Populate #sourcesInThisCompendium for source filter options
     *   2. Determine which filter controls have enough distinct values to show
     * @returns {{ rank: boolean, rarity: boolean, source: boolean, ring: boolean }}
     * @private
     */
    #computeFilterVisibility() {
        const filtersToShow = { rank: false, rarity: false, source: true, ring: false };
        const firstSeen = { rank: null, rarity: null, ring: null };

        const markIfDistinct = (prop, value) => {
            if (filtersToShow[prop] || value === undefined || value === null) {
                return;
            }
            if (firstSeen[prop] === null) {
                firstSeen[prop] = value;
            } else if (firstSeen[prop] !== value) {
                filtersToShow[prop] = true;
            }
        };

        for (const entry of this.collection.index.values()) {
            const sys = entry.system;
            if (!sys) {
                continue;
            }
            if (sys.rank !== undefined) {
                markIfDistinct("rank", sys.rank);
            }
            if (sys.ring !== undefined) {
                markIfDistinct("ring", sys.ring);
            }
            if (sys.rarity !== undefined) {
                markIfDistinct("rarity", sys.rarity);
            }
            if (sys.source_reference?.source !== undefined) {
                this.#sourcesInThisCompendium.add(sys.source_reference.source);
            }
        }

        return filtersToShow;
    }

    /**
     * Resolve which sources are restricted from players and cache the result
     * in instance-level sets for use by #applyEntryFilter.
     * @private
     */
    #resolvePermissions() {
        const ns = CONFIG.gfl5r.namespace;
        const officialSet = game.settings.get(ns, "compendium-official-content-for-players");
        const unofficialSet = game.settings.get(ns, "compendium-unofficial-content-for-players");
        const allRefsSet = game.settings.get(ns, "all-compendium-references");

        this.#hideEmptySourcesFromPlayers = game.settings.get(ns, "compendium-hide-empty-sources-from-players");

        this.#unavailableSourceForPlayersSet = new Set(
            [...allRefsSet].filter((ref) => {
                if (CONFIG.gfl5r.sourceReference[ref]) {
                    return officialSet.size > 0 ? !officialSet.has(ref) : false;
                }
                return unofficialSet.size > 0 ? !unofficialSet.has(ref) : false;
            })
        );
    }

    /**
     * Bind toggle-selection click handlers to all children of a button filter container.
     * A [data-clear] element at the end of the container acts as an inline reset:
     *   - It is hidden (display:none in the template) when no values are selected.
     *   - It becomes visible as soon as any value is selected.
     *   - Clicking it deselects all values and hides itself again.
     * @param {string} containerSelector
     * @private
     */
    #bindButtonFilter(containerSelector) {
        const container = this.element.querySelector(containerSelector);
        if (!container) {
            return;
        }

        const clearButton = container.querySelector("[data-clear]");

        const updateClearButton = () => {
            if (!clearButton) {
                return;
            }
            const anySelected = [...container.children].some(
                (element) => element.dataset.clear === undefined && element.classList.contains("selected")
            );
            clearButton.style.display = anySelected ? "" : "none";
        };

        for (const child of container.children) {
            child.addEventListener("click", (event) => {
                const target = event.currentTarget;

                if (target.dataset.clear !== undefined) {
                    // Clicked the clear button — deselect all value elements
                    for (const element of container.children) {
                        element.classList.remove("selected");
                    }
                } else {
                    // Clicked a value element — toggle it
                    target.classList.toggle("selected");
                }

                updateClearButton();
                this.#reapplyFilters();
            });
        }
    }

    /**
     * Wire up the change listener on the already-rendered multiselect element.
     * The element and its options are fully declared in filter-bar.html via
     * {{selectOptions}} — no imperative construction needed here.
     * @private
     */
    #bindSourceFilter() {
        const multiSelect = this.element.querySelector("gfl5r-multi-select[name=\"filter-sources\"]");
        if (!multiSelect) {
            return;
        }
        multiSelect.addEventListener("change", () => this.#reapplyFilters());
    }

    /**
     * Handle the GM player-view button, selecting only the sources that are
     * both visible to players and present in this specific compendium.
     * @this {ItemCompendiumGfl5r}
     * @private
     */
    static #onApplyPlayerView() {
        const ns = CONFIG.gfl5r.namespace;
        const allRefsSet = game.settings.get(ns, "all-compendium-references");

        const availableForPlayers = [...allRefsSet]
            .filter((ref) => !this.#unavailableSourceForPlayersSet.has(ref))
            .filter((ref) => this.#sourcesInThisCompendium.has(ref));

        const multiSelect = this.element.querySelector("gfl5r-multi-select[name=\"filter-sources\"]");
        if (!multiSelect) {
            return;
        }

        multiSelect.value = availableForPlayers;
        this.#reapplyFilters();
    }

    /**
     * Register this compendium class and extend the index fields for all Item packs.
     */
    static applyToPacks() {
        CONFIG.Item.compendiumIndexFields = [
            ...(CONFIG.Item.compendiumIndexFields ?? []),
            "system.rank",
            "system.ring",
            "system.rarity",
            "system.source_reference.source",
        ];

        for (const pack of game.packs.filter((p) => p.metadata.type === "Item")) {
            pack.applicationClass = ItemCompendiumGfl5r;
            pack.getIndex(); // rebuild index with new fields — no need to await since this happens before anyone have a chance to act
        }
    }
}
