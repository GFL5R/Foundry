import { Gfl5rHtmlMultiSelectElement } from "../misc/gfl5r-multiselect.js";

/**
 * A Foundry `SetField` that renders as an {@link Gfl5rHtmlMultiSelectElement} chip-input.
 *
 * Use this in a DataModel schema whenever a field stores an unordered collection of
 * string values drawn from a fixed option list. On form submission the element returns a
 * comma-separated string; `clean()` splits it back into an Array before Foundry processes
 * it, and `initialize()` wraps the result in a `Set` for use in the model.
 *
 * @example
 * // In a DataModel schema:
 * skills: new Gfl5rSetField({
 *   options: [
 *     { value: "athletics",  label: "Athletics" },
 *     { value: "meditation", label: "Meditation", disabled: true, tooltip: "Requires rank 3" },
 *   ]
 * })
 *
 * // Renders automatically via {{formGroup}} in a Handlebars template:
 * // {{formGroup fields.skills name="skills" value=data.skills localize=true}}
 *
 * @param {object} options
 * @param {{ value: string, label: string, disabled?: boolean, tooltip?: string }[]} options.options
 *   Flat list of selectable items. Passed directly to {@link Gfl5rHtmlMultiSelectElement.create}.
 * @param {object[]} [options.groups]
 *   Optional optgroup definitions, forwarded to the element factory unchanged.
 * @param {boolean} [options.hideDisabledOptions=false]
 *   When true, disabled options are hidden from the dropdown instead of greyed out.
 */
export class Gfl5rSetField extends foundry.data.fields.SetField {
    /**
     * Saved constructor options, used to reconstruct the multiselect input on form render.
     * @type {object}
     */
    #savedOptions;

    /**
     * @param {object} options
     * @param {object} context
     */
    constructor(options = {}, context = {}) {
        super(
            new foundry.data.fields.StringField({
                choices: options.options?.map((option) => option.value) ?? [],
            }),
            options,
            context
        );

        this.#savedOptions = options;
    }

    /**
     * @param {*} value
     * @param {object} model
     * @param {object} options
     * @return {Set}
     * @override
     */
    initialize(value, model, options = {}) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return new Set();
        }

        return new Set(super.initialize(value, model, options).filter(Boolean));
    }

    /**
     * @param {Set} value
     * @return {*[]|*}
     * @override
     */
    toObject(value) {
        if (!value) {
            return value;
        }
        return Array.from(value).map((v) => this.element.toObject(v));
    }

    /**
     * @param {string|Array} value
     * @param {object} options
     * @return {Array}
     * @override
     */
    clean(value, options) {
        // Settings forms submit comma-separated strings; split before normal cleaning.
        if (typeof value === "string") {
            value = value.length ? value.split(",").filter(Boolean) : [];
        }
        return super.clean(value, options);
    }

    /**
     * @param {object} config
     * @return {Gfl5rHtmlMultiSelectElement}
     * @override
     */
    _toInput(config) {
        return Gfl5rHtmlMultiSelectElement.create({
            name: config.name,
            options: this.#savedOptions.options,
            groups: this.#savedOptions.groups,
            value: config.value,
            localize: config.localize,
            hideDisabledOptions: this.#savedOptions.hideDisabledOptions,
        });
    }
}