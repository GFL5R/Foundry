const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const ApplicationV2 = foundry.applications.api.ApplicationV2;
const fields = foundry.data.fields;

/**
 *
 * @typedef {Object} RangeBand
 * @property {number} start
 *
 * @typedef {Object} ClientRangeBand  
 * @property {string} color
 * @property {number} alpha
 * 
 * @typedef {Object} WorldSettings
 * @property {boolean} enabled
 * @property {Record<number, RangeBand>} ranges - Indexed 0-6
 * 
 * @typedef {Object} ClientSettings
 * @property {Record<number, ClientRangeBand>} ranges - Indexed 0-6
*/

export class TacticalGridSettingsGFL5R extends HandlebarsApplicationMixin(ApplicationV2) {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        id: "tactical-grid-settings",
        tag: "form",
        classes: [""], // We could add gfl5r here but that would add styling that is not matching the default settings menu
        window: {
            title: "gfl5r.tactical_grid.settings.title",
            contentClasses: ["standard-form"]
        },
        form: {
            closeOnSubmit: true,
            handler: TacticalGridSettingsGFL5R.#onSubmit
        },
        position: { width: 540 },
        actions: {
            reset: TacticalGridSettingsGFL5R.#onReset
        }
    };
  
    /** @override */
    static PARTS = {
        form: {
            template: "systems/gfl5r/templates/" + "settings/tactical-grid-settings.html",
            scrollable: [""],
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    /**
     * Creates a SchemaField defining a world range band.
     * @param {{start: number}} initial - Initial range values.
     * `start` must be ≥ 0.
     * * @returns {SchemaField} A schema field containing a 'start' field
     * 
     * @private
     */
    static #createWorldRangeBandSchema(initial) {
        return new fields.SchemaField({
            start: new fields.NumberField({ initial: initial.start, label: "gfl5r.tactical_grid.settings.world.start", min: 0, max:Infinity, nullable: false, required: true, gmOnly: true})
        });
    }

    /**
     * Creates a SchemaField defining a client range band.
     * @param {{color: string, alpha: number}} initial - Initial range band values.
     * `color` should be a valid CSS color string and `alpha` a valid alpha value.
     * @returns {SchemaField} A schema field containing `color` and `alpha` fields.
     *
     * @private
     */
    static #createClientRangeBandSchema(initial) {
        return new fields.SchemaField({
            color: new fields.ColorField({initial: initial.color, label: "gfl5r.tactical_grid.settings.client.color", required: true}),
            alpha: new fields.AlphaField({initial: initial.alpha, label: "gfl5r.tactical_grid.settings.client.alpha", required: true}),
        });
    }
    
    /**
     * Combined Foundry VTT settings schema representing both:
     * - **World (GM-controlled)** configuration
     * - **Client (per-user)** visual configuration
     *
     * This variable serves as a single source-of-truth definition for the module’s
     * tactical grid settings structure, including field types, defaults, labels, and
     * validation rules for world ranges.
     * @private
     */
    static #schema = {
        world: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: true, label: "gfl5r.tactical_grid.settings.world.enabled", hint: "gfl5r.tactical_grid.settings.world.enabled_hint"}),
            ranges: new fields.SchemaField({
                0: TacticalGridSettingsGFL5R.#createWorldRangeBandSchema({ start: 0}),
                1: TacticalGridSettingsGFL5R.#createWorldRangeBandSchema({ start: 1}),
                2: TacticalGridSettingsGFL5R.#createWorldRangeBandSchema({ start: 2}),
                3: TacticalGridSettingsGFL5R.#createWorldRangeBandSchema({ start: 3}),
                4: TacticalGridSettingsGFL5R.#createWorldRangeBandSchema({ start: 6}),
                5: TacticalGridSettingsGFL5R.#createWorldRangeBandSchema({ start: 10}),
                6: TacticalGridSettingsGFL5R.#createWorldRangeBandSchema({ start: 15})
            })
        }, {
            validate: TacticalGridSettingsGFL5R.#validateWorldRangeConfiguration
        }),
        client: new fields.SchemaField({
            ranges: new fields.SchemaField({
                0: TacticalGridSettingsGFL5R.#createClientRangeBandSchema({color: "#00FFFF", alpha: 0.5}),
                1: TacticalGridSettingsGFL5R.#createClientRangeBandSchema({color: "#FF00FF", alpha: 0.5}),
                2: TacticalGridSettingsGFL5R.#createClientRangeBandSchema({color: "#FFFF00", alpha: 0.5}),
                3: TacticalGridSettingsGFL5R.#createClientRangeBandSchema({color: "#0000FF", alpha: 0.5}),
                4: TacticalGridSettingsGFL5R.#createClientRangeBandSchema({color: "#7FFF00", alpha: 0.5}),
                5: TacticalGridSettingsGFL5R.#createClientRangeBandSchema({color: "#4B0082", alpha: 0.5}),
                6: TacticalGridSettingsGFL5R.#createClientRangeBandSchema({color: "#FF8800", alpha: 0.5})
            })
        })
    };
    
    /**
     * Exposes the **world (GM-controlled)** portion of the tactical grid settings schema.
     * @return {SchemaField}
     */
    static get worldSchema() {
        return TacticalGridSettingsGFL5R.#schema.world;
    }

    /**
     * Exposes the **client (per-user visual)** portion of the tactical grid settings schema.
     * @return {SchemaField}
     */
    static get clientSchema() {
        return TacticalGridSettingsGFL5R.#schema.client;
    }

    /** Holds a mutable copy of the tactical grid settings so the form can operate on current values without altering the schema. */
    static #setting = null;

  
    /** @override ApplicationV2 */
    async _prepareContext(options) {
        if (options.isFirstRender) {
            const client = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-client");
            const world = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-world");
            TacticalGridSettingsGFL5R.#setting = foundry.utils.deepClone({client: client, world: world});
        }

        // Pre-process range bands for easier template access
        const rangeBands = Object.entries(this.constructor.worldSchema.fields.ranges.fields).map(([index, field]) => ({
            index: Number(index),
            worldField: field,
            clientFields: this.constructor.clientSchema.fields.ranges.fields[index],
            worldValue: TacticalGridSettingsGFL5R.#setting.world.ranges[index],
            clientValue: TacticalGridSettingsGFL5R.#setting.client.ranges[index]
        }));

        return {
            isGm: game.user.isGM,
            tactical_grid_enabled: {
                field: this.constructor.worldSchema.fields.enabled,
                value: TacticalGridSettingsGFL5R.#setting.world.enabled,
            },
            rangeBands,
            buttons: [
                { type: "reset", label: "gfl5r.tactical_grid.settings.reset", icon: "fa-solid fa-arrow-rotate-left", action: "reset" },
                { type: "submit", label: "gfl5r.tactical_grid.settings.submit", icon: "fa-solid fa-floppy-disk" }
            ]
        };
    }


    /** @override ApplicationV2 */
    _onChangeForm(formConfig, event) {
        const formData = new foundry.applications.ux.FormDataExtended(this.form, { readonly: true });

        const { 
            cleaned: cleanedWorldSettings, 
            failure: validationFailures 
        } = TacticalGridSettingsGFL5R.#validateAndCleanWorldSettings(formData, event);
        TacticalGridSettingsGFL5R.#applyValidationState(validationFailures);
        
        TacticalGridSettingsGFL5R.#setting.world = cleanedWorldSettings        
        TacticalGridSettingsGFL5R.#setting.client = foundry.utils.expandObject(formData.object).gfl5r["tactical-grid-settings-client"];
    }

    /**
     * Validates world schema ensuring range bands are properly ordered and connected.
     * Note: internal field validation takes precedence, and will result in this validation potentially not running 
     * Checks that:
     * - Sequential range bands connect properly (range[n].start < range[n+1].start)
     * @param {*} value - The world settings object to validate
     * @param {DataFieldValidationOptions} options - Validation options including lastElementChange
     * @returns {boolean|foundry.data.validation.DataModelValidationFailure} True if valid, otherwise validation failure object
    */
    static #validateWorldRangeConfiguration(value, options) {
        if(!value.enabled) // don't validate if tactical_grids are disabled
            return true;
    
        let previousStart = -1;
        let previousRangeIndex = null;
        const failure = new foundry.data.validation.DataModelValidationFailure({ unresolved: true });
        const changedElementName = options?.element?.name;
    
        for (const [rangeIndex, range] of Object.entries(value.ranges)) {
            if (range.start <= previousStart) {
                let errorKey = TacticalGridSettingsGFL5R.worldSchema.fields.ranges.fields[rangeIndex].fields.start.fieldPath;
                const previousErrorKey = errorKey.replace(/\.(\d+)\./, `.${previousRangeIndex}.`);
                
                let isErrorOnPrevious = false;
                
                // If the previous field was changed, show error there instead
                if (changedElementName === previousErrorKey) {
                    errorKey = previousErrorKey;
                    isErrorOnPrevious = true;
                }
    
                failure.fields[errorKey] = new foundry.data.validation.DataModelValidationFailure({
                    invalidValue: isErrorOnPrevious ? previousStart : range.start,
                    unresolved: true,
                    message: game.i18n.format(
                        isErrorOnPrevious 
                            ? "gfl5r.tactical_grid.settings.validate.start-too-large"
                            : "gfl5r.tactical_grid.settings.validate.start-too-small",
                        isErrorOnPrevious
                            ? { nextRangeIndex: Number(rangeIndex), nextStart: range.start }
                            : { previousRangeIndex: Number(previousRangeIndex), previousStart: previousStart }
                    )
                });
            }
            previousStart = range.start;
            previousRangeIndex = rangeIndex;
        }
        
        return Object.keys(failure.fields).length > 0 ? failure : true;
    }

    /**
     * Validates and cleans the world portion of the tactical grid settings.
     *
     * Expands raw form data, validates it against the schema, updates form input
     * error states and tooltips, and returns a cleaned object ready to save.
     *
     * @param {foundry.applications.ux.FormDataExtended} formData - The submitted form data.
     * @param {Event} [event] - Optional event for determining which field changed.
     * @returns {WorldSettings} A cleaned and validated copy of the world settings.
     * @private
     */
    static #validateAndCleanWorldSettings(formData, event) {
        const expanded = foundry.utils.expandObject(formData.object).gfl5r["tactical-grid-settings-world"];
        const validate = TacticalGridSettingsGFL5R.#schema.world.validate(expanded, { element: event.target});

        // validation from Number etc. itself has the error key just as "ranges.0.start" 
        // so fixing that here so that we can directly reference they html elements
        const prefix = "gfl5r.tactical-grid-settings-world.";
        const failures = Object.fromEntries(
            Object.entries(validate?.asError()?.getAllFailures() ?? {}).map(([key, value]) => [
                key.startsWith(prefix) ? key : `${prefix}${key}`,
                value
            ])
        );
    
        // Return cleaned schema so that we have something that is somewhat correct we can save
        return {
            cleaned: TacticalGridSettingsGFL5R.#schema.world.clean(expanded),
            failure: failures
        }
    }

    /**
     * Applies a validation message to a form element.
     * 
     * @param {HTMLElement} element - The element to apply validation to
     * @param {string|null} message - The validation message, or null to clear
     * @private
     */
    static #applyValidationMessage(element, message) {
        if (message) {
            element.setCustomValidity(message);
            element.dataset.tooltip = message;
            element.ariaLabel = game.i18n.localize(element.dataset.tooltip);
            game.tooltip.activate(element, {
                direction: foundry.CONFIG.ux.TooltipManager.TOOLTIP_DIRECTIONS.RIGHT,
                locked: true
                });
        }
        else {
            element?.setCustomValidity("");
            delete element?.dataset?.tooltip
        }
    }


    /**
     * Applies validation state to all range band start fields.
     * 
     * @param {Object} failures - Validation failures keyed by field name
     * @private
     */
    static #applyValidationState(failures) {
        for (let i = 0; i < 7; i++) {
            const name = `gfl5r.tactical-grid-settings-world.ranges.${i}.start`;
            this.#applyValidationMessage(
                document.getElementsByName(name)[0],
                failures?.[name]?.message || null
            );
        }
    }
  
    /**
     * Handles form submission.
     * 
     * @param {Event} event - The submission event
     * @param {HTMLFormElement} form - The form element
     * @param {foundry.applications.ux.FormDataExtended} formData - The submitted form data
     * @returns {Promise<void>}
     * @private
     */
    static async #onSubmit(event, form, formData) {
        const { 
            cleaned: cleanedWorldSettings, 
            failure: validationFailures 
        } = TacticalGridSettingsGFL5R.#validateAndCleanWorldSettings(formData, event);
        TacticalGridSettingsGFL5R.#applyValidationState(validationFailures);

        TacticalGridSettingsGFL5R.#setting.world = cleanedWorldSettings;
        TacticalGridSettingsGFL5R.#setting.client = foundry.utils.expandObject(formData.object).gfl5r["tactical-grid-settings-client"];

        const promises = [];
        promises.push(game.settings.set(CONFIG.gfl5r.namespace, "tactical-grid-settings-world", TacticalGridSettingsGFL5R.#setting.world));
        promises.push(game.settings.set(CONFIG.gfl5r.namespace, "tactical-grid-settings-client", TacticalGridSettingsGFL5R.#setting.client));
        await Promise.all(promises);
    }
  

    /**
     * Handles reset action to restore default settings.
     * 
     * @param {Event} event - The reset event
     * @returns {Promise<void>}
     * @private
     */
    static async #onReset(event) {
        const client = TacticalGridSettingsGFL5R.clientSchema.clean();
        const world = TacticalGridSettingsGFL5R.worldSchema.clean();
        TacticalGridSettingsGFL5R.#setting = foundry.utils.deepClone({client: client, world: world});
        
        await this.render({ force: false });
    }
  }
  