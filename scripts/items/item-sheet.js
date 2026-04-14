import { BaseItemSheetGfl5r } from "./base-item-sheet.js";

/**
 * Extend BaseItemSheetGfl5r with modifications for objects
 * @extends {ItemSheet}
 */
export class ItemSheetGfl5r extends BaseItemSheetGfl5r {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "item"],
            template: CONFIG.gfl5r.paths.templates + "items/item/item-sheet.html",
        });
    }

    /**
     * @return {Object|Promise}
     */
    async getData(options = {}) {
        const sheetData = await super.getData(options);

        sheetData.data.ringsList = game.gfl5r.HelpersGfl5r.getRingsList();

        // Prepare Properties (id/name => object)
        await this._prepareProperties(sheetData);

        // Editors enrichment
        sheetData.data.enrichedHtml = {
            description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(sheetData.data.system.description, { async: true }),
        };

        return sheetData;
    }

    /**
     * Prepare properties list
     * @private
     */
    async _prepareProperties(sheetData) {
        sheetData.data.propertiesList = await Promise.all((sheetData.data?.system?.properties || []).map(async (property) => {

            const gameProp = await game.gfl5r.HelpersGfl5r.getObjectGameOrPack({ id: property.id, type: "Item" });
            if (gameProp) {
                return gameProp;
            }

            // Item not found
            console.warn(`GFL5R | IS | Unknown property id[${property.id}], name[${property.name}]`);
            return {
                id: property.id,
                name: property.name,
                type: "property",
                img: "systems/gfl5r/assets/icons/items/property.svg",
                removed: true,
            };
        }));
    }


    /**
     * Subscribe to events from the sheet.
     * @param {jQuery} html HTML content of the sheet.
     * @override
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) {
            return;
        }

        // Delete a property
        html.find(`.property-delete`).on("click", this._deleteProperty.bind(this));
    }

    /**
     * Create drag-and-drop workflow handlers for this Application
     * @return {DragDrop[]} An array of DragDrop handlers
     */
    _createDragDropHandlers() {
        // "this.isEditable" fail for tooltips (undefined "this.document")
        const isEditable = this.options.editable;
        return [
            new foundry.applications.ux.DragDrop.implementation({
                dragSelector: ".property",
                dropSelector: null,
                permissions: { dragstart: isEditable, drop: isEditable },
                callbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDrop.bind(this) },
            }),
        ];
    }

    /**
     * Handle dropped data on the Item sheet, only "property" allowed.
     * Also a property canot be on another property
     */
    async _onDrop(event) {
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) {
            return;
        }

        // Check item type and subtype
        let item = await game.gfl5r.HelpersGfl5r.getDragnDropTargetObject(event);
        if (!item || item.documentName !== "Item") {
            return;
        }

        // If we are a property, the child id need to be different to parent
        if (this.item.type === "property" && this.item.id === item._id) {
            return;
        }

        // Specific ItemPattern's drop, get the associated props instead
        if (item.type === "item_pattern" && item.system.linked_property_id) {
            item = await game.gfl5r.HelpersGfl5r.getObjectGameOrPack({
                id: item.system.linked_property_id,
                type: "Item",
            });
        }

        // Final object has to be a property
        if (item.type !== "property") {
            return;
        }

        // Ok add item
        this._addProperty(item);
    }

    /**
     * Add a property to the current item
     * @param {Item} item
     * @private
     */
    _addProperty(item) {
        if (!Array.isArray(this.document.system.properties)) {
            this.document.system.properties = [];
        }

        if (this.document.system.properties.findIndex((p) => p.id === item.id) !== -1) {
            return;
        }

        this.document.system.properties.push({ id: item.id, name: item.name });

        // This props remove others ?
        if (Array.isArray(item.system.properties) && item.system.properties.length > 0) {
            const idsToRemove = item.system.properties.map((e) => e.id);
            this.document.system.properties = this.document.system.properties.filter(
                (p) => !idsToRemove.includes(p.id)
            );
        }

        this.document.update({
            system: {
                properties: this.document.system.properties,
            },
        });
    }

    /**
     * Delete a property from the current item
     * @param {Event} event
     * @return {Promise<void>}
     * @private
     */
    _deleteProperty(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!Array.isArray(this.document.system.properties)) {
            return;
        }

        const id = $(event.currentTarget).parents(".property").data("propertyId");
        const tmpProps = this.document.system.properties.find((p) => p.id === id);
        if (!tmpProps) {
            return;
        }

        const callback = async () => {
            this.document.system.properties = this.document.system.properties.filter((p) => p.id !== id);
            this.document.update({
                system: {
                    properties: this.document.system.properties,
                },
            });
        };

        // Holing Ctrl = without confirm
        if (event.ctrlKey) {
            return callback();
        }

        game.gfl5r.HelpersGfl5r.confirmDeleteDialog(
            game.i18n.format("gfl5r.global.delete_confirm", { name: tmpProps.name }),
            callback
        );
    }
}
