/**
 * Base JournalSheet for GFL5R
 * @extends {JournalSheet}
 */
export class BaseJournalSheetGfl5r extends foundry.appv1.sheets.JournalSheet {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sheet", "journal-sheet", "journal-entry", "gfl5r", "sheet", "journal"], // sheet journal-sheet journal-entry
            // template: CONFIG.gfl5r.paths.templates + "journal/journal-sheet.html",
            // width: 520,
            // height: 480,
            // tabs: [{ navSelector: ".journal-tabs", contentSelector: ".journal-body", initial: "description" }],
        });
    }

    /**
     * Add the SendToChat button on top of sheet
     * @override
     */
    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();

        // Send To Chat
        buttons.unshift({
            label: game.i18n.localize("gfl5r.global.send_to_chat"),
            class: "send-to-chat",
            icon: "fas fa-comment-dots",
            onclick: () =>
                game.gfl5r.HelpersGfl5r.debounce(
                    "send2chat-" + this.object.id,
                    () => game.gfl5r.HelpersGfl5r.sendToChat(this.object),
                    2000,
                    true
                )(),
        });

        return buttons;
    }

    /**
     * Activate a named TinyMCE text editor
     * @param {string} name             The named data field which the editor modifies.
     * @param {object} options          TinyMCE initialization options passed to TextEditor.create
     * @param {string} initialContent   Initial text content for the editor area.
     * @override
     */
    activateEditor(name, options = {}, initialContent = "") {
        // For Compatibility with old compendium modules (PRE gfl5r v0.1.0)
        if (initialContent) {
            initialContent = game.gfl5r.HelpersGfl5r.convertSymbols(initialContent, false);
        }
        return super.activateEditor(name, options, initialContent);
    }

    /**
     * Activate listeners after page content has been injected.
     * @protected
     */
    _activatePageListeners() {
        super._activatePageListeners();
        const html = this.element;

        // Commons
        game.gfl5r.HelpersGfl5r.commonListeners(html);

        // *** Everything below here is only needed if the sheet is editable ***
        // if (!this.isEditable) {
        //     return;
        // }
    }
}
