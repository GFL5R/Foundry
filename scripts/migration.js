/**
 * GFL5R Migration.
 * v0.2.0: Split "character" actor type into "human" and "doll".
 */
export class MigrationGfl5r {
    static NEEDED_VERSION = "0.2.0";

    static needUpdate(version) {
        const currentVersion = game.settings.get(CONFIG.gfl5r.namespace, "systemMigrationVersion");
        return foundry.utils.isNewerVersion(version, currentVersion);
    }

    static async migrateWorld({ force = false } = {}) {
        const currentVersion = game.settings.get(CONFIG.gfl5r.namespace, "systemMigrationVersion");
        if (!force && !foundry.utils.isNewerVersion("0.2.0", currentVersion)) {
            console.log("GFL5R | Migration already at v0.2.0, skipping.");
            return;
        }

        console.log("GFL5R | Running v0.2.0 migration: split character type into human/doll");

        // Find all actors with the old "character" type
        const oldCharacters = game.actors.filter(a => a.type === "character");
        console.log(`GFL5R | Found ${oldCharacters.length} actors with type "character"`);

        for (const actor of oldCharacters) {
            const charType = actor.system.identity?.characterType || "human";
            let newType = "human";
            const updateData = {};

            // Remove the characterType field from identity
            updateData["system.identity.-=characterType"] = null;

            if (charType === "t-doll") {
                newType = "doll";
                // Move frame/manufacturer/model if they're in identity path
                const frame = actor.system.identity?.frame;
                if (frame) {
                    updateData["system.identity.frame"] = frame;
                }
            } else if (charType === "transhuman") {
                newType = "human";
                updateData["system.identity.is_transhuman"] = true;
            } else {
                // human stays human
                newType = "human";
            }

            // Update the actor type
            try {
                await actor.update({
                    type: newType,
                    ...updateData,
                });
                console.log(`GFL5R | Migrated "${actor.name}" (${actor.id}): character → ${newType}`);
            } catch (err) {
                console.error(`GFL5R | Failed to migrate "${actor.name}" (${actor.id}):`, err);
            }
        }

        // Update migration version
        await game.settings.set(CONFIG.gfl5r.namespace, "systemMigrationVersion", "0.2.0");
        console.log("GFL5R | Migration to v0.2.0 complete.");
    }
}