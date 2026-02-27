// scripts/main.js

import { defineCharacterCustom } from "./sheets/character-sheet.js";
import { defineItemCustom, defineClassItemCustom } from "./sheets/item-sheet.js"
import { normalizeInputs, enablePersistentDropdowns, updateContentLinkIcons } from "./utils/ui.js";
import { registerHandlebarsHelpers } from "./utils/handlehelpers.js";
import { registerDWCSSettings, getCustomMoveTypes, getAutoAddMoveTypes } from "./settings.js";


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

    registerHandlebarsHelpers();
    console.log("✅ DW Custom Sheet | Handlebars helpers registered");
    
    registerDWCSSettings();
    console.log("✅ DW Custom Sheet | Settings registered");
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
 * Additionally, it'll add any "custom" moves
 * (adventure, travel, session in specific)
 * to the newly created character.
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

    // Wait for the actor to fully prepare, ensuring DW default moves are loaded
    await actor.prepareData();

    // Collect the names of all existing moves on the actor to avoid duplicates
    const existingMoveNames = new Set(
        actor.items.filter(i => i.type === "move").map(i => i.name)
    );

    // Get configuration for auto-added move types
    const autoAddConfig = getAutoAddMoveTypes();

    // Get all global campaign moves of the custom categories
    const worldMoves = game.items.filter(i => {
        if (i.type !== "move") return false;
        const moveType = i.system.moveType;
        // Only consider custom move types
        if (!Object.keys(getCustomMoveTypes()).includes(moveType)) return false;
        // If explicitly disabled in setting, skip auto add
        if (autoAddConfig[moveType] === false) return false;
        return true;
    });

    // Filter moves that are not already on the actor
    const movesToAdd = worldMoves.filter(m => !existingMoveNames.has(m.name)).map(m => m.toObject());

    // Add the missing custom moves to the actor
    if (movesToAdd.length > 0) {
        await actor.createEmbeddedDocuments("Item", movesToAdd);
        console.log(`Added ${movesToAdd.length} global moves to actor ${actor.name}`);
    }
});

/**
 * Hook that runs whenever an Actor sheet is rendered.
 * Calls 'normalizeInputs' to ensure that numeric inputs default to 0 if left empty and required text inputs (data-required="true") revert to the last valid value if left empty.
 * Calls 'enablePersistentDropdowns' to ensure local flags for dropdowns that have been opened/closed so to avoid its "blinking" effect when rendering a sheet.
 * Calls 'updateContentLinkIcons' to update item icons inside '.content-link' elements based on item type.
 */
Hooks.on("renderActorSheet", (_sheet, html, _data) => {
    normalizeInputs(html);
    enablePersistentDropdowns(html);
    updateContentLinkIcons(html);
});
