function getRangeband(gridSettings, distance) {
    const entries = Object.entries(gridSettings.ranges);
    for (let i = entries.length - 1; i >= 0; i--) {
        const [range, { start }] = entries[i];
        if (distance >= start) {
            return Number(range);
        }
    }
    return NaN;
}

export class RulerGfl5r extends foundry.canvas.interaction.Ruler {

    static WAYPOINT_LABEL_TEMPLATE = "systems/gfl5r/templates/" + "hud/tactical-grid-ruler.html"

    /** @override */
    _getWaypointLabelContext(waypoint, state) {
        const context = super._getWaypointLabelContext(waypoint, state);
        if (!context)
            return;

        const gridSettings = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-world");
        if(gridSettings.enabled) {
            const diagonalCost = game.canvas.grid.distance * waypoint.measurement.diagonals;
            context.distance.total = waypoint.measurement.distance.toNearest(0.1) + diagonalCost; //Diagonals count twice
            context.additional = {
                label: game.i18n.format("gfl5r.tactical_grid.range_abbreviation", {range: getRangeband(gridSettings, waypoint.measurement.distance)})
            };
        }
        return context;
    }

    /** @override */
    _getSegmentStyle(waypoint) {
        const context = super._getSegmentStyle(waypoint);
        const client = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-client");
        const gridSettings = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-world");
        if(gridSettings.enabled) {
            const rangeband = getRangeband(gridSettings, waypoint.measurement.distance);
            context.color = client.ranges[rangeband].color;
        }
        return context;
    }
}

export class TokenRulerGfl5r extends foundry.canvas.placeables.tokens.TokenRuler {
    static WAYPOINT_LABEL_TEMPLATE = "systems/gfl5r/templates/" + "hud/tactical-grid-ruler.html"

    /** @override */
    _getWaypointLabelContext(waypoint, state) {
        const context = super._getWaypointLabelContext(waypoint, state);
        if (!context)
            return;

        if (!this.token.actor)
            return context;

        const gridSettings = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-world");
        if(gridSettings.enabled) {
            const diagonalCost = game.canvas.grid.distance * waypoint.measurement.diagonals;
            context.cost.total = waypoint.measurement.cost.toNearest(0.1) + diagonalCost; //Diagonals count twice
            context.additional = {
                label: game.i18n.format("gfl5r.tactical_grid.range_abbreviation", {range: getRangeband(gridSettings, waypoint.measurement.distance)})
            };
        }
        return context;
    }

    /** @override */
    _getGridHighlightStyle(waypoint, offset) {
        const context = super._getGridHighlightStyle(waypoint, offset);
        const client = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-client");
        const gridSettings = game.settings.get(CONFIG.gfl5r.namespace, "tactical-grid-settings-world");
        if(gridSettings.enabled) {
            const rangeband = getRangeband(gridSettings, waypoint.measurement.distance);
            context.color = client.ranges[rangeband].color;
            context.alpha = client.ranges[rangeband].alpha;
        }
        return context;
    }
}