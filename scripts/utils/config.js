/**
 * DWCS Module Configuration
 * This file contains all constants used across the character sheet, items, and moves
 */

/* Move Metadata */
// All move categories with their keys, translation titles, and type info
export const MOVE_META = [
  { key: "basicMoves", title: "DW.MovesBasic", moveType: "basic", name: "basic-moves" },
  { key: "startingMoves", title: "DW.MovesStarting", moveType: "starting", name: "starting-moves" },
  { key: "advancedMoves", title: "DW.MovesAdvanced", moveType: "advanced", name: "advanced-moves" },
  { key: "specialMoves", title: "DW.MovesSpecial", moveType: "special", name: "special-moves" },
  { key: "moves", title: "DW.MovesOther", name: "other-moves" } // "Other" moves that don't fit the above categories
];

// Maximum number of custom resources allowed per character
export const MAX_CUSTOM_RESOURCES = 4;

// Resource keys used in the actor data
// resource1 pre-exists, 2-4 are additional custom resources
export const RESOURCE_KEYS = ["resource1", "resource2", "resource3", "resource4"];

// Type Labels
// Localize-friendly labels for Dungeon World item types
export const ITEM_TYPE_LABELS = {
  weapon: "Weapon",
  armor: "Armor",
  dungeongear: "DungeonGear",
  poison: "Poison",
  meal: "Meal",
  service: "Service",
  transport: "Transport",
  bribe: "Bribe",
  giftsfinery: "GiftsFinery",
  hoard: "Hoard",
  landbuilding: "LandBuildings"
};

// Type Icons
// Font Awesome icons for Dungeon World item types
export const ITEM_TYPE_ICONS = {
  weapon: "fa-sword",
  armor: "fa-shield-alt",
  dungeongear: "fa-tools",
  poison: "fa-flask",
  meal: "fa-drumstick-bite",
  service: "fa-hands-helping",
  transport: "fa-horse-head",
  bribe: "fa-coins",
  giftsfinery: "fa-gem",
  hoard: "fa-treasure-chest",
  landbuilding: "fa-home"
};

// Item Type Order
// Defines the order in which item types appear in the template
export const ITEM_TYPE_ORDER = [
    "weapon", "armor", "dungeongear", "poison", "meal", "service",
    "transport", "bribe", "giftsfinery", "hoard", "landbuilding"
];
