const { CompendiumDirectory } = foundry.applications.sidebar.tabs;

export class CompendiumDirectoryGfl5r extends CompendiumDirectory {

    /** @inheritdoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.sidebarIcon = foundry.applications.sidebar.Sidebar.TABS.compendium.icon;
        return context;
    }
}