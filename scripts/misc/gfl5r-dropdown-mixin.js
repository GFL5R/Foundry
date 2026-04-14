/**
 * @typedef {Object} DropdownMixinConfig
 * @property {boolean} [multiSelect=false]
 *   When true the dropdown toggles selection and stays open after a pick.
 *   When false a pick commits the value and closes (combo-box mode).
 * @property {number} [debounceMs=150]
 *   Trailing-debounce delay in milliseconds for dropdown re-renders while typing.
 */

/**
 * DropdownMixin
 *
 * Adds a fully custom `<ul role="listbox">` dropdown to any AbstractFormInputElement
 * subclass. Handles UI only — building, opening, closing, rendering options, and keyboard
 * navigation. Has no opinion about how options are stored or how values are managed.
 *
 * ### Contract: three methods the host must implement
 *
 *  - `_getDropdownOptions()`
 *      Return `{ value, label, group, disabled, tooltip }[]` — the full unfiltered list.
 *
 *  - `_isOptionSelected(value)` → boolean
 *      Return whether a given value is currently selected.
 *
 *  - `_onDropdownPick(option)` → void
 *      Called when the user picks an option. The mixin handles post-pick behaviour
 *      (close in single mode, re-render in multi mode) after this returns.
 *
 * ### Host responsibilities
 *  - Call `this._buildDropdownElements({ placeholder })` inside `_buildElements()`
 *    and include the returned wrapper in the returned array.
 *  - Call `this._activateDropdownListeners()` inside `_activateListeners()`.
 *  - Call `this._toggleDropdownDisabled(disabled)` inside `_toggleDisabled()`.
 *  - Call `this._dropdownRefresh()` inside `_refresh()` to keep checkmarks in sync.
 *
 * @param {typeof AbstractFormInputElement} Base
 * @param {DropdownMixinConfig} [mixinConfig={}]
 * @return {typeof Base}
 */
export function DropdownMixin(Base, mixinConfig = {}) {
    const {
        multiSelect  = false,
        debounceMs   = 150,
        /**
         * When true, closing the dropdown clears the search input text.
         * Use true for multi-select (search is transient) and false for
         * combo-box (the input IS the value and must persist after close).
         */
        clearOnClose = true,
    } = mixinConfig;

    return class DropdownMixinElement extends Base {

        /* --------------------------------------------------------- */
        /*  Private Fields                                           */
        /* --------------------------------------------------------- */

        /** @type {HTMLInputElement} */
        #searchInput;

        /** @type {HTMLUListElement} */
        #list;

        /** @type {boolean} */
        #open = false;

        /**
         * Snapshot of #open at the moment a focus event fires.
         * Lets us distinguish a fresh focus (should open) from a click
         * on an already-focused input (should toggle closed).
         * @type {boolean}
         */
        #wasOpenOnFocus = false;

        /** @type {number} */
        #activeIndex = -1;

        /** @type {HTMLLIElement[]} — flat list of pickable <li>s, excludes group headers */
        #optionElements = [];

        /** @type {Function} */
        #debouncedOpen;

        /**
         * Per-instance key so multiple elements on the same page never share a timer.
         * @type {string}
         */
        #debounceId = `gfl5r-dropdown-${foundry.utils.randomID()}`;

        /**
         * The search input element. The host should assign this to `this._primaryInput`.
         * @return {HTMLInputElement}
         */
        get _dropdownInput() {
            return this.#searchInput;
        }

        /**
         * Build the search `<input>` + `<ul>` dropdown inside a positioned wrapper div.
         * Include the returned element in the array returned from `_buildElements()`.
         *
         * @param {object} [opts]
         * @param {string} [opts.placeholder=""]
         * @return {HTMLDivElement}
         */
        _buildDropdownElements({ placeholder = "" } = {}) {
            const wrapper = document.createElement("div");
            wrapper.classList.add("wrapper");

            this.#searchInput = document.createElement("input");
            this.#searchInput.type = "text";
            this.#searchInput.classList.add("input");
            this.#searchInput.setAttribute("autocomplete", "off");
            this.#searchInput.setAttribute("role", "combobox");
            this.#searchInput.setAttribute("aria-autocomplete", "list");
            this.#searchInput.setAttribute("aria-expanded", "false");
            this.#searchInput.setAttribute("aria-haspopup", "listbox");
            if (placeholder) {
                this.#searchInput.setAttribute("placeholder", placeholder);
            }

            this.#list = document.createElement("ul");
            this.#list.classList.add("dropdown");
            this.#list.setAttribute("role", "listbox");
            if (multiSelect) {
                this.#list.setAttribute("aria-multiselectable", "true");
            }
            this.#list.hidden = true;

            this.#syncOffset();
            wrapper.append(this.#searchInput, this.#list);
            return wrapper;
        }

        /** Attach dropdown event listeners. Call inside `_activateListeners()`. */
        _activateDropdownListeners() {
            const signal = this.abortSignal;

            this.#debouncedOpen = game.gfl5r.HelpersGfl5r.debounce(
                this.#debounceId,
                (query) => this.#openDropdown(query),
                debounceMs,
                false  // trailing — fires after the user pauses
            );

            this.#searchInput.addEventListener("mousedown", this.#onMouseDown.bind(this), { signal });
            this.#searchInput.addEventListener("focus",   this.#onFocus.bind(this),   { signal });
            this.#searchInput.addEventListener("input",   this.#onInput.bind(this),   { signal });
            this.#searchInput.addEventListener("keydown", this.#onKeydown.bind(this), { signal });
            this.#searchInput.addEventListener("blur",    this.#onBlur.bind(this),    { signal });
        }

        /**
         * Enable or disable the search input. Call inside `_toggleDisabled()`.
         * @param {boolean} disabled
         */
        _toggleDropdownDisabled(disabled) {
            if (this.#searchInput) {
                this.#searchInput.disabled = disabled;
            }
        }

        /* --------------------------------------------------------- */
        /*  Refresh                                                  */
        /* --------------------------------------------------------- */

        /**
         * Re-render the open dropdown in place so checkmarks and disabled states
         * stay in sync with the current value. Call inside `_refresh()`.
         */
        _dropdownRefresh() {
            if (this.#open) {
                this.#renderOptions(this.#filter(this.#searchInput?.value ?? ""));
            }
        }

        /**
         * @abstract
         * @return {{ value: string, label: string, group: string|null, disabled?: boolean, tooltip?: string }[]}
         */
        _getDropdownOptions() {
            throw new Error(`${this.constructor.name} must implement _getDropdownOptions()`);
        }

        /**
         * @abstract
         * @param {string} value
         * @return {boolean}
         */
        _isOptionSelected(value) {
            throw new Error(`${this.constructor.name} must implement _isOptionSelected()`);
        }

        /**
         * @abstract
         * @param {{ value: string, label: string }} option
         */
        _onDropdownPick(option) {
            throw new Error(`${this.constructor.name} must implement _onDropdownPick()`);
        }

        /**
         * Case-insensitive label filter over `_getDropdownOptions()`.
         * Returns all options when query is empty.
         * @param {string} query
         * @return {object[]}
         */
        #filter(query) {
            const all = this._getDropdownOptions();
            if (!query) {
                return all;
            }
            const lower = query.toLowerCase();
            return all.filter(option => option.label.toLowerCase().includes(lower));
        }

        #openDropdown(query = "") {
            this.#renderOptions(this.#filter(query));
            this.#list.hidden = false;
            this.#searchInput.setAttribute("aria-expanded", "true");
            this.#open = true;
            this.#activeIndex = -1;
            this._onDropdownOpened();
        }

        /**
         * Called when the dropdown opens. Override in host classes to snapshot
         * the current value so _onDropdownClosed can compare against it.
         * Default is a no-op.
         * @protected
         */
        _onDropdownOpened() {}

        #closeDropdown() {
            this.#list.hidden = true;
            this.#searchInput.setAttribute("aria-expanded", "false");
            this.#open = false;
            this.#wasOpenOnFocus = false;
            this.#activeIndex = -1;
            this.#optionElements = [];
            // In combo-box mode the input IS the value, so we leave it intact.
            // In multi-select mode the search text is transient and should reset.
            if (clearOnClose && this.#searchInput) {
                this.#searchInput.value = "";
            }
            // Notify the host that the dropdown has closed. Hosts can override this
            // to fire a single change event after a multi-pick session.
            this._onDropdownClosed();
        }

        /**
         * Called when the dropdown closes. Override in host classes to fire a
         * consolidated change event after a multi-pick session.
         * Default is a no-op.
         * @protected
         */
        _onDropdownClosed() {}

        #renderOptions(options) {
            this.#list.innerHTML = "";
            this.#optionElements = [];

            // hideDisabledOptions is a host-level attribute, read via the DOM.
            const visible = this.hasAttribute("hidedisabledoptions")
                ? options.filter(o => !o.disabled)
                : options;

            if (!visible.length) {
                const empty = document.createElement("li");
                empty.classList.add("no-results");
                empty.textContent = game.i18n.localize("gfl5r.multiselect.no_results") ?? "No matches";
                empty.setAttribute("aria-disabled", "true");
                this.#list.append(empty);
                return;
            }

            // Bucket into groups, preserving insertion order.
            const groups    = new Map();
            const ungrouped = [];
            for (const option of visible) {
                if (option.group) {
                    if (!groups.has(option.group)) groups.set(option.group, []);
                    groups.get(option.group).push(option);
                } else {
                    ungrouped.push(option);
                }
            }

            for (const [label, options] of groups) {
                const header = document.createElement("li");
                header.classList.add("group");
                header.setAttribute("role", "presentation");
                header.textContent = label;
                this.#list.append(header);
                for (const option of options) {
                    this.#list.append(this.#buildOptionEl(option));
                }
            }
            for (const option of ungrouped){
                this.#list.append(this.#buildOptionEl(option));
            }
        }

        #buildOptionEl(option) {
            const selected = this._isOptionSelected(option.value);
            const disabled = !!option.disabled;

            const li = document.createElement("li");
            li.classList.add("option");
            if (selected) {
                li.classList.add("selected");
            }
            if (disabled) {
                li.classList.add("disabled");
            }
            li.setAttribute("role", "option");
            li.setAttribute("aria-selected", String(selected));
            li.setAttribute("aria-disabled",  String(disabled));
            li.dataset.value = option.value;

            if (multiSelect) {
                const check = document.createElement("span");
                check.classList.add("checkmark");
                check.setAttribute("aria-hidden", "true");
                li.append(check);
            }

            const labelEl = document.createElement("span");
            labelEl.classList.add("label");
            labelEl.textContent = option.label;
            li.append(labelEl);

            if (selected && multiSelect) {
                li.title = game.i18n.localize("gfl5r.multiselect.already_in_filter");
            } else if (disabled && option.tooltip) {
                li.title = option.tooltip;
            }

            if (!disabled) {
                li.addEventListener("mouseenter", () => {
                    for (const element of this.#optionElements) {
                        element.classList.remove("active");
                    }
                    this.#activeIndex = this.#optionElements.indexOf(li);
                    li.classList.add("active");
                });
                li.addEventListener("mouseleave", () => {
                    li.classList.remove("active");
                    this.#activeIndex = -1;
                });
                li.addEventListener("mousedown", (event) => {
                    event.preventDefault(); // keep focus on the search input
                    this.#pick(option);
                });
            }

            this.#optionElements.push(li);
            return li;
        }

        #pick(option) {
            this._onDropdownPick(option);
            if (multiSelect) {
                // Stay open — re-render so checkmarks reflect the new state.
                this.#renderOptions(this.#filter(this.#searchInput.value));
            } else {
                this.#closeDropdown();
            }
        }

        #moveHighlight(direction) {
            if (!this.#optionElements.length) {
                return;
            }
            const prev = this.#optionElements[this.#activeIndex];
            if (prev) {
                prev.classList.remove("active");
            }

            this.#activeIndex = Math.max(
                -1,
                Math.min(this.#optionElements.length - 1, this.#activeIndex + direction)
            );

            const next = this.#optionElements[this.#activeIndex];
            if (next) {
                next.classList.add("active");
                next.scrollIntoView({ block: "nearest" });
            }
        }

        #syncOffset() {
            if (!this.#searchInput || !this.#list) {
                return;
            }
            const offset = this.#searchInput.offsetLeft;
            this.#list.style.left  = `${offset}px`;
            this.#list.style.right = `-${offset}px`;
        }

        /**
         * Handles click-to-toggle behaviour.
         *
         * Three cases:
         *  1. Dropdown is open  → close it. preventDefault stops blur firing, which
         *     would otherwise trigger a second close via #onBlur.
         *  2. Dropdown is closed AND input is already focused → open immediately.
         *     In this case focus will NOT fire again (input never blurred after the
         *     previous preventDefault), so we must open here rather than in #onFocus.
         *  3. Dropdown is closed AND input is not yet focused → do nothing; the
         *     browser will fire focus naturally and #onFocus will open the dropdown.
         */
        #onMouseDown(event) {
            this.#wasOpenOnFocus = this.#open;
            if (this.#open) {
                event.preventDefault();
                this.#closeDropdown();
            } else if (document.activeElement === this.#searchInput) {
                // Case 2: already focused, focus won't re-fire — open directly.
                this.#openDropdown(this.#searchInput.value);
            }
        }

        #onFocus(event) {
            // Only open if mousedown didn't already handle it (cases 1 & 2 above).
            if (!this.#wasOpenOnFocus && document.activeElement === this.#searchInput) {
                this.#openDropdown(this.#searchInput.value);
            }
        }

        #onInput(event) {
            this.#debouncedOpen(this.#searchInput.value);
        }

        /**
         * Close the dropdown when focus genuinely leaves the component.
         *
         * event.relatedTarget is the element that is RECEIVING focus. If it is
         * inside our host element (e.g. the clear button, a chip remove span that
         * managed to steal focus) we leave the dropdown open. Only when focus moves
         * completely outside do we close — and we do so synchronously, so that
         * _onDropdownClosed fires its change event BEFORE the browser hands control
         * to whatever the user clicked. This eliminates the 100 ms race where Foundry
         * could read stale FormData between the blur and a deferred close.
         */
        #onBlur(event) {
            if (this.contains(event.relatedTarget)) {
                return;
            }
            this.#closeDropdown();
        }

        #onKeydown(event) {
            if (!this.#open) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    this.#openDropdown(this.#searchInput.value);
                }
                return;
            }
            switch (event.key) {
                case "ArrowDown": {
                    event.preventDefault();
                    this.#moveHighlight(1);
                } break;
                case "ArrowUp": {
                    event.preventDefault();
                    this.#moveHighlight(-1);
                }break;
                case "Enter": {
                    event.preventDefault();
                    if (this.#activeIndex >= 0) {
                        const li     = this.#optionElements[this.#activeIndex];
                        const option = this._getDropdownOptions().find(option => option.value === li.dataset.value);
                        if (option) {
                            this.#pick(option);
                        }
                    } else {
                        this.#closeDropdown();
                    }
                } break;
                case "Escape": {
                    event.preventDefault();
                    this.#closeDropdown();
                } break;
                case "Tab": {
                    this.#closeDropdown();
                } break;
            }
        }
    };
}