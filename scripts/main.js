// scripts/main.js

import { defineCharacterCustom } from "./sheets/character-sheet.js";
import { defineItemCustom, defineClassItemCustom } from "./sheets/item-sheet.js"
import { normalizeInputs, enablePersistentDropdowns } from "./utils/ui.js";

/**
 * Preload all HBS partials used in the custom sheet.
 * It loads all custom Handlebars partials used in the custom template.
 * This avoids "partial not found" errors.
 */
async function preloadTemplates() {
  const ROOT = "modules/dw-custom-sheet/templates";

  const partials = [
    // Partial templates
    "character/partials/header",
    "character/partials/overview",
    "character/partials/sidebar",
    "character/partials/tabs/description",
    "character/partials/tabs/equipment",
    "character/partials/tabs/moves",
    "character/partials/tabs/spells",

    // Item templates
    "items/_class-sheet--equipment-group",
    "items/bond-sheet",
    "items/class-sheet",
    "items/equipment-sheet",
    "items/move-sheet",
    "items/npcMove-sheet",
    "items/spell-sheet",
    "items/tag-sheet"
  ];

  // Preload all templates using Foundry's loadTemplates
  return loadTemplates(partials.map(p => `${ROOT}/${p}.hbs`));
}

/**
 * Hook that runs once Foundry initializes.
 * Preload templates (.hbs partials).
 * Register a handlebars helper - for localization purposes.
 * Registers custom character and item sheets for Dungeon World.
 */
Hooks.once("init", async () => {
    await preloadTemplates();
    console.log("✅ DW Custom Sheet | Loaded partials");

    // Localize helper - for equipment filter
    Handlebars.registerHelper('localizeFallback', function(key) {
        if (!key) return key;
        let compareKey = key.replace(/\s+/g, ''); // Normalize key

        // Extract the category if it exists, e.g.: "Placeholder.Name" -> ["Placeholder", "Name"] to be utilize to check if it exists on the module
        // Because Dungeon World natively doesn't have them
        let parts = compareKey.split('.');
        let baseKey = parts[parts.length - 1]; // Last part
        let category = parts.length > 1 ? parts[0] : null; // Category for (DWCS.*)

        // Tries mine first (DWCS.*)
        let fallbackKey = category ? `DWCS.${category}.${baseKey}` : `DWCS.${baseKey}`;
        let fallbackValue = game.i18n.localize(fallbackKey);
        if (game.i18n.has(fallbackKey)) return fallbackValue;

        // If mine hasn't, tries Dungeon World lang/*.json localize (DW.*)
        compareKey = key.startsWith("DW.") ? key : "DW." + key;
        let dwValue = game.i18n.localize(compareKey);
        if (game.i18n.has(compareKey)) return dwValue;

        // If none of them exist, returns the original key (maintain the way it is)
        return key;
    });
});

/**
 * Hook that runs once Foundry is ready.
 * Registers the custom character sheet for Dungeon World actors.
 */
Hooks.once("ready", async () => {
    // Foundry V12 + V13 compatibility
    const ActorsCollection =
        foundry?.documents?.collections?.Actors ?? globalThis.Actors;
    const ItemsCollection =
        foundry?.documents?.collections?.Items ?? globalThis.Items;

    /* --------------------------------------------------------------------- */
    /* ACTOR SHEET (CHARACTER)                                               */
    /* --------------------------------------------------------------------- */

    const actorSheets = CONFIG.Actor?.sheetClasses?.character;
    const dwActorEntry = actorSheets?.["dungeonworld.DwActorSheet"];
    const DwActorSheet = dwActorEntry?.cls;

    if (!DwActorSheet) {
        console.error("❌ Dungeon World Character sheet class not found");
        return;
    }

    const CustomCharacterSheet = defineCharacterCustom(DwActorSheet);

    // Remove default DW character sheet
    ActorsCollection.unregisterSheet("dungeonworld", DwActorSheet);

    // Register custom character sheet
    ActorsCollection.registerSheet("dungeonworld", CustomCharacterSheet, {
        types: ["character"],
        makeDefault: true,
        label: game.i18n.localize("TYPES.Actor.character")
    });

    console.log("✅ DW Custom Character Sheet | Ready");

    /* --------------------------------------------------------------------- */
    /* ITEM SHEET                                                            */
    /* --------------------------------------------------------------------- */
    const itemSheets = CONFIG.Item?.sheetClasses;

    const dwItemEntry = itemSheets?.base?.["dungeonworld.DwItemSheet"];
    const dwClassItemEntry = itemSheets?.class?.["dungeonworld.DwClassItemSheet"];

    const DwItemSheet = dwItemEntry?.cls;
    const DwClassItemSheet = dwClassItemEntry?.cls;

    if (!DwItemSheet || !DwClassItemSheet) {
        console.error("❌ Dungeon World Item/Class sheet classes not found");
        return;
    }

    const CustomItemSheet = defineItemCustom(DwItemSheet);
    const ClassItemSheetCustom = defineClassItemCustom(DwClassItemSheet);

    // Remove default DW item sheets
    ItemsCollection.unregisterSheet("dungeonworld", DwItemSheet);
    ItemsCollection.unregisterSheet("dungeonworld", DwClassItemSheet);

    // Register custom item sheet (base – all items)
    ItemsCollection.registerSheet("dungeonworld", CustomItemSheet, {
        makeDefault: true,
        label: game.i18n.localize("TYPES.Item.equipment")
    });
    
    // Register custom item sheet (for class - equipment-group)
    ItemsCollection.registerSheet("dungeonworld", ClassItemSheetCustom, {
        types: ['class'],
        makeDefault: true
    });

    console.log("✅ DW Custom Item Sheets | Ready");
});

/**
 * Hook that runs RIGHT AFTER an Actor is created.
 * This works directly on the raw actor data, before any sheet or UI exists.
 * Ensures 'resource1' exists with a localized label, value 0, and max 0.
 */
Hooks.on("createActor", async (actor) => {
    if (actor.type !== "character") return;

    const localizedLabel = game.i18n.localize("DWCS.Custom.DefaultResource");

    // Update actor to change 'resource1' label
    await actor.update({
        "system.attributes.resource1": {
            label: localizedLabel,
            value: 0,
            max: 0
        }
    });
});

/**
 * Hook that runs whenever an Actor sheet is rendered.
 * Calls 'normalizeInputs' to ensure that numeric inputs default to 0 if left empty and required text inputs (data-required="true") revert to the last valid value if left empty.
 * Calls 'enablePersistentDropdowns' to ensure local flags for dropdowns that have been opened/closed so to avoid its "blinking" effect when rendering a sheet.
 */
Hooks.on("renderActorSheet", (_sheet, html, _data) => {
    normalizeInputs(html);
    enablePersistentDropdowns(html);
});
