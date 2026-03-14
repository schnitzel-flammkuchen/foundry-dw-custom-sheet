// scripts/main.js

import { defineCharacterCustom } from "./sheets/character-sheet.js";
import { defineItemCustom, defineClassItemCustom } from "./sheets/item-sheet.js"
import { normalizeInputs, enablePersistentDropdowns, updateContentLinkIcons, convertSecretButtonsToIcons, applyOwnershipClasses } from "./utils/ui.js";
import { registerHandlebarsHelpers } from "./utils/handlehelpers.js";
import { registerDWCSSettings, getAutoAddMoveTypes, getCustomMoveTypes } from "./settings.js";

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
 * Loads and caches the compendium index used to search tag items related to
 * Health Estimate labels. This should run once (on 'ready') and prevent
 * repeated calls to pack.getIndex(), improving performance when clicking the
 * Health Estimate status.
 */
export async function prepareHealthEstimateCompendium() {
    // Initialize namespace
    game.dwcs = game.dwcs || {};
    game.dwcs.healthEstimateTagIndex = null;
    game.dwcs.healthEstimateTagPack = null;

    // Get compendium configured by the GM
    const packName = game.settings.get("dw-custom-sheet", "TagCompendium");
    const pack = Array.from(game.packs.values()).find(p => p.metadata.label === packName && p.documentName === "Item");
    if (!pack || pack.documentName !== "Item") return;

    // Store pack reference
    game.dwcs.healthEstimateTagPack = pack;

    // Load lightweight index (only name and type)
    game.dwcs.healthEstimateTagIndex = await pack.getIndex({ fields: ["name", "type"] });
}

// Preload the moves compendium to cache documents for auto-add
export async function prepareMovesCompendium() {
    // Initialize namespace
    game.dwcs = game.dwcs || {};

    // Get compendium configured by the GM
    const packName = game.settings.get("dw-custom-sheet", "MovesCompendium");
    if (!packName) return;

    const pack = Array.from(game.packs.values()).find(p => p.metadata.label === packName && p.documentName === "Item");
    if (!pack || pack.documentName !== "Item") return;

    // Store pack reference
    game.dwcs.movesPack = pack;

    // Load lightweight index (only name and type)
    game.dwcs.movesCache = await pack.getIndex({ fields: ["name", "type", "system.moveType"] });
}

// Function to add moves to an actor using global items, compendium, or both
export async function autoAddMovesToActor(actor) {
    // Initialize namespace
    game.dwcs = game.dwcs || {};

    if (!actor || actor.type !== "character") return;

    const existingMoveNames = new Set(actor.items.filter(i => i.type === "move").map(i => i.name));
    const autoAddConfig = getAutoAddMoveTypes();
    const customTypes = getCustomMoveTypes();

    const compendiumId = game.settings.get("dw-custom-sheet", "MovesCompendium");
    const movesSource = game.settings.get("dw-custom-sheet", "MovesSource"); // 'global' | 'compendium' | 'both'

    const useGlobal = movesSource === "global" || movesSource === "both";
    const useCompendium = (movesSource === "compendium" || movesSource === "both") && !!compendiumId;

    let movesToAdd = [];

    // --- Global moves ---
    if (useGlobal) {
        const worldMoves = game.items
            .filter(i => i.type === "move") // Only items of type 'move'
            .filter(i => Object.keys(customTypes).includes(i.system.moveType)) // Only custom move types
            .filter(i => autoAddConfig[i.system.moveType] !== false) // Only enabled for auto-add
            .filter(i => !existingMoveNames.has(i.name)) // Skip duplicates
            .map(m => m.toObject()); // Convert to object for creation

        movesToAdd.push(...worldMoves); // Accumulate moves to add
    }

    // --- Compendium moves ---
    if (useCompendium && game.dwcs?.movesPack) {
        const pack = game.dwcs.movesPack;

        // Load all documents from the compendium
        const allMoves = await pack.getDocuments();

        // Filter the moves to be added
        const compMoves = allMoves
            .filter(i => i.type === "move")
            .filter(i => Object.keys(customTypes).includes(i.system.moveType))
            .filter(i => autoAddConfig[i.system.moveType] !== false)
            .filter(i => !existingMoveNames.has(i.name));

        if (compMoves.length > 0) {
            const movesObjects = compMoves.map(m => m.toObject());
            movesToAdd.push(...movesObjects);
            console.log("DWCS: Compendium moves added:", movesObjects);
        }
    }

    if (movesToAdd.length > 0) {
        await actor.createEmbeddedDocuments("Item", movesToAdd);
        console.log(`DWCS: Added ${movesToAdd.length} moves to actor ${actor.name}`);
    }
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
 * Prepares the cached compendium index used to resolve
 * Health Estimate labels into tag items when clicked
 * and Moves Compendium for Moves Auto Add.
 */
Hooks.once("ready", async () => {
    await prepareHealthEstimateCompendium(); // Initialize Health Estimate compendium cache
    await prepareMovesCompendium(); // Prepare moves compendium

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

    // Add moves when actor is created
    await autoAddMovesToActor(actor);
});

/**
 * Hook that runs whenever an Actor sheet is rendered.
 * Calls 'normalizeInputs' to ensure that numeric inputs default to 0 if left empty and required text inputs (data-required="true") revert to the last valid value if left empty.
 * Calls 'enablePersistentDropdowns' to ensure local flags for dropdowns that have been opened/closed so to avoid its "blinking" effect when rendering a sheet.
 * Calls 'updateContentLinkIcons' to update item icons inside '.content-link' elements based on item type.
 * Calls 'applyOwnershipClasses' to apply secret ownership logic to Actor sheets, adding 'authorized' or 'unauthorized' classes based on the user's permissions.
 * Calls 'convertSecretButtonsToIcons' to convert any "reveal secret" buttons in journal entries to icons, ensuring that secrets are visually distinct and easily identifiable.
 */
Hooks.on("renderActorSheet", (sheet, html, _data) => {
    normalizeInputs(html);
    enablePersistentDropdowns(html);
    updateContentLinkIcons(html);
    applyOwnershipClasses(sheet, html);
    convertSecretButtonsToIcons(html);
});

/**
 * Hook that runs whenever an Item sheet is rendered.
 * Calls 'updateContentLinkIcons' to update item icons inside '.content-link' elements based on item type.
 * Calls 'applyOwnershipClasses' to apply secret ownership logic to Item sheets, adding 'authorized' or 'unauthorized' classes based on the user's permissions.
 * Calls 'convertSecretButtonsToIcons' to convert any "reveal secret" buttons in journal entries to icons, ensuring that secrets are visually distinct and easily identifiable.
 */
Hooks.on("renderItemSheet", (sheet, html, _data) => {
    updateContentLinkIcons(html);
    applyOwnershipClasses(sheet, html);
    convertSecretButtonsToIcons(html);
});

/**
 * Hook executed whenever a Journal Entry Page (Text) sheet is rendered.
 * Users with OWNER permission on the parent JournalEntry are considered authorized (add class 'authorized').
 * All other users are unauthorized (add class 'unauthorized').
 * The visibility's controlled via CSS.
 * 
 * SPECIFIC FOR DEFAULT FOUNDRY VTT JOURNAL ENTRY PAGES (TEXT SHEET)
 */
Hooks.on("renderJournalEntryPageTextSheet", (sheet, html, _data) => {
    // Get the main content section of the journal page
    const content = html.querySelector('.journal-page-content');
    if (!content) return;

    // Current JournalEntryPage
    const page = sheet.document;

    // Parent JournalEntry document
    const journal = page.parent;
    if (!journal) return;

    // // Mostly for debug purposes:
    // console.log("Journal:", journal.name);
    // console.log("Ownership:", journal.ownership);
    // console.log("User level:", journal.getUserLevel(game.user));
    
    // Update content link icons
    updateContentLinkIcons(content);
    // Apply ownership classes dynamically using the generic function
    applyOwnershipClasses(sheet, content);
    // Convert secret buttons to icons
    convertSecretButtonsToIcons(content);
});

/**
 * Global hook for any JournalSheet rendering.
 * Works for core JournalSheets or ImprovedJournalSheet (module).
 * Applies ownership-based classes.
 */
Hooks.on("renderApplication", (app, html, _data) => {
    // Only act on journal sheets
    if (!(app instanceof JournalSheet)) return;

    const sheet = app;
    const journal = sheet.document;
    if (!journal) return;

    //   // Debug: Journal info
    //   console.log("JOURNAL RENDERED:", journal.name);
    //   console.log("Journal Ownership:", journal.ownership);
    //   console.log("User level:", journal.getUserLevel(game.user));

    // Update content link icons
    updateContentLinkIcons(html);
    // Apply ownership classes dynamically using the generic function
    applyOwnershipClasses(sheet, html);
    // Convert secret buttons to icons
    convertSecretButtonsToIcons(html);
});

/**
 * Applies secret ownership logic to ChatMessages.
 * Wraps ChatMessage inside a sheet-like structure so that 'applyOwnershipClasses' can reuse the same logic used for
 * ActorSheet, ItemSheet, and JournalEntryPage.
 * Additionally, it also converts any 'reveal secret' buttons in chat messages to icons, ensuring that secrets are visually distinct and easily identifiable.
 * Updates item icons inside '.content-link' elements based on item type, ensuring that links to items in chat messages display the correct icons.
 */
Hooks.on("renderChatMessage", (message, html) => {
    const chatSheet = { document: message };
    updateContentLinkIcons(html);
    applyOwnershipClasses(chatSheet, html);
    convertSecretButtonsToIcons(html);
});