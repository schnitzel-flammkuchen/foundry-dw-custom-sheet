/**
 * DWCS Settings Registration
 * Allows dynamic creation of new move types.
 */
export function registerDWCSSettings() {

    const defaultMoveTypes = {
        adventure: { singular: "DWCS.Custom.Move.Adventure", plural: "DWCS.Custom.Moves.Adventure" },
        travel:    { singular: "DWCS.Custom.Move.Travel",    plural: "DWCS.Custom.Moves.Travel" },
        session:   { singular: "DWCS.Custom.Move.Session",   plural: "DWCS.Custom.Moves.Session" }
    };

    game.settings.register("dw-custom-sheet", "customMoveTypes", {
        name: "DWCS.Custom.MoveTypes.name",
        hint: "DWCS.Custom.MoveTypes.hint",
        scope: "world",
        config: true,
        type: String,
        default: JSON.stringify(defaultMoveTypes, null, 2),
        onChange: value => {
            try {
                JSON.parse(value);
            } catch (err) {
                ui.notifications.error("DWCS: Invalid JSON in customMoveTypes setting.");
                console.error("Invalid JSON in customMoveTypes:", err);
            }
        }
    });
}

/**
 * Utility function to get the registered custom move types.
 * Returns an object where key = moveType, value = { singular, plural }.
 */
export function getCustomMoveTypes() {
    const raw = game.settings.get("dw-custom-sheet", "customMoveTypes") || "{}";
    try {
        const parsed = JSON.parse(raw);
        // Ensure each entry has singular and plural
        for (const key of Object.keys(parsed)) {
            if (!parsed[key].singular) parsed[key].singular = key;
            if (!parsed[key].plural) parsed[key].plural = parsed[key].singular + "s";
        }
        return parsed;
    } catch (e) {
        console.error("DWCS: Invalid JSON in \"customMoveTypes\" setting", e);
        return {};
    }
}