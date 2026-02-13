/**
 * DWCS Settings Registration
 * Allows dynamic creation of new move types.
 */
export function registerDWCSSettings() {

    game.settings.register("dw-custom-sheet", "customMoveTypes", {
        name: "DWCS.Custom.MoveTypes.name",
        hint: "DWCS.Custom.MoveTypes.hint",
        scope: "world",
        config: true,
        type: String,
        default: JSON.stringify({
            adventure: "DWCS.Custom.Moves.Adventure",
            travel: "DWCS.Custom.Moves.Travel",
            session: "DWCS.Custom.Moves.Session"
        }, null, 2)
    });
}

/**
 * Utility function to get the registered custom move types.
 * Returns an object where key = moveType, value = localized string.
 */
export function getCustomMoveTypes() {
    try {
        return JSON.parse(
            game.settings.get("dw-custom-sheet", "customMoveTypes") || "{}"
        );
    } catch (e) {
        console.error("Invalid JSON in \"customMoveTypes\" setting");
        return {};
    }
}