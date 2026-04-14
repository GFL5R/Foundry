/**
 * GFL5R Migration stub.
 * No migrations needed for v0.1.0 (fresh system).
 */
export class MigrationGfl5r {
    static NEEDED_VERSION = "0.1.0";

    static needUpdate(version) {
        const currentVersion = game.settings.get(CONFIG.gfl5r.namespace, "systemMigrationVersion");
        return foundry.utils.isNewerVersion(version, currentVersion);
    }

    static async migrateWorld({ force = false } = {}) {
        console.log("GFL5R | v0.1.0, no migrations required.");
    }
}
