import { prepareHealthEstimateCompendium } from "./main.js";

/**
 * DWCS Settings Registration
 * Allows dynamic creation of new move types and control over
 * which types appear in the sidebar / have auto add of existent moves;
 * Also config to allow players (if owners/assistant) to edit secrets.
 */
export function registerDWCSSettings() {

  // -------------------------------
  // Default values
  // -------------------------------

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

  // -------------------------------
  // Helper validation functions
  // -------------------------------
  const validateObjectWithStrings = (obj, keys) => {
    if (typeof obj !== "object" || Array.isArray(obj)) return false;
    return Object.values(obj).every(v =>
      keys.every(k => typeof v[k] === "string")
    );
  };

  const validateObjectWithBooleans = (obj) => {
    if (typeof obj !== "object" || Array.isArray(obj)) return false;
    return Object.values(obj).every(v => typeof v === "boolean");
  };

  const validateArrayOfStrings = (arr) => {
    return Array.isArray(arr) && arr.every(el => typeof el === "string");
  };

  // -------------------------------
  // SETTINGS
  // -------------------------------

  /* --- Custom Move Types (JSON string setting) --- */

  // Stores custom move types as a JSON string.
  // Key   = moveType
  // Value = { singular, plural }
  game.settings.register("dw-custom-sheet", "customMoveTypes", {
    name: "DWCS.Settings.NewMoveTypes.name",
    hint: "DWCS.Settings.NewMoveTypes.hint",
    scope: "world",
    config: true,
    restricted: true, // Only GMs can change this setting
    type: String,
    default: JSON.stringify(defaultMoveTypes, null, 2),

    // Validate JSON whenever the setting changes
    onChange: value => {
      try {
        const parsed = JSON.parse(value);
        if (!validateObjectWithStrings(parsed, ["singular", "plural"])) throw new Error("Each move must have singular and plural strings.");
      } catch (err) {
        ui.notifications.error("DWCS: Invalid JSON in \"customMoveTypes\" setting. PLEASE, VERIFY!");
        console.error(err);
      }
    }
  });

  /* --- Sidebar Move Types (JSON string setting) --- */

  // Stores which moveTypes should be rendered in the sidebar.
  // Key = moveType
  // Value = boolean (true = sidebar, false = main tab)
  game.settings.register("dw-custom-sheet", "sidebarMoveTypes", {
    name: "DWCS.Settings.MovesOnSidebar.name",
    hint: "DWCS.Settings.MovesOnSidebar.hint",
    scope: "world",
    config: true,
    restricted: true, // Only GMs can change this setting
    type: String,
    default: JSON.stringify(defaultSidebarTypes, null, 2),

    // Validate JSON whenever the setting changes
    onChange: value => {
      try {
        const parsed = JSON.parse(value);
        if (!validateObjectWithBooleans(parsed)) throw new Error("All values must be boolean.");
      } catch (err) {
        ui.notifications.error("DWCS: Invalid JSON in \"sidebarMoveTypes\" setting. PLEASE, VERIFY!");
        console.error(err);
      }
    }
  });

  /* --- Auto Add Move Types (JSON string setting) --- */

  // Controls which custom moveTypes should be automatically added to newly
  // created characters.
  // Key = moveType
  // Value = boolean (true = auto add, false = do NOT auto add)
  const defaultAutoAddTypes = {
    adventure: true,
    travel: true,
    session: true
  };

  game.settings.register("dw-custom-sheet", "autoAddMoveTypes", {
    name: "DWCS.Settings.MovesAutoAdd.name",
    hint: "DWCS.Settings.MovesAutoAdd.hint",
    scope: "world",
    config: true,
    restricted: true, // Only GMs can change this setting
    type: String,
    default: JSON.stringify(defaultAutoAddTypes, null, 2),

    onChange: value => {
      try {
        const parsed = JSON.parse(value);
        if (!validateObjectWithBooleans(parsed)) throw new Error("All values must be boolean.");
      } catch (err) {
        ui.notifications.error("DWCS: Invalid JSON in \"autoAddMoveTypes\" setting. PLEASE, VERIFY!");
        console.error(err);
      }
    }
  });

  /* --- Players with GM-Like Access for Secrets --- */

  /**
   * This setting allows the GM to select which players have GM-like permissions
   * specifically for secret blocks in Journals, Actors, and Items.
   * Players selected here will:
   * - See the full content of secret blocks
   * - Edit secrets if they are owner or assistant
   *
   * Only non-GM users are listed for selection.
   */
  game.settings.register("dw-custom-sheet", "SecretAccessPlayers", {
    name: "DWCS.Settings.SecretAccessPlayers.name",
    hint: "DWCS.Settings.SecretAccessPlayers.hint",
    scope: "world",
    config: true,
    restricted: true, // Only GMs can change this setting
    type: String,
    default: JSON.stringify([]),

    onChange: value => {
      try {
        const parsed = JSON.parse(value);
        if (!validateArrayOfStrings(parsed)) throw new Error("Must be an array of strings.");
      } catch (err) {
        ui.notifications.error("DWCS: Invalid JSON in \"SecretAccessPlayers\" setting. PLEASE, VERIFY!");
        console.error(err);
      }
    }
  });

  /* --- Compendium Used for Health Estimate Tags --- */

  /**
   * This setting allows the GM to define a specific compendium
   * used to search for tag items when clicking the Health Estimate
   * status displayed on the character sheet.
   *
   * When a player clicks the Health Estimate label:
   * - The system first searches for a matching tag item in world items
   * - If none is found, it searches inside the compendium defined here
   *
   * The compendium must contain Item documents, preferably of type 'tag'.
   * The expected value is the compendium ID (e.g. 'module-name.tags').
   *
   * Leaving this empty will skip the compendium search step.
   */
  game.settings.register("dw-custom-sheet", "TagCompendium", {
    name: "DWCS.Settings.TagCompendium.name",
    hint: "DWCS.Settings.TagCompendium.hint",
    scope: "world",
    config: true,
    restricted: true, // Only GMs can change this setting
    type: String,
    default: "",

    onChange: async () => {
      await prepareHealthEstimateCompendium(); // Reload cache if setting changes
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
    if (typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (e) {
    console.error("DWCS: Invalid JSON in \"customMoveTypes\" setting", e);
    return {};
  }
}

/**
 * Utility function to get sidebar placement configuration.
 * Returns an object where:
 * key = moveType
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

/**
 * Utility function to get auto-add configuration for move types.
 * Returns an object where:
 * key = moveType
 * value = boolean (true = auto add, false = skip)
 */
export function getAutoAddMoveTypes() {
  const raw = game.settings.get("dw-custom-sheet", "autoAddMoveTypes") || "{}";

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return {}; // Only ensure the parsed value is an object
    return parsed;
  } catch (e) {
    console.error("DWCS: Invalid JSON in \"autoAddMoveTypes\" setting", e);
    return {};
  }
}

/**
 * Utility function to get the list of players with GM-like access.
 * Returns an array of player names (strings) who are allowed to view/edit secret blocks.
 */
export function getSecretAccessPlayers() {
  try {
    return JSON.parse(game.settings.get("dw-custom-sheet", "SecretAccessPlayers") || "[]");
  } catch (e) {
    console.error("DWCS: Invalid JSON in \"SecretAccessPlayers\" setting", e);
    return [];
  }
}