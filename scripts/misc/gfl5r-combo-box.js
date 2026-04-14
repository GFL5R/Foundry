import { DropdownMixin } from "./gfl5r-dropdown-mixin.js";

const { AbstractFormInputElement } = foundry.applications.elements;

/**
 * A custom `<gfl5r-combo-box>` combining a free-text input with a filterable option dropdown.
 *
 * Stores a **single string value** — either a predefined option's `value` attribute, or
 * whatever the user typed freely. Use this when a field holds exactly one value, whether
 * chosen from a list or entered manually (e.g. a weapon name, a title, a custom skill).
 * For storing multiple values from a list, use {@link Gfl5rHtmlMultiSelectElement} instead.
 *
 * Picking a predefined option stores its `value` attribute while displaying its human-readable
 * label. Free-typing stores the typed string as both value and label. Fires `input` on every
 * keystroke and `change` only on commit (blur or Enter) to avoid triggering sheet re-renders
 * mid-typing. Picking from the dropdown fires both `input` and `change` immediately.
 *
 * Use `{{selectOptions}}` without `selected=` to render the available options, and set the
 * current value via the `value` attribute on the element directly.
 *
 * @example
 * ```hbs
 * {{!-- Pass current value via the element's `value` attribute, not selectOptions selected= --}}
 * <gfl5r-combo-box name="weapon" value="{{data.weapon}}">
 *   {{selectOptions choices localize=true}}
 * </gfl5r-combo-box>
 * ```
 *
 * @example
 * // Programmatic update — query the element by its name attribute, then set value directly.
 * // The visible input label updates automatically to match the selected option's label.
 * const el = document.querySelector("gfl5r-combo-box[name='weapon']");
 * el.value = "axe";       // input shows "Battleaxe", el.value returns "axe"
 *
 * // Free-text entry (no matching option) — value and label are both set to the typed string:
 * el.value = "naginata";  // input shows "naginata", el.value returns "naginata"
 */
export class GFL5RHtmlComboBoxElement extends DropdownMixin(
    AbstractFormInputElement,
    { multiSelect: false, debounceMs: 150, clearOnClose: false }
) {
    /**
     * The label currently shown in the text input. Differs from `_value` when a predefined
     * option is selected (value = option's value attribute, label = option's display text).
     * @type {string}
     */
    _label = "";

    /** @override */
    static tagName = "gfl5r-combo-box";

    /** @override */
    static observedAttributes = ["disabled", "placeholder", "value"];

    /**
     * Flat descriptor list built once in _initialize(), mirrors the light-DOM options.
     * @type {{ value: string, label: string, group: string|null }[]}
     */
    #options = [];

    /**
     * Value snapshot taken when the input receives focus.
     * Used by the blur handler to decide whether to fire a change event.
     * @type {string}
     */
    #valueAtFocus = "";

    /* -------------------------------------------- */
    /*  Accessors                                   */
    /* -------------------------------------------- */

    /** @override */
    get value() {
      return this._value ?? "";
    }

    set value(value) {
        const match = this.#options.find(option => option.value === String(value ?? ""));
        if (match) {
            this._value = match.value;
            this._label = match.label;
        }
        else {
            this._value = String(value ?? "");
            this._label = this._value;
        }
        this._internals.setFormValue(this._value);
        if (this._dropdownInput) {
          this._dropdownInput.value = this._label;
        }
        this.dispatchEvent(new Event("input",  { bubbles: true, cancelable: true }));
        this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }

    /**
     * AbstractFormInputElement does not have an _initialize() hook, so we override
     * connectedCallback to snapshot options from the light DOM before _buildElements()
     * is called by super.connectedCallback().
     *
     * We keep this minimal: just build the flat #options list so _getDropdownOptions()
     * and the value setter can look options up by value.
     * @override
     */
    connectedCallback() {
        this.#snapshotOptions();
        this.#resolveInitialValue();
        super.connectedCallback();
    }

    #snapshotOptions() {
        const makeOption = (option, group = null) => ({
            value: option.value,
            label: option.innerText,
            group,
        });

        this.#options = [...this.children].flatMap(child => {
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

    #resolveInitialValue() {
        // Honour a `value` attribute if set, otherwise find a selected option.
        const attrValue = this.getAttribute("value");
        const initial   = attrValue ?? this.#options.find(option => option.selected)?.value ?? "";
        const match     = this.#options.find(option => option.value === initial);
        if (match) {
            this._value = match.value;
            this._label = match.label;
        } else {
            this._value = initial;
            this._label = initial;
        }
    }

    /* -------------------------------------------- */
    /*  Element Lifecycle                           */
    /* -------------------------------------------- */

    /** @override */
    _buildElements() {
        const wrapper = this._buildDropdownElements({
            placeholder: this.getAttribute("placeholder") ?? "",
        });

        this._dropdownInput.value = this._label || this._value || "";
        this._primaryInput = this._dropdownInput;

        return [wrapper];
    }

    /** @override */
    _activateListeners() {
        const signal = this.abortSignal;
        this._activateDropdownListeners();

        // Prevent the inner <input>'s own native change from reaching Foundry's form handler.
        // We dispatch our own change at commit time only (see below).
        this._dropdownInput.addEventListener("change", (e) => e.stopPropagation(), { signal });

        // Free typing: update value and fire `input` immediately.
        // Do NOT fire `change` here — Foundry's form handler re-renders the sheet on
        // every `change` event, which would destroy the element mid-typing.
        // `change` is fired at commit time: on blur (if value changed) or Enter.
        this._dropdownInput.addEventListener("input", () => {
            const typed = this._dropdownInput.value;
            this._label = typed;
            this._value = typed;
            this._internals.setFormValue(typed);
            this.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
            // DropdownMixin's #onInput fires the debounced dropdown re-render.
        }, { signal });

        // Commit on blur if the value has changed since the element was focused.
        this._dropdownInput.addEventListener("focus", () => {
            this.#valueAtFocus = this._value;
        }, { signal });

        this._dropdownInput.addEventListener("blur", () => {
            if (this._value !== this.#valueAtFocus) {
                this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
            }
        }, { signal });

        // Commit on Enter for free-text values (not picked from the dropdown).
        this._dropdownInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this._dropdownInput.blur();
            }
        }, { signal });
    }

    /** @override */
    _toggleDisabled(disabled) {
        this._toggleDropdownDisabled(disabled);
        // Add/remove .disabled on the wrapper so CSS can dim the whole control.
        const wrapper = this.querySelector(".wrapper");
        if (wrapper) {
          wrapper.classList.toggle("disabled", disabled);
        }
    }

    /** @override */
    attributeChangedCallback(attrName, oldValue, newValue) {
        super.attributeChangedCallback(attrName, oldValue, newValue);
        if (attrName === "disabled") {
          this._toggleDropdownDisabled(newValue !== null);
        }
    }

    /** @override */
    _refresh() {
        if (!this._dropdownInput)
          return;
  
        this._dropdownInput.value = this._label ?? "";
        this._internals.setFormValue(this._value ?? "");
        this._dropdownRefresh();
    }

    /* -------------------------------------------- */
    /*  DropdownMixin Contract                      */
    /* -------------------------------------------- */

    /** @override */
    _getDropdownOptions() {
        return this.#options;
    }

    /** @override */
    _isOptionSelected(value) {
        return this._value === value;
    }

    /**
     * Commit the picked option as the current value and close the dropdown.
     * @override
     */
    _onDropdownPick(option) {
        this._value = option.value;
        this._label = option.label;
        this._dropdownInput.value = option.label;
        this._internals.setFormValue(option.value);
        this._dropdownInput.blur();
        this.dispatchEvent(new Event("input",  { bubbles: true, cancelable: true }));
        this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }
}