import { DropdownMixin } from "./gfl5r-dropdown-mixin.js";

const { AbstractMultiSelectElement } = foundry.applications.elements;

/**
 * A custom `<gfl5r-multi-select>` form element providing Select2-style chip multi-selection.
 *
 * Stores **multiple string values** from a fixed option list, shown as removable chips inside
 * the input box. A live-search input filters the dropdown as the user types. Use this when a
 * field holds an unordered collection of values (e.g. a set of skills, tags, or abilities).
 * For storing a single value — predefined or free-text — use {@link GFL5RHtmlComboBoxElement} instead.
 *
 * The element's `value` getter returns a comma-separated string (e.g. `"fire,water"`),
 * which is what `FormData` will read on submission. `_getValue()` returns a plain Array,
 * which is what `FormDataExtended` will use.
 *
 * Pre-selection on render is handled via the `value` attribute on the element — NOT via
 * `{{selectOptions selected=...}}`, which cannot handle comma-separated strings. Use
 * `{{selectOptions}}` without `selected` purely to render the available options, and let
 * the `value` attribute drive pre-selection. Since `getAttribute()` always returns a string,
 * passing a `Set` or `Array` via Handlebars will not work correctly — always pass a
 * comma-separated string to `value=`.
 *
 * Prefer {@link Gfl5rSetField} + `{{formGroup}}` when wiring this into a DataModel — the
 * field handles the full round-trip automatically.
 *
 * @example
 * ```hbs
 * {{!-- Use value= (comma-separated string) for pre-selection, not selectOptions selected= --}}
 * <gfl5r-multi-select name="elements" value="{{data.elements}}">
 *   {{selectOptions choices localize=true}}
 * </gfl5r-multi-select>
 * ```
 *
 * @example
 * // Static factory — use only when building outside of Foundry's field/template system:
 * const el = Gfl5rHtmlMultiSelectElement.create({
 *   name:    "elements",
 *   options: [{ value: "fire", label: "Fire" }, { value: "water", label: "Water" }],
 *   value:   "fire,water",   // comma-separated pre-selection
 * });
 * form.appendChild(el);
 *
 * // Reading the value back:
 * el.value;        // "fire,water"    — comma-separated string, compatible with FormData
 * el._getValue();  // ["fire","water"] — array, compatible with FormDataExtended
 */
export class Gfl5rHtmlMultiSelectElement extends DropdownMixin(
    AbstractMultiSelectElement,
    { multiSelect: true, debounceMs: 150 }
) {
    /** @override */
    static tagName = "gfl5r-multi-select";

    /** @type {HTMLDivElement} — outer box containing chips, input, clear button */
    #selectionBox;

    /** @type {HTMLDivElement} — chips are injected here */
    #chipList;

    /** @type {HTMLSpanElement} — auto-sizing wrapper around the search input */
    #inputSizer;

    /** @type {HTMLButtonElement} — trailing clear-all button */
    #clearButton;

    /** @type {Set<string>} */
    #disabledValues = new Set();

    /** @type {Map<string, string>} */
    #tooltips = new Map();


    /**
     * Returns a comma-separated string
     * FormData reads this via field.value.
     * @override
     */
    get value() {
        return Array.from(this._value).join(",");
    }

    /** @override */
    set value(val) {
        this._value.clear();
        const values = Array.isArray(val) ? val : String(val).split(",").filter(Boolean);
        for (const v of values) {
            this._value.add(v);
        }
        this._internals.setFormValue(this.value);
        this._refresh();
    }

    /**
     * Return an array so FormDataExtended.object[name] matches Foundry's own
     * HTMLMultiSelectElement — both field.value (string) and .object (array) are correct.
     * @override
     * @protected
     */
    _getValue() {
        return Array.from(this._value);
    }

    /**
     * Accept either an array or comma-separated string when Foundry calls _setValue().
     * @override
     * @protected
     */
    _setValue(val) {
        const values = Array.isArray(val) ? val : String(val).split(",").filter(Boolean);
        if (values.some(v => v && !(v in this._choices))) {
            throw new Error("The values assigned to a multi-select element must all be valid options.");
        }
        this._value.clear();
        for (const v of values) {
            this._value.add(v);
        }
    }

    /** @override */
    _initialize() {
        super._initialize(); // fills this._choices, this._value, this._options
        for (const option of this.querySelectorAll("option")) {
            if (option.disabled)
                this.#disabledValues.add(option.value);
            if (option.title)
                this.#tooltips.set(option.value, option.title);
        }
        if (this.hasAttribute("value")) {
            this._setValue(this.getAttribute("value"));
        }
    }

    /* -------------------------------------------- */
    /*  Element Lifecycle                           */
    /* -------------------------------------------- */

    /** @override */
    _buildElements() {
        // Ask mixin to build <input> + <ul>, then re-home them into our structure.
        const mixinWrapper = this._buildDropdownElements({
            placeholder: this.getAttribute("placeholder")
                ?? game.i18n.localize("gfl5r.multiselect.placeholder"),
        });
        const searchInput  = mixinWrapper.querySelector("input.input");
        const dropdownList = mixinWrapper.querySelector("ul.dropdown");

        // Selection box
        this.#selectionBox = document.createElement("div");
        this.#selectionBox.classList.add("selection-box");

        // Chip list
        this.#chipList = document.createElement("div");
        this.#chipList.classList.add("chip-list");

        // Auto-sizing sizer — CSS grid trick: ::after mirrors data-value, input shares the cell
        this.#inputSizer = document.createElement("span");
        this.#inputSizer.classList.add("input-sizer");
        this.#inputSizer.dataset.value = "";
        this.#inputSizer.append(searchInput);

        // Clear-all button
        this.#clearButton = document.createElement("button");
        this.#clearButton.type = "button";
        this.#clearButton.classList.add("clear-btn");
        this.#clearButton.setAttribute("aria-label",
            game.i18n.localize("gfl5r.multiselect.clear_all") ?? "Clear all");
        this.#clearButton.textContent = "×";
        this.#clearButton.hidden = true;

        this.#selectionBox.append(this.#chipList, this.#inputSizer, this.#clearButton);

        // Container: selection box + dropdown must share the same positioned ancestor.
        const container = document.createElement("div");
        container.classList.add("multi-select-container");
        container.append(this.#selectionBox, dropdownList);

        this._primaryInput = searchInput;
        return [container];
    }

    /** @override */
    _activateListeners() {
        this._activateDropdownListeners();
        const signal = this.abortSignal;

        this.#selectionBox.addEventListener("mousedown", this.#onBoxMouseDown.bind(this), { signal });
        this.#chipList.addEventListener("click",         this.#onChipClick.bind(this),    { signal });
        this.#clearButton.addEventListener("click",         this.#onClearAll.bind(this),     { signal });
        // stop the clear button from opening the selection box when pressing it
        this.#clearButton.addEventListener("mousedown", (event) => {event.preventDefault(); event.stopPropagation();}, {signal});
        this._dropdownInput.addEventListener("input",    () => this.#updateInputSizer(),         { signal });
    }

    /** @override */
    _toggleDisabled(disabled) {
        this._toggleDropdownDisabled(disabled);

        if (this.#selectionBox) {
            this.#selectionBox.classList.toggle("disabled", disabled);
        }

        if (this.#chipList) {
            this._refresh(); // re-render chips so × appears/disappears
        }
    }

    /** @override */
    _refresh() {
        const values = Array.from(this._value);
        this._internals.setFormValue(values.length ? values.join(",") : "");

        this.#renderChips(values);

        // Clear button: only visible when editable and something is selected.
        if (this.#clearButton) {
            this.#clearButton.hidden = (!this.editable || values.length === 0);
        }

        this.#updateInputSizer();
        this._dropdownRefresh();
    }

    /** @param {string[]} values */
    #renderChips(values) {
        if (!this.#chipList){
            return
        }
        this.#chipList.replaceChildren(...values.map(id => this.#buildChip(id)));
    }

    /** @param {string} id */
    #buildChip(id) {
        const chip = document.createElement("span");
        chip.classList.add("chip");
        chip.dataset.key = id;

        const label = document.createElement("span");
        label.classList.add("chip-label");
        label.textContent = this._choices[id] ?? id;
        chip.append(label);

        // Only add × when the element is editable (not disabled, not readonly).
        if (this.editable) {
            const remove = document.createElement("span");
            remove.classList.add("chip-remove");
            remove.setAttribute("aria-label", `Remove ${this._choices[id] ?? id}`);
            remove.setAttribute("aria-hidden", "true");
            remove.textContent = "×";
            chip.append(remove);
        }
        return chip;
    }

    /** Mirror typed text into the sizer span so CSS sizes the input correctly. */
    #updateInputSizer() {
        if (!this.#inputSizer || !this._dropdownInput)
            return;

        const input = this._dropdownInput;
        const text = input.value || input.placeholder || "";
        this.#inputSizer.dataset.value = text;
    }

    /** @override */
    _getDropdownOptions() {
        const makeOption = (option, group = null) => ({
            value: option.value,
            label: this._choices[option.value] ?? option.innerText,
            group,
            disabled: this.#disabledValues.has(option.value),
            tooltip: this.#tooltips.get(option.value) ?? "",
        });

        return this._options.flatMap(child => {
            if (child instanceof HTMLOptGroupElement) {
                return [...child.querySelectorAll("option")]
                    .filter(option => option.value)
                    .map(option => makeOption(option, child.label));
            }
            if (child instanceof HTMLOptionElement && child.value) {
                return makeOption(child);
            }
            return [];
        });
    }

    /** @override */
    _isOptionSelected(value) { 
        return this._value.has(value);
    }

    /** @override */
    _onDropdownPick(option) {
        const inValue = this._value.has(option.value);
        const inChoices = option.value in this._choices;
        if(!(inValue || inChoices))
            return;

        if (inValue) {
            this._value.delete(option.value);
        }
        else if(inChoices) {
            this._value.add(option.value);
        }

        this._internals.setFormValue(this.value);
        this._refresh();
        this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }

    #onBoxMouseDown(event) {
        // Fully block interaction when not editable.
        if (!this.editable) {
            event.preventDefault();
            return;
        }
        if (event.target.classList.contains("chip-remove"))
            return;
        if (event.target === this._dropdownInput)
            return;

        event.preventDefault();
        this._dropdownInput?.focus();
    }

    #onChipClick(event) {
        if (!event.target.classList.contains("chip-remove") || !this.editable)
            return;
        
        const chip = event.target.closest(".chip");
        if (!chip)
            return;
        
        this._value.delete(chip.dataset.key);
        this._internals.setFormValue(this.value);
        this._refresh();
        this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
        this._dropdownInput?.focus();
    }

    #onClearAll(event) {
        event.preventDefault();
        if (!this.editable)
            return;

        this._value.clear();
        this._internals.setFormValue("");
        this._refresh();
        this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }

    /* -------------------------------------------- */
    /*  Static Factory                              */
    /* -------------------------------------------- */

    static create(config) {
        const groups = prepareSelectOptionGroups(config);
        const element = document.createElement(Gfl5rHtmlMultiSelectElement.tagName);
        element.name = config.name;
        foundry.applications.fields.setInputAttributes(element, config);
        if (config.hideDisabledOptions) {
            element.toggleAttribute("hidedisabledoptions", true);
        }

        for (const groupEntry of groups) {
            let parent = element;
            if (groupEntry.group) {
                parent = _appendOptgroup(groupEntry.group, element);
            }
            for (const groupOption of groupEntry.options){
                _appendOption(groupOption, parent);
            }
        }
        return element;
    }
}

/* -------------------------------------------- */
/*  Module Helpers                              */
/* -------------------------------------------- */

function prepareSelectOptionGroups(config) {
    const result = foundry.applications.fields.prepareSelectOptionGroups(config);
    config.options.filter(option => option?.disabled || option?.tooltip).forEach(special => {
        result.forEach(group => {
            group.options.forEach(groupOption => {
                if (groupOption.value === special.value) {
                    groupOption.disabled = special.disabled;
                    groupOption.tooltip = special.tooltip;
                }
            });
        });
    });
    return result;
}

function _appendOptgroup(label, parent) {
    const element = document.createElement("optgroup");
    element.label = label;
    parent.appendChild(element);
    
    return element;
}

function _appendOption(option, parent) {
    const { value, label, selected, disabled, rule, tooltip } = option;
    if (value !== undefined && label !== undefined) {
        const element = document.createElement("option");
        element.value = value;
        element.innerText = label;
        if (selected) {
            element.toggleAttribute("selected", true);
        }
        if (disabled) {
            element.toggleAttribute("disabled", true);
        }
        if (tooltip) {
            element.setAttribute("title", tooltip);
        }
        parent.appendChild(element);
    }
    if (rule) {
        parent.insertAdjacentHTML("beforeend", "<hr>");
    }
}