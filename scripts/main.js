// scripts/main.js

import { defineCharacterCustomClass } from "./sheets/character-sheet.js";
import { normalizeInputs, enablePersistentDropdowns } from "./utils/ui.js";

/**
 * Preload all HBS partials used in the custom sheet.
 * It loads all custom Handlebars partials used in the custom template.
 * This avoids "partial not found" errors.
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
 * Hook that runs once Foundry is initializing.
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
