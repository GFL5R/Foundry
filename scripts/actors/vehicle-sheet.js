import { BaseCharacterSheetGfl5r } from "./base-character-sheet.js";

/**
 * Actor / Vehicle Sheet
 */
export class VehicleSheetGfl5r extends BaseCharacterSheetGfl5r {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gfl5r", "sheet", "actor", "vehicle"],
            template: CONFIG.gfl5r.paths.templates + "actors/vehicle-sheet.html",
            tabs: [
                { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" },
            ],
            width: 600,
        });
    }

    /**
     * @override
     */
    async getData(options = {}) {
        const sheetData = await super.getData(options);

        // Passenger slot data - pre-resolve actor names and images
        const passengerSlots = sheetData.data.system.passenger_slots || { total: 0, occupied: [] };
        const occupied = (passengerSlots.occupied || []).map(actorId => {
            const actor = game.actors.get(actorId);
            return actor ? { id: actorId, name: actor.name, img: actor.img } : { id: actorId, name: "Unknown", img: "icons/svg/mystery-man.svg" };
        });
        const total = passengerSlots.total || 0;
        sheetData.passengerSlots = {
            total,
            occupiedCount: occupied.length,
            available: Math.max(0, total - occupied.length),
            slots: Array.from({ length: total }, (_, i) => ({
                index: i,
                passenger: i < occupied.length ? occupied[i] : null,
            })),
        };

        // Losing ground stacks
        sheetData.losingGround = sheetData.data.system.losing_ground || 0;

        // Damage percentage for bar
        const dt = sheetData.data.system.damage_threshold || 0;
        sheetData.damagePercent = dt > 0 ? Math.round(((sheetData.data.system.current_damage?.value || 0) / dt) * 100) : 0;

        return sheetData;
    }

    /**
     * @override
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Passenger slot management
        html.find(".passenger-slot").on("click", this._onPassengerSlotClick.bind(this));
        html.find(".passenger-add").on("click", this._onAddPassenger.bind(this));
        html.find(".passenger-remove").on("click", this._onRemovePassenger.bind(this));

        // Losing ground controls
        html.find(".losing-ground-add").on("click", this._onLosingGroundAdd.bind(this));
        html.find(".losing-ground-remove").on("click", this._onLosingGroundRemove.bind(this));

        // Weapon management
        html.find(".vehicle-weapon-add").on("click", this._onAddWeapon.bind(this));
        html.find(".vehicle-weapon-delete").on("click", this._onDeleteWeapon.bind(this));
    }

    /**
     * Handle passenger slot click - open linked actor
     * @param {Event} event
     * @private
     */
    async _onPassengerSlotClick(event) {
        event.preventDefault();
        const actorId = $(event.currentTarget).data("actor-id");
        if (actorId) {
            const actor = game.actors.get(actorId);
            actor?.sheet?.render(true);
        }
    }

    /**
     * Add a passenger by drag-drop or dialog
     * @param {Event} event
     * @private
     */
    _onAddPassenger(event) {
        event.preventDefault();
        // Open a dialog to select an actor to add as passenger
        const available = game.actors.filter(a =>
            a.isCharacterType &&
            !this.actor.system.passenger_slots?.occupied?.includes(a.id)
        );

        if (!available.length) {
            ui.notifications.warn("No available characters to add as passengers.");
            return;
        }

        const options = available.reduce((acc, actor) => {
            acc[actor.id] = actor.name;
            return acc;
        }, {});

        // Use a simple Foundry dialog
        const tpl = `
            <form>
                <div class="form-group">
                    <label>Select Passenger</label>
                    <select name="passengerId">
                        ${Object.entries(options).map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}
                    </select>
                </div>
            </form>`;

        new Dialog({
            title: "Add Passenger",
            content: tpl,
            buttons: {
                add: {
                    icon: '<i class="fas fa-user-plus"></i>',
                    label: "Add",
                    callback: async (html) => {
                        const passengerId = html.find("[name='passengerId']").val();
                        if (!passengerId) return;

                        const slots = foundry.utils.deepClone(this.actor.system.passenger_slots || { total: 0, occupied: [] });
                        if (slots.occupied.length >= slots.total) {
                            ui.notifications.warn("No available passenger slots.");
                            return;
                        }
                        slots.occupied.push(passengerId);
                        await this.actor.update({ "system.passenger_slots": slots });
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                }
            }
        }).render(true);
    }

    /**
     * Remove a passenger from slot
     * @param {Event} event
     * @private
     */
    async _onRemovePassenger(event) {
        event.preventDefault();
        const index = parseInt($(event.currentTarget).data("slot-index"));
        if (isNaN(index)) return;

        const slots = foundry.utils.deepClone(this.actor.system.passenger_slots || { total: 0, occupied: [] });
        if (index >= 0 && index < slots.occupied.length) {
            slots.occupied.splice(index, 1);
            await this.actor.update({ "system.passenger_slots": slots });
        }
    }

    /**
     * Add a losing ground stack
     * @param {Event} event
     * @private
     */
    async _onLosingGroundAdd(event) {
        event.preventDefault();
        const current = this.actor.system.losing_ground || 0;
        if (current < 3) {
            await this.actor.update({ "system.losing_ground": current + 1 });
        }
    }

    /**
     * Remove a losing ground stack
     * @param {Event} event
     * @private
     */
    async _onLosingGroundRemove(event) {
        event.preventDefault();
        const current = this.actor.system.losing_ground || 0;
        if (current > 0) {
            await this.actor.update({ "system.losing_ground": current - 1 });
        }
    }

    /**
     * Add an embedded weapon to the vehicle
     * @param {Event} event
     * @private
     */
    _onAddWeapon(event) {
        event.preventDefault();
        // Open a dialog to input weapon stats
        const tpl = `
            <form>
                <div class="form-group">
                    <label>Weapon Name</label>
                    <input type="text" name="weaponName" value="" placeholder="e.g., RWS (7.62mm MG)"/>
                </div>
                <div class="form-group">
                    <label>Mount</label>
                    <input type="text" name="weaponMount" value="" placeholder="e.g., turret, coaxial, hull"/>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <input type="text" name="weaponCategory" value="" placeholder="e.g., MG, HMGC, RWS"/>
                </div>
                <div class="form-group">
                    <label>Skill</label>
                    <input type="text" name="weaponSkill" value="Firearms" placeholder="Firearms"/>
                </div>
                <div class="form-group">
                    <label>Range</label>
                    <input type="number" name="weaponRange" value="3" min="0" max="7"/>
                </div>
                <div class="form-group">
                    <label>Damage</label>
                    <input type="number" name="weaponDamage" value="6" min="0"/>
                </div>
                <div class="form-group">
                    <label>Deadliness</label>
                    <input type="number" name="weaponDeadliness" value="4" min="0"/>
                </div>
                <div class="form-group">
                    <label>Qualities (comma-separated)</label>
                    <input type="text" name="weaponQualities" value="" placeholder="Armor Piercing, Modular"/>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <input type="text" name="weaponNotes" value="" placeholder="Gunner operates from inside."/>
                </div>
            </form>`;

        new Dialog({
            title: "Add Vehicle Weapon",
            content: tpl,
            buttons: {
                add: {
                    icon: '<i class="fas fa-plus"></i>',
                    label: "Add Weapon",
                    callback: async (html) => {
                        const weapon = {
                            name: html.find("[name='weaponName']").val() || "Unnamed Weapon",
                            mount: html.find("[name='weaponMount']").val() || "",
                            category: html.find("[name='weaponCategory']").val() || "",
                            skill: html.find("[name='weaponSkill']").val() || "Firearms",
                            range: parseInt(html.find("[name='weaponRange']").val()) || 3,
                            damage: parseInt(html.find("[name='weaponDamage']").val()) || 6,
                            deadliness: parseInt(html.find("[name='weaponDeadliness']").val()) || 4,
                            qualities: html.find("[name='weaponQualities']").val()
                                ? html.find("[name='weaponQualities']").val().split(",").map(s => s.trim()).filter(Boolean)
                                : [],
                            notes: html.find("[name='weaponNotes']").val() || "",
                        };

                        const weapons = foundry.utils.deepClone(this.actor.system.weapons || []);
                        weapons.push(weapon);
                        await this.actor.update({ "system.weapons": weapons });
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                }
            }
        }).render(true);
    }

    /**
     * Delete an embedded weapon
     * @param {Event} event
     * @private
     */
    async _onDeleteWeapon(event) {
        event.preventDefault();
        const index = parseInt($(event.currentTarget).data("weapon-index"));
        if (isNaN(index)) return;

        const weapons = foundry.utils.deepClone(this.actor.system.weapons || []);
        if (index >= 0 && index < weapons.length) {
            weapons.splice(index, 1);
            await this.actor.update({ "system.weapons": weapons });
        }
    }
}
