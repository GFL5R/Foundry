/**
 * Manages tooltips for specified elements, showing asynchronously generated content on hover.
 * Tooltips are appended to a customizable container element.
 * Automatically cleans up event handlers and observers when target elements are removed.
 */
export class Gfl5rPopupManager {
    /** @type {string|jQuery} */
    #selector = null;

    /** @type {(event: MouseEvent) => Promise<string>} */
    #callback = null;

    /** @type {jQuery|null} */
    #elements = null;

    /** @type {MutationObserver|null} */
    #observer = null;

    /** @type {HTMLElement} */
    #container = null;

    /**
     * Increment number to ignore old tooltips if template is too long to load (#62)
     * @type {number}
     */
    #displayId = 0;

    /**
     * @param {string|jQuery} selector - Selector or jQuery object for tooltip-bound elements.
     * @param {(event: MouseEvent) => Promise<string>} callback - Async function returning tooltip HTML content.
     * @param {HTMLElement|jQuery} [container=document.body] - DOM element or jQuery object to contain the tooltip.
     */
    constructor(selector, callback, container = document.body) {
        this.#selector = selector;
        this.#callback = callback;
        this.#container = container instanceof jQuery ? container[0] : container;

        this.#bindEvents();
        this.#observeDOM();
    }

    /**
     * Bind mouseenter, mousemove, and mouseleave events to target elements.
     * Creates/removes tooltip elements on hover, and updates position on mouse move.
     * @private
     */
    #bindEvents() {
        this.#elements = $(this.#selector);

        this.#elements
            .on("mouseenter.popup", async (event) => {
                $(this.#container).find("#gfl5r-tooltip-ct").remove();

                // Memory save
                if (this.#displayId >= 200) {
                    this.#displayId = 0;
                }
                const currentDisplayId = ++this.#displayId;

                // Load the template, can take a while
                let tpl;
                try {
                    tpl = await this.#callback(event);
                } catch (err) {
                    console.error("GFL5R | Tooltip rendering failed", err);
                    return;
                }

                // Abort if no content or the target element is no longer in the DOM
                if (!tpl || !document.body.contains(event.currentTarget)) {
                    return;
                }

                // If mismatched, that tpl is too old, the user already display another tooltip
                if (this.#displayId !== currentDisplayId) {
                    return;
                }

                $(this.#container).append(
                    `<div id="gfl5r-tooltip-ct" class="gfl5r-tooltip gfl5r-tooltip-ct">${tpl}</div>`
                );
            })
            .on("mousemove.popup", (event) => {
                const popup = $(this.#container).find("#gfl5r-tooltip-ct");
                if (popup.length) {
                    popup.css(this.popupPosition(event, popup));
                }
            })
            .on("mouseleave.popup", () => {
                $(this.#container).find("#gfl5r-tooltip-ct").remove();
            });
    }

    /**
     * Creates a MutationObserver that watches for removal of tooltip-bound elements
     * and automatically destroys the manager if none remain.
     * @private
     */
    #observeDOM() {
        this.#observer = new MutationObserver(() => {
            const anyStillPresent = this.#elements?.toArray().some(el => document.body.contains(el));
            if (!anyStillPresent) {
                this.destroy();
            }
        });

        this.#observer.observe(this.#container, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Calculates CSS positioning for the tooltip based on mouse event,
     * constraining it inside the viewport.
     * @param {MouseEvent} event - The mouse event for position reference.
     * @param {jQuery} popup - The jQuery object representing the tooltip element.
     * @returns {{left: string, top: string, visibility: string}} CSS styles for tooltip positioning.
     */
    popupPosition(event, popup) {
        let left = event.clientX + 60;
        let top = event.clientY;

        const maxY = window.innerHeight - popup.outerHeight();
        if (top > maxY) {
            top = maxY - 10;
        }

        const maxX = window.innerWidth - popup.outerWidth();
        if (left > maxX) {
            left -= popup.outerWidth() + 100;
        }

        return {
            left: `${left}px`,
            top: `${top}px`,
            visibility: "visible"
        };
    }

    /**
     * Unbind all events, remove tooltip elements, and disconnect the MutationObserver.
     * Cleans up all references for proper garbage collection.
     */
    destroy() {
        if (this.#elements) {
            this.#elements.off(".popup");
        }

        $(this.#container).find("#gfl5r-tooltip-ct").remove();

        if (this.#observer) {
            this.#observer.disconnect();
            this.#observer = null;
        }

        this.#elements = null;
    }
}
