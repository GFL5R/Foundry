/**
 * Extends the JournalEntity to process special things from L5R.
 */
export class JournalGfl5r extends JournalEntry {
    /**
     * Render the text template for this Journal (tooltips and chat)
     * @return {Promise<string|null>}
     */
    async renderTextTemplate() {
        const data = (await this.sheet?.getData()) || this;
        const pageData = data.pages[0];

        const tpl = await foundry.applications.handlebars.renderTemplate(`${CONFIG.gfl5r.paths.templates}journal/journal-text.html`, {
            data: pageData,
        });
        return tpl || null;
    }

    /**
     * Return the Current JournalEntryPage
     * @return JournalEntryPage
     */
    getCurrentPage() {
        return Array.from(this.pages)[this.sheet?.pageIndex || 0] || null;
    }
}
