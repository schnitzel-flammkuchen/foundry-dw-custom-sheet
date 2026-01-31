/**
 * DWCS Module Configuration
 * This file contains all constants used across the character sheet, items, and moves
 */

/**
 * Move metadata for the character sheet.
 * Contains move categories, translation keys, and type info.
 * @type {Array<{key: string, title: string, moveType?: string, name: string}>}
 */
export const MOVE_META = [
  { key: "basicMoves", title: "DW.MovesBasic", moveType: "basic", name: "basic-moves" },
  { key: "startingMoves", title: "DW.MovesStarting", moveType: "starting", name: "starting-moves" },
  { key: "advancedMoves", title: "DW.MovesAdvanced", moveType: "advanced", name: "advanced-moves" },
  { key: "specialMoves", title: "DW.MovesSpecial", moveType: "special", name: "special-moves" },
  { key: "moves", title: "DW.MovesOther", name: "other-moves" } // "Other" moves that don't fit the above categories
];

/**
 * Maximum number of custom resources allowed per character.
 * @type {number}
 */
export const MAX_CUSTOM_RESOURCES = 3;

/**
 * Resource keys used in the actor data.
 * 'resource1' pre-exists, 2-4 are additional custom resources.
 * @type {string[]}
 */
export const RESOURCE_KEYS = ["resource1", "resource2", "resource3", "resource4"];

/**
 * Type labels used for item types in the template.
 * Keys correspond to item types, values are display labels.
 * @type {Record<string, string>}
 */
export const ITEM_TYPE_LABELS = {
  weapon: "FilteredEquipment.Weapon",
  armor: "FilteredEquipment.Armor",
  dungeongear: "FilteredEquipment.DungeonGear",
  poison: "FilteredEquipment.Poison",
  meal: "FilteredEquipment.Meal",
  service: "FilteredEquipment.Service",
  transport: "FilteredEquipment.Transport",
  bribe: "FilteredEquipment.Bribe",
  giftsfinery: "FilteredEquipment.GiftsFinery",
  hoard: "FilteredEquipment.Hoard",
  landbuilding: "FilteredEquipment.LandBuildings"
};

/**
 * FontAwesome icons for each item type.
 * Keys correspond to item types, values are icon class names.
 * @type {Record<string, string>}
 */
export const ITEM_TYPE_ICONS = {
  weapon: "fas fa-sword",
  armor: "fas fa-shield-alt",
  dungeongear: "fa-tools",
  poison: "fas fa-flask",
  meal: "fas fa-drumstick-bite",
  service: "fas fa-hands-helping",
  transport: "fas fa-horse-head",
  bribe: "fas fa-coins",
  giftsfinery: "fas fa-gem",
  hoard: "fas fa-treasure-chest",
  landbuilding: "fas fa-home"
};

/**
 * Defines the order in which item types appear in the template.
 * @type {string[]}
 */
export const ITEM_TYPE_ORDER = [
    "weapon", "armor", "dungeongear", "poison", "meal", "service",
    "transport", "bribe", "giftsfinery", "hoard", "landbuilding"
];
