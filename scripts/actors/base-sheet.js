/**
 * Base Sheet for Actor and Npc
 */
export class BaseSheetGfl5r extends foundry.appv1.sheets.ActorSheet {
    /**
     * Commons options
     */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "actor"],
            // template: CONFIG.gfl5r.paths.templates + "actors/character-sheet.html",
            width: 600,
            height: 800,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }],
            dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
        });
    }

    /**
     * Add buttons to GFL5R specific bar
     * @return {{label: string, class: string, icon: string, onclick: Function|null}[]}
     */
    _getGfl5rHeaderButtons() {
        /**
         * @var {{label: string, class: string, icon: string, onclick: Function|null}[]}
         */
        const buttons = [];

        // Send To Chat
        buttons.unshift({
            label: "gfl5r.global.send_to_chat",
            class: "send-to-chat",
            icon: "fas fa-comment-dots",
            onclick: () =>
                game.gfl5r.HelpersGfl5r.debounce(
                    "send2chat-" + this.object.id,
                    () => game.gfl5r.HelpersGfl5r.sendToChat(this.object),
                    2000,
                    true
                )(),
        });

        return buttons;
    }

    /** @inheritdoc */
    async getData(options = {}) {
        const sheetData = await super.getData(options);

        // System Header Buttons
        sheetData.gfl5rHeaderButtons = this._getGfl5rHeaderButtons();

        sheetData.data.dtypes = ["String", "Number", "Boolean"];

        // Sort Items by name
        sheetData.items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        // Editors enrichment
        sheetData.data.enrichedHtml = {
            description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(sheetData.data.system.description, { async: true }),
            notes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(sheetData.data.system.notes, { async: true }),
        };

        // Shortcut for some tests
        sheetData.data.editable = sheetData.editable;

        return sheetData;
    }

    /**
     * Return a light sheet if in "limited" state
     * @override
     */
    get template() {
        if (!game.user.isGM && this.actor.limited) {
            return `${CONFIG.gfl5r.paths.templates}actors/limited-sheet.html`;
        }
        return this.options.template;
    }

    /**
     * Activate a named TinyMCE text editor
     * @param {string} name             The named data field which the editor modifies.
     * @param {object} options          TinyMCE initialization options passed to TextEditor.create
     * @param {string} initialContent   Initial text content for the editor area.
     * @override
     */
    activateEditor(name, options = {}, initialContent = "") {
        // Symbols Compatibility with old compendium modules (PRE gfl5r v0.1.0)
        if (["system.notes", "system.description"].includes(name) && initialContent) {
            initialContent = game.gfl5r.HelpersGfl5r.convertSymbols(initialContent, false);
        }
        return super.activateEditor(name, options, initialContent);
    }

    /**
     * This method is called upon form submission after form data is validated
     * @param event {Event}       The initial triggering submission event
     * @param formData {Object}   The object of validated form data with which to update the object
     * @returns {Promise}         A Promise which resolves once the update operation has completed
     * @override
     */
    async _updateObject(event, formData) {
        // Remove autocomplete list name/index if exist
        if (formData["autoCompleteListName"] || formData["autoCompleteListSelectedIndex"]) {
            delete formData["autoCompleteListName"];
            delete formData["autoCompleteListSelectedIndex"];
        }
        return super._updateObject(event, formData);
    }

    /**
     * Subscribe to events from the sheet.
     * @param {jQuery} html HTML content of the sheet.
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Commons
        game.gfl5r.HelpersGfl5r.commonListeners(html, this.actor);

        // System Header Buttons
        const gfl5rHeaderButtons = this._getGfl5rHeaderButtons();
        html.find(".gfl5r-header-button").click((event) => {
            event.preventDefault();
            const button = gfl5rHeaderButtons.find((b) => event.currentTarget.classList.contains(b.class));
            button.onclick(event);
        });

        // *** Everything below here is only needed if the sheet is editable ***
        if (!this.isEditable) {
            return;
        }

        // On focus on one numeric element, select all text for better experience
        html.find(".select-on-focus").on("focus", (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.target.select();
        });

        // *** Items : add, edit, delete ***
        html.find(".item-add").on("click", this._addSubItem.bind(this));
        html.find(`.item-edit`).on("click", this._editSubItem.bind(this));
        html.find(`.item-delete`).on("click", this._deleteSubItem.bind(this));
    }

    /**
     * Add a generic item with sub type
     * @param {string}      type           Item sub type (armor, weapon, bond...)
     * @return {Promise<void>}
     * @private
     */
    async _createSubItem({ type, narrativeType = null }) {
        if (!type) {
            return;
        }

        const itemData = {
            name: game.i18n.localize(`TYPES.Item.${type.toLowerCase()}`),
            type: type,
            img: `${CONFIG.gfl5r.paths.assets}icons/items/${type}.svg`,
        };
        // Narrative items (advantages/disadvantages/passions/anxieties) carry a
        // narrative_type that decides which sheet box they render in. Set it
        // explicitly from the add button so the item is categorized correctly
        // instead of falling back to template.json's default ("advantage").
        if (type === "narrative" && narrativeType) {
            itemData.system = { narrative_type: narrativeType };
        }

        const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        if (created?.length < 1) {
            return;
        }
        const item = this.actor.items.get(created[0].id);

        item.sheet.render(true);
    }

    /**
     * Add a generic item with sub type
     * @param {Event} event
     * @private
     */
    async _addSubItem(event) {
        event.preventDefault();
        event.stopPropagation();

        const type = $(event.currentTarget).data("item-type");
        if (!type) {
            return;
        }

        const narrativeType = $(event.currentTarget).data("narrative-type") || null;
        return this._createSubItem({ type, narrativeType });
    }

    /**
     * Edit a generic item with sub type
     * @param {Event} event
     * @private
     */
    _editSubItem(event) {
        event.preventDefault();
        event.stopPropagation();

        game.gfl5r.HelpersGfl5r.getEmbedItemByEvent(event, this.actor).then((item) => {
            if (item) {
                item.sheet.render(true);
            }
        });
    }

    /**
     * Delete a generic item with sub type
     * @param {Event} event
     * @private
     */
    _deleteSubItem(event) {
        event.preventDefault();
        event.stopPropagation();

        const itemId = $(event.currentTarget).data("item-id");
        if (!itemId) {
            return;
        }

        const tmpItem = this.actor.items.get(itemId);
        if (!tmpItem) {
            return;
        }

        const callback = async () => {
            return this.actor.deleteEmbeddedDocuments("Item", [itemId]);
        };

        // Holing Ctrl = without confirm
        if (event.ctrlKey) {
            return callback();
        }

        game.gfl5r.HelpersGfl5r.confirmDeleteDialog(
            game.i18n.format("gfl5r.global.delete_confirm", { name: tmpItem.name }),
            callback
        );
    }
}
