// scripts/main.js

import { defineCharacterCustomClass } from "./sheets/character-custom.js";

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

    // // Remove default sheet:
    // ActorsCollection.unregisterSheet("dungeonworld", ActorSheet);

    // Registers new sheet:
    const CustomCharacterSheet = defineCharacterCustomClass(DwActorSheet);
    ActorsCollection.registerSheet("dungeonworld", CustomCharacterSheet, {
        types: ["character"],
        makeDefault: false,
        label: "Customized Character Sheet"
    });
    console.log("✅ DW Custom Sheet | Ready");
})