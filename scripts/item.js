export class ItemGfl5r extends Item {
    /**
     * A reference to the Collection of embedded Item instances in the document, indexed by _id.
     * @returns {Collection<BaseItem>}
     */
    get items() {
        return this.system.items || new Map();
    }

    /**
     * Return the linked Actor instance if any (current or embed)
     * @return {Actor|null}
     */
    get actor() {
        return super.actor || game.actors.get(this.system.parent_id?.actor_id) || null;
    }

    /**
     * A Universally Unique Identifier (uuid) for this Document instance patched for embedded items on items
     * @type {string}
     * @memberof ClientDocumentMixin#
     */
    get uuid() {
        const parents = this.system.parent_id;
        if (!parents?.item_id) {
            return super.uuid;
        }

        // Embedded item
        const uuid = [];
        if (parents?.actor_id) {
            uuid.push(`Actor.${parents.actor_id}`);
        }
        uuid.push(`Item.${parents.item_id}`);
        uuid.push(`Item.${this._id}`);

        return uuid.join(".");
    }

    /**
     * Obtain a reference to the Array of source data within the data object for a certain embedded Document name
     *
     * TODO probably useless if we can add "items" in metadata.embedded, but no clue how to.
     *
     * @param {string} embeddedName   The name of the embedded Document type
     * @return {DocumentCollection}   The Collection instance of embedded Documents of the requested type
     */
    getEmbeddedCollection(embeddedName) {
        if (embeddedName === "Item") {
            return this.items;
        }
        return super.getEmbeddedCollection(embeddedName);
    }

    /**
     * Create a new entity using provided input data
     * @override
     */
    static async create(data, context = {}) {
        if (data.img === undefined) {
            data.img = `${CONFIG.gfl5r.paths.assets}icons/items/${data.type}.svg`;
        }
        return super.create(data, context);
    }

    /**
     * Update this Document using incremental data, saving it to the database.
     * @see {@link Document.updateDocuments}
     * @param {object} [data={}]                         Differential update data which modifies the existing values of this document data
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the update workflow
     * @returns {Promise<Document>}                      The updated Document instance
     */
    async update(data = {}, context = {}) {
        // Regular
        if (!this.system.parent_id) {
            return super.update(data, context);
        }

        // **** Embed Items, need to get the parents ****
        const parentItem = this.getItemFromParentId();
        if (!parentItem) {
            console.warn(`GFL5R | Helpers | Embed parentItem not found`);
            return;
        }

        // Merge (DocumentData cannot be set)
        const result = foundry.utils.mergeObject(this, foundry.utils.expandObject(data));

        if (result.name) {
            this.name = result.name;
        }
        if (result.img) {
            this.img = result.img;
        }
        if (result.system) {
            this.system = result.system;
        }

        // Update
        await parentItem.updateEmbedItem(this.toObject(false));

        // Return new value for sheet
        return new Promise((resolve) => resolve(this));
    }

    /** @override */
    prepareData() {
        super.prepareData();

        // Prepare Embed items
        if (!(this.system.items instanceof Map)) {
            const itemsData = Array.isArray(this.system.items) ? this.system.items : [];
            this.system.items = new Map();

            itemsData.forEach((item) => {
                this.addEmbedItem(item, { save: false, newId: false });
            });
        }

        // Sanitize some values
        switch (this.type) {
            case "armor":
                this.system.protection = this.system.protection || 0;
                this.system.weight = this.system.weight || 0;
                this.system.signature = this.system.signature || 0;
                break;

            case "weaponry":
                this.system.ideal_range = this.system.ideal_range || 0;
                this.system.damage = this.system.damage || 0;
                this.system.deadliness = this.system.deadliness || 0;
                this.system.threat = this.system.threat || 0;
                this.system.signature = this.system.signature || 0;
                break;
        }
    }

    // ***** parent ids management *****
    /**
     * Return a string with idemId + actorId if any
     * @return {{item_id: (string|null), actor_id?: (string|null)}}
     */
    getParentsIds() {
        const parent = {
            item_id: this.id,
        };
        if (this.actor?._id) {
            parent.actor_id = this.actor._id;
        }
        return parent;
    }

    /**
     * Return the Item Object for the "parentId"
     * @return {ItemGfl5r|null}
     */
    getItemFromParentId() {
        const parentIds = this.system.parent_id;
        let parentItem;

        if (parentIds?.actor_id) {
            // Actor item object
            const parentActor = parentIds.actor_id ? game.actors.get(parentIds.actor_id) : null;
            parentItem = parentActor?.items.get(parentIds.item_id);
        } else if (parentIds?.item_id) {
            // World Object
            parentItem = game.items.get(parentIds.item_id);
        }

        return parentItem;
    }

    /**
     * Render the text template for this Item (tooltips and chat)
     * @return {Promise<string|null>}
     */
    async renderTextTemplate() {
        const sheetData = (await this.sheet?.getData()) || this;
        if (sheetData instanceof ItemGfl5r) {
            await game.gfl5r.HelpersGfl5r.refreshItemProperties(this);
        }
        const type = this.type.replace("_", "-"); // ex: item_pattern
        const tpl = await foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}items/${type}/${type}-text.html`, sheetData);
        if (!tpl) {
            return null;
        }
        return tpl;
    }

    // ***** Embedded items management *****
    /**
     * Shortcut for this.items.get
     * @param id
     * @return {ItemGfl5r|null}
     */
    getEmbedItem(id) {
        return this.items?.get(id) || null;
    }

    /**
     * Add an Embed Item
     * @param {ItemGfl5r} item Object to add
     * @param {boolean} save   if we save in db or not (used internally)
     * @param {boolean} newId  if we change the id
     * @return {Promise<string>}
     */
    async addEmbedItem(item, { save = true, newId = true } = {}) {
        if (!item) {
            return;
        }

        if (!(item instanceof Item) && item?.name && item?.type) {
            // Data -> Item
            item = new ItemGfl5r(item);
        }

        // New id
        if (newId || !item._id) {
            // Bypass the readonly for "_id"
            const tmpData = item.toJSON();
            tmpData._id = foundry.utils.randomID();
            item = new ItemGfl5r(tmpData);
        }

        // Copy the parent permission to the sub item
        // In v10 actor's items inherit the ownership from the actor, but theirs ownership do not reflect that.
        // So we must take actor's ownership for sub-item
        item.ownership = this.actor?.ownership ?? this.ownership;

        // Tag parent (flags won't work as we have no id in db)
        item.system.parent_id = this.getParentsIds();

        // Object
        this.system.items.set(item._id, item);

        if (save) {
            await this.saveEmbedItems();
        }
        return item._id;
    }

    /**
     * Update an Embed Item
     * @param {ItemGfl5r} item Object to add
     * @param {boolean} save   if we save in db or not (used internally)
     * @return {Promise<string>}
     */
    async updateEmbedItem(item, { save = true } = {}) {
        return await this.addEmbedItem(item, { save, newId: false });
    }

    /**
     * Delete the Embed Item
     * @param id Item id
     * @param {boolean} save   if we save in db or not (used internally)
     * @return {Promise<void>}
     */
    async deleteEmbedItem(id, { save = true } = {}) {
        if (!this.system.items.has(id)) {
            return;
        }

        // Remove the embed item
        this.system.items.delete(id);

        if (save) {
            await this.saveEmbedItems();
        }
    }

    /**
     * Generate new Ids for the embed items
     * @return {Promise<void>}
     */
    async generateNewIdsForAllEmbedItems() {
        // Clear olds ids
        const oldItems = Array.from(this.system.items);
        this.system.items = new Map();

        // Re-add with new ids
        oldItems.forEach(([id, item]) => {
            this.addEmbedItem(item, { save: false, newId: true });
        });

        return this.saveEmbedItems();
    }

    /**
     * Save all the Embed Items
     * @return {Promise<void>}
     */
    async saveEmbedItems() {
        await this.update({
            "system.items": Array.from(this.system.items).map(([id, item]) => item.toObject(false)),
        });
        this.sheet.render(false);
    }
}
