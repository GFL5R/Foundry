const { CompendiumDirectory } = foundry.applications.sidebar.tabs;

export class CompendiumDirectoryGfl5r extends CompendiumDirectory {

    /** @inheritdoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.sidebarIcon = foundry.applications.sidebar.Sidebar.TABS.compendium.icon;
        return context;
    }

    /**
     * Sort the sidebar pack/folder listing alphabetically by label/name,
     * regardless of the manual order configured in system.json packFolders.
     * @inheritdoc
     */
    async _prepareDirectoryContext(context, options) {
        await super._prepareDirectoryContext(context, options);
        context.tree = this.#sortedTree(context.tree);
    }

    /**
     * Build a copy of the directory tree whose folder children and pack
     * entries are ordered alphabetically (locale-aware).
     * @param {object} tree    A node of the game.packs tree.
     * @returns {object}       A new node with sorted children/entries.
     */
    #sortedTree(tree) {
        const collator = new Intl.Collator(game.i18n.lang, { sensitivity: "base" });
        const sortNode = (node) => ({
            ...node,
            entries: [...node.entries].sort((a, b) =>
                collator.compare(a.metadata?.label ?? a.name ?? "", b.metadata?.label ?? b.name ?? "")),
            children: node.children.map(sortNode)
                .sort((a, b) => collator.compare(a.folder?.name ?? "", b.folder?.name ?? ""))
        });
        return sortNode(tree);
    }
}
