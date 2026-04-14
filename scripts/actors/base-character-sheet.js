import { BaseSheetGfl5r } from "./base-sheet.js";

/**
 * Base Sheet for Character types (Character and Npc)
 */
export class BaseCharacterSheetGfl5r extends BaseSheetGfl5r {
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

    /** @inheritdoc */
    async getData(options = {}) {
        const sheetData = await super.getData(options);

        sheetData.data.stances = CONFIG.gfl5r.stances;
        sheetData.data.techniquesList = game.gfl5r.HelpersGfl5r.getTechniquesList({ displayInTypes: true });

        // Split Techniques by types
        sheetData.data.splitTechniquesList = this._splitTechniques(sheetData);

        // Split Items by types
        sheetData.data.splitItemsList = this._splitItems(sheetData);

        // Store infos for this app (collapsible)
        sheetData.data.storeInfos = game.gfl5r.storage.getAppKeys(this.id);

        return sheetData;
    }

    /**
     * Split Techniques by types for better readability
     * @private
     */
    _splitTechniques(sheetData) {
        const out = {};

        // Build the list from config technique types
        Array.from(CONFIG.gfl5r.techniques).forEach(([id, cfg]) => {
            out[id] = [];
        });

        // Add techniques the character knows
        sheetData.items.forEach((item) => {
            if (item.type === "technique") {
                if (!out[item.system.technique_type]) {
                    console.warn(
                        `GFL5R | BCS | Unknown technique type[${item.system.technique_type}] forced to "combat" in item id[${item._id}], name[${item.name}]`
                    );
                    item.system.technique_type = "combat";
                }
                out[item.system.technique_type].push(item);
            }
        });

        // Extract perk and capstone into dedicated arrays
        sheetData.data.perkTechniques = out["perk"] || [];
        sheetData.data.capstoneTechniques = out["capstone"] || [];
        delete out["perk"];
        delete out["capstone"];

        // Remove empty categories
        Object.keys(out).forEach((tech) => {
            if (out[tech].length < 1) {
                delete out[tech];
            }
        });

        return out;
    }

    /**
     * Split Items by types for better readability
     * @private
     */
    _splitItems(sheetData) {
        const out = {
            weaponry: [],
            armor: [],
            item: [],
        };

        sheetData.items.forEach((item) => {
            if (["item", "armor", "weaponry"].includes(item.type)) {
                out[item.type]?.push(item);
            }
        });

        return out;
    }

    /**
     * Handle dropped data on the Actor sheet
     * @param {DragEvent} event
     */
    async _onDrop(event) {
        // *** Everything below here is only needed if the sheet is editable ***
        if (!this.isEditable) {
            console.log("GFL5R | BCS | This sheet is not editable");
            return;
        }

        // Check item type and subtype
        const item = await game.gfl5r.HelpersGfl5r.getDragnDropTargetObject(event);
        if (!item || !["Item", "JournalEntry"].includes(item.documentName)) {
            console.log(`GFL5R | BCS | Wrong subtype ${item?.type}`, item);
            return;
        }

        // Journal drops not supported for GFL5R actors
        if (item.documentName === "JournalEntry") {
            return;
        }

        // Dropped an item with same "id" as one owned
        if (this.actor.items) {
            // Exit if we already owned exactly this id (drag a personal item on our own sheet)
            if (
                this.actor.items.some((embedItem) => {
                    // Search in children
                    if (embedItem.items instanceof Map && embedItem.items.has(item._id)) {
                        return true;
                    }
                    return embedItem._id === item._id;
                })
            ) {
                console.log("GFL5R | BCS | This element has been ignored because it already exists in this actor", item.uuid);
                return;
            }

            // Add quantity instead if they have (id is different so use type and name)
            if (item.system.quantity) {
                const tmpItem = this.actor.items.find(
                    (embedItem) => embedItem.name === item.name && embedItem.type === item.type
                );
                if (tmpItem && this._modifyQuantity(tmpItem.id, 1)) {
                    return;
                }
            }
        }

        // Can add the item - Foundry override cause props
        const allowed = Hooks.call("dropActorSheetData", this.actor, this, item);
        if (allowed === false) {
            return;
        }

        let itemData = item.toObject(true);

        // If from another actor, break the link
        if (itemData.system.parent_id != null && itemData.system.parent_id?.actor_id !== this.actor._id) {
            itemData.system.parent_id = null;
        }

        // Item subtype specific
        switch (itemData.type) {
            case "army_cohort":
            case "army_fortification":
                console.warn("GFL5R | BCS | Army items are not allowed", item?.type, item);
                return;

            case "technique":
                // Set XP cost
                itemData.system.xp_cost =
                    itemData.system.xp_cost > 0 ? itemData.system.xp_cost : CONFIG.gfl5r.xp.techniqueCost;
                break;
        }

        // Finally create the embed
        return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    /** @inheritdoc */
    _onDragStart(event) {
        // Patch Owned Items
        const li = event.currentTarget;
        if (li.dataset.itemParentId && li.dataset.itemId) {
            const item = this.actor.items.get(li.dataset.itemParentId)?.items.get(li.dataset.itemId);
            if (item) {
                event.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "Item",
                    uuid: item.uuid,
                }));
                return;
            }
        }
        // Else regular
        super._onDragStart(event);
    }

    /**
     * Subscribe to events from the sheet.
     * @param {jQuery} html HTML content of the sheet.
     */
    activateListeners(html) {
        super.activateListeners(html);

        // *** Everything below here is only needed if the sheet is editable ***
        if (!this.isEditable) {
            return;
        }

        // Dice event on Skills clic
        html.find(".dice-picker").on("click", this._openDicePickerForSkill.bind(this));

        // Dice event on Technique clic
        html.find(".dice-picker-tech").on("click", this._openDicePickerForTechnique.bind(this));

        // Prepared (Initiative)
        html.find(".prepared-control").on("click", this._switchPrepared.bind(this));

        // Equipped / Readied
        html.find(".equip-readied-control").on("click", this._switchEquipReadied.bind(this));

        // Fatigue/Strife +/-
        html.find(".addsub-control").on("click", this._modifyFatigueOrStrife.bind(this));

        // Effect remove/display
        html.find(".effect-delete").on("click", this._removeEffectId.bind(this));
        html.find(".effect-name").on("click", this._openEffectJournal.bind(this));
    }

    /**
     * Remove an effect
     * @param {Event} event
     * @private
     */
    _removeEffectId(event) {
        event.preventDefault();
        event.stopPropagation();

        const effectId = $(event.currentTarget).data("effect-id");
        if (!effectId) {
            return;
        }

        const tmpItem = this.actor.effects.get(effectId);
        if (!tmpItem) {
            return;
        }

        const callback = async () => {
            return this.actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
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

    /**
     * Open the core linked journal effect if exist
     * @param {Event} event
     * @private
     */
    async _openEffectJournal(event) {
        event.preventDefault();
        event.stopPropagation();

        const effectId = $(event.currentTarget).data("effect-id");
        if (!effectId) {
            return;
        }

        const effect = this.actor.effects.get(effectId);
        if (!effect?.system?.id && !effect?.system?.uuid) {
            return;
        }

        const journal = await game.gfl5r.HelpersGfl5r.getObjectGameOrPack({
            id: effect.system.id,
            uuid: effect.system.uuid,
            type: "JournalEntry",
        });
        if (journal) {
            journal.sheet.render(true);
        }
    }

    /**
     * Switch the state "prepared" (initiative)
     * @param {Event} event
     * @private
     */
    _switchPrepared(event) {
        event.preventDefault();
        event.stopPropagation();

        this.actor.system.prepared = !this.actor.system.prepared;
        this.actor.update({
            system: {
                prepared: this.actor.system.prepared,
            },
        });
        this.render(false);
    }

    /**
     * Add a generic item with sub type
     * @param {string}      type           Item sub type (armor, weapon, bond...)
     * @param {boolean}     isEquipped     For item with prop "Equipped" set the value
     * @param {string|null} techniqueType  Technique subtype (kata, shuji...)
     * @return {Promise<void>}
     * @private
     */
    async _createSubItem({ type, isEquipped = false, techniqueType = null }) {
        if (!type) {
            return;
        }

        const created = await this.actor.createEmbeddedDocuments("Item", [
            {
                name: game.i18n.localize(`TYPES.Item.${type.toLowerCase()}`),
                type: type,
                img: `${CONFIG.gfl5r.paths.assets}icons/items/${type}.svg`,
            },
        ]);
        if (created?.length < 1) {
            return;
        }
        const item = this.actor.items.get(created[0].id);

        switch (item.type) {
            case "item": // no break
            case "armor": // no break
            case "weaponry":
                item.system.equipped = isEquipped;
                break;

            case "technique": {
                // If technique, select the current sub-type
                if (CONFIG.gfl5r.techniques.get(techniqueType)) {
                    item.name = game.i18n.localize(`gfl5r.techniques.${techniqueType}`);
                    item.img = `${CONFIG.gfl5r.paths.assets}icons/techs/${techniqueType}.svg`;
                    item.system.technique_type = techniqueType;
                }
                break;
            }
        }

        item.sheet.render(true);
    }

    /**
     * Display a dialog to choose what Item to add
     * @param {Event} event
     * @return {Promise<void>}
     * @private
     */
    async _showDialogAddSubItem(event) {
        game.gfl5r.HelpersGfl5r.showSubItemDialog(["discipline", "module", "condition", "vehicle"]).then(
            (selectedType) => {
                this._createSubItem({ type: selectedType });
            }
        );
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

        const isEquipped = $(event.currentTarget).data("item-equipped") || false;
        const techniqueType = $(event.currentTarget).data("tech-type") || null;

        return this._createSubItem({ type, isEquipped, techniqueType });
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

        // Remove 1 qty if possible
        if (tmpItem.system.quantity > 1 && this._modifyQuantity(tmpItem.id, -1)) {
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

    /**
     * Switch "in_curriculum"
     * @param {Event} event
     * @private
     */
    _switchSubItemCurriculum(event) {
        event.preventDefault();
        event.stopPropagation();

        const itemId = $(event.currentTarget).data("item-id");
        const item = this.actor.items.get(itemId);
        if (item.type !== "item") {
            item.update({
                system: {
                    in_curriculum: !item.system.in_curriculum,
                },
            });
        }
    }

    /**
     * Add or subtract a quantity to a owned item
     * @private
     */
    _modifyQuantity(itemId, add) {
        const tmpItem = this.actor.items.get(itemId);
        if (tmpItem) {
            tmpItem.system.quantity = Math.max(1, tmpItem.system.quantity + add);
            tmpItem.update({
                system: {
                    quantity: tmpItem.system.quantity,
                },
            });
            return true;
        }
        return false;
    }

    /**
     * Add or Subtract Fatigue/Strife (+/- buttons)
     * @param {Event} event
     * @private
     */
    async _modifyFatigueOrStrife(event) {
        event.preventDefault();
        event.stopPropagation();

        const elmt = $(event.currentTarget);
        const type = elmt.data("type");
        let mod = elmt.data("value");
        if (!mod) {
            return;
        }
        switch (type) {
            case "fatigue":
                await this.actor.update({
                    system: {
                        fatigue: {
                            value: Math.max(0, this.actor.system.fatigue.value + mod),
                        },
                    },
                });
                break;

            case "strife":
                await this.actor.update({
                    system: {
                        strife: {
                            value: Math.max(0, this.actor.system.strife.value + mod),
                        },
                    },
                });
                break;

            case "humanity":
                await this.actor.update({
                    system: {
                        social: {
                            humanity: Math.max(0, this.actor.system.social.humanity + mod),
                        },
                    },
                });
                break;
            
            case "fame":
                await this.actor.update({
                    system: {
                        social: {
                            fame: Math.max(0, this.actor.system.social.fame + mod),
                        },
                    },
                });
                break;

            case "status":
                await this.actor.update({
                    system: {
                        social: {
                            status: Math.max(0, this.actor.system.social.status + mod),
                        },
                    },
                });
                break;

            default:
                console.warn("GFL5R | BCS | Unsupported type", type);
                break;
        }
    }

    /**
     * Switch Readied state on a weapon
     * @param {Event} event
     * @private
     */
    _switchEquipReadied(event) {
        event.preventDefault();
        event.stopPropagation();

        const type = $(event.currentTarget).data("type");
        if (!["equipped", "readied"].includes(type)) {
            return;
        }

        const itemId = $(event.currentTarget).data("item-id");
        const tmpItem = this.actor.items.get(itemId);
        if (!tmpItem || tmpItem.system[type] === undefined) {
            return;
        }

        tmpItem.system[type] = !tmpItem.system[type];
        const data = {
            equipped: tmpItem.system.equipped,
        };
        // Only weapons
        if (tmpItem.system.readied !== undefined) {
            data.readied = tmpItem.system.readied;
        }

        // Update the Item: we need to manually notify the "Gm Monitor" as the Actor himself is not updated
        tmpItem.update({ system: data }).then(() => {
            // Only if this actor is watched
            if (this.actor && game.settings.get(CONFIG.gfl5r.namespace, "gm-monitor-actors").some((uuid) => uuid === this.actor.uuid)) {
                game.gfl5r.HelpersGfl5r.refreshLocalAndSocket("gfl5r-gm-monitor");
            }
        });
    }

    /**
     * Get the skillId and uuid for this weaponId
     * @private
     */
    _getWeaponInfos(weaponId) {
        if (!weaponId) {
            return null;
        }
        const item = this.actor.items.get(weaponId);
        if (!item || item.type !== "weaponry") {
            return null;
        }
        return {
            uuid: item.uuid,
            skill: item.system.skill,
        };
    }

    /**
     * Open the dice-picker for this skill
     * @param {Event} event
     * @private
     */
    _openDicePickerForSkill(event) {
        event.preventDefault();
        event.stopPropagation();

        // In Fvtt v13+ "Enter" trigger that mouse event, we ignore that below
        if (event.clientX ===  0 && event.clientY === 0) {
            return;
        }

        const li = $(event.currentTarget);
        const weapon = this._getWeaponInfos(li.data("weapon-id") || null);
        const isInitiative = li.data("initiative") || false;

        if (isInitiative) {
            if (!game.combat) {
                ui.notifications.warn("COMBAT.NoneActive", {localize: true});
                return;
            }
            if (!this.actor.canDoInitiativeRoll) {
                ui.notifications.error("gfl5r.conflict.initiative.already_set", {localize: true});
                return;
            }
            // Minion specific
            if (this.actor.isMinion) {
                this.actor.rollInitiative().then();
                return;
            }
        }

        new game.gfl5r.DicePickerDialog({
            approachId: li.data("approach") || null,
            skillId: weapon?.skill || li.data("skill") || null,
            skillCatId: li.data("skillcat") || null,
            isInitiativeRoll: isInitiative,
            actor: this.actor,
            itemUuid: weapon?.uuid,
        }).render(true);
    }

    /**
     * Open the dice-picker for this technique
     * @param {Event} event
     * @private
     */
    async _openDicePickerForTechnique(event) {
        event.preventDefault();
        event.stopPropagation();

        // Required for tech in titles, search in sub items
        const item = await game.gfl5r.HelpersGfl5r.getEmbedItemByEvent(event, this.actor);
        if (!item || item.type !== "technique" || !item.system.skill) {
            return;
        }

        const itemData = item.system;
        new game.gfl5r.DicePickerDialog({
            actor: this.actor,
            approachId: itemData.approach || null,
            difficulty: itemData.difficulty || null,
            skillsList: itemData.skill || null,
            itemUuid: item.uuid,
        }).render(true);
    }
}
