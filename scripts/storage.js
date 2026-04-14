/**
 * Client side volatile storage - Store things like collapsible state (refresh kill it)
 */
export class Storage {
    store = new Map();

    /**
     * Get list of active keys for this app
     * @param  {string} app
     * @return {string[]}
     */
    getAppKeys(app) {
        if (!this.store.has(app)) {
            return [];
        }
        return Array.from(this.store.get(app).keys());
    }

    /**
     * Toggle a key for this app
     * @param {string} app app name, ex "actor-Zca44Nv7ydMcNN9p"
     * @param {string} key Key name, ex "toggle-skill-category-martial"
     */
    toggleKey(app, key) {
        if (this.store.has(app)) {
            const appMap = this.store.get(app);
            if (appMap.has(key)) {
                appMap.delete(key);
            } else {
                appMap.set(key, true);
            }
        } else {
            // Create app map
            const appMap = new Map();
            appMap.set(key, true);
            this.store.set(app, appMap);
        }
    }
}
