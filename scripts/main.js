// scripts/main.js

import { defineCharacterCustomClass } from "./sheets/character-custom.js";

/**
 * Preload all HBS partials used in the custom sheet
 * It loads all custom Handlebars partials used in the custom template
 * This avoids "partial not found" errors
 */
async function preloadTemplates() {
  const ROOT = "modules/dw-custom-sheet/templates/partials";

  const partials = [
    "header",
    "overview",
    "sidebar",
    "tabs/description",
    "tabs/equipment",
    "tabs/moves",
    "tabs/spells"
  ];

  return loadTemplates(partials.map(p => `${ROOT}/${p}.hbs`));
}

/**
 * Hook that runs once Foundry is initializing
 */
Hooks.once("init", async () => {
  await preloadTemplates();
  console.log("✅ DW Custom Sheet | Loaded partials");

  // Localize helper - for equipment filter
  Handlebars.registerHelper('localizeFallback', function(key) {
    if (!key.startsWith("DW.")) key = "DW." + key;
    key = key.replace(/\s+/g, ''); // Normalize key

    // Tries Dungeon World lang/*.json localize first (DW.*)
    let dwValue = game.i18n.localize(key);
    if (dwValue !== key) return dwValue;

    // If the translation doesn't exist, tries mine (DWCS.*)
    let fallbackKey = key.replace(/^DW\./, 'DWCS.FilteredEquipment.');
    let fallbackValue = game.i18n.localize(fallbackKey);
    if (fallbackValue !== fallbackKey) return fallbackValue;

    // If none of them exist, returns the original key (maintain the way it is)
    return key;
  });
});

/**
 * Hook that runs once Foundry is ready
 * Registers the custom character sheet for Dungeon World actors
 */
Hooks.once("ready", async () => {
    // Foundry V12 + V13
    const ActorsCollection =
        foundry?.documents?.collections?.Actors ?? globalThis.Actors;

    const playerSheets = CONFIG.Actor?.sheetClasses?.character;
    const dwEntry = playerSheets?.["dungeonworld.DwActorSheet"];
    const DwActorSheet = dwEntry?.cls;
    if (!DwActorSheet) {
        console.error("❌ Dungeon World NPC sheet class not found");
        return;
    }

    // Registers new sheet
    const CustomCharacterSheet = defineCharacterCustomClass(DwActorSheet);
    ActorsCollection.registerSheet("dungeonworld", CustomCharacterSheet, {
        types: ["character"],
        makeDefault: false,
        label: "Customized Character Sheet"
    });
    console.log("✅ DW Custom Sheet | Ready");
});
