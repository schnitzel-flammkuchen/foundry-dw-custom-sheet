/**
 * DWCS Settings Registration
 * Allows dynamic creation of new move types and control over
 * which types appear in the sidebar.
 */
export function registerDWCSSettings() {

  // Default custom move types (used when resetting or first installing)
  const defaultMoveTypes = {
    adventure: { singular: "DWCS.Custom.Move.Adventure", plural: "DWCS.Custom.Moves.Adventure" },
    travel: { singular: "DWCS.Custom.Move.Travel", plural: "DWCS.Custom.Moves.Travel" },
    session: { singular: "DWCS.Custom.Move.Session", plural: "DWCS.Custom.Moves.Session" }
  };

  // Default sidebar placement configuration.
  // true  = appears in sidebar
  // false = appears in main moves tab
  const defaultSidebarTypes = {
    adventure: false,
    travel: false,
    session: false
  };

  /* --- Custom Move Types (JSON string setting) --- */

  // Stores custom move types as a JSON string.
  // Key   = moveType
  // Value = { singular, plural }
  game.settings.register("dw-custom-sheet", "customMoveTypes", {
    name: "DWCS.Custom.MoveTypes.name",
    hint: "DWCS.Custom.MoveTypes.hint",
    scope: "world",
    config: true,
    type: String,
    default: JSON.stringify(defaultMoveTypes, null, 2),

    // Validate JSON whenever the setting changes
    onChange: value => {
      try {
        JSON.parse(value);
      } catch (err) {
        ui.notifications.error("DWCS: Invalid JSON in customMoveTypes setting.");
        console.error("Invalid JSON in \"customMoveTypes\":", err);
      }
    }
  });

  /* --- Sidebar Move Types (JSON string setting) --- */

  // Stores which moveTypes should be rendered in the sidebar.
  // Key   = moveType
  // Value = boolean (true = sidebar, false = main tab)
  game.settings.register("dw-custom-sheet", "sidebarMoveTypes", {
    name: "DWCS.Custom.SidebarMoves.name",
    hint: "DWCS.Custom.SidebarMoves.hint",
    scope: "world",
    config: true,
    type: String,
    default: JSON.stringify(defaultSidebarTypes, null, 2),

    // Validate JSON whenever the setting changes
    onChange: value => {
      try {
        JSON.parse(value);
      } catch (err) {
        ui.notifications.error("DWCS: Invalid JSON in sidebarMoveTypes setting.");
        console.error("Invalid JSON in \"sidebarMoveTypes\":", err);
      }
    }
  });
}

/* --- Utilities --- */

/**
 * Utility function to get the registered custom move types.
 * Returns an object where:
 * key   = moveType
 * value = { singular, plural }
 */
export function getCustomMoveTypes() {
  const raw = game.settings.get("dw-custom-sheet", "customMoveTypes") || "{}";

  try {
    const parsed = JSON.parse(raw);
    // Only ensure the parsed value is an object
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (e) {
    console.error("DWCS: Invalid JSON in \"customMoveTypes\" setting", e);
    return {};
  }
}

/**
 * Utility function to get sidebar placement configuration.
 * Returns an object where:
 * key   = moveType
 * value = boolean (true = sidebar, false = main tab)
 */
export function getSidebarMoveTypes() {
  const raw = game.settings.get("dw-custom-sheet", "sidebarMoveTypes") || "{}";

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("DWCS: Invalid JSON in \"sidebarMoveTypes\" setting", e);
    return {};
  }
}