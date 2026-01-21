// scripts/sheets/character-sheet.js

import { prepareEquipmentItems } from "../utils/equipment.js";
import { MOVE_META, MAX_CUSTOM_RESOURCES, RESOURCE_KEYS, ITEM_TYPE_LABELS, ITEM_TYPE_ICONS, ITEM_TYPE_ORDER } from "../utils/config.js";

// Custom Resources Configuration
// Maximum number of custom resources allowed per actor
const MAX_CUSTOM_RESOURCES = 4;
// Valid custom resource keys (resource1 already exists in system)
const RESOURCE_KEYS = ["resource1", "resource2", "resource3", "resource4"];

/**
 * Defines the custom character sheet class.
 * @param {*} baseClass - The base class to extend (usually the system's default ActorSheet)
 * @returns A custom character sheet class
 */
export function defineCharacterCustomClass(baseClass) {
  return class CharacterSheet extends baseClass {

    /**
     * Default options for the sheet.
     * Merges the base class options with the custom module settings.
     */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["dungeonworld", "sheet", "actor", "dw-custom-sheet"], // CSS classes for styling
        template: "modules/dw-custom-sheet/templates/character-sheet.hbs", // Custom Handlebars template
        width: 800, // Sheet width
        height: 600, // Sheet height
        tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "moves" }]
      });
    }

    /**
     * Override the template getter to force the custom template.
     * Without this, the system would use the default Dungeon World template.
     */
    get template() {
      return "modules/dw-custom-sheet/templates/character-sheet.hbs";
    }

    /**
     * Prepare the data for the Handlebars template.
     * Returns all system data, items, and flags for rendering.
     * @param {*} options - Options passed from Foundry VTT
     * @returns {Object} Context object for the template
     */
    // Save filter selection (survives re-render)
    itemFilter = "all";

    // Get Data
    async getData(options) {
      const context = await super.getData(options);
      
      /* --- SHEET VIEWER --- */
      /* Define aliases to simplify the custom template or add new functionalities */

      // Get and Prep all items
      await prepareEquipmentItems(context, this.actor);
      const allItems = context.equipment;
      
      const typeSet = new Set();
      for (const item of allItems) {
        if (item.system?.itemType) typeSet.add(item.system.itemType);
      }

      const filterTypes = Array.from(typeSet).sort(
        (a, b) => ITEM_TYPE_ORDER.indexOf(a) - ITEM_TYPE_ORDER.indexOf(b)
      );
      context.filterTypes = filterTypes;

      // Provide Type Labels
      context.typeLabels = ITEM_TYPE_LABELS;

      // Provide Type Icons
      context.typeIcons = ITEM_TYPE_ICONS;
      
      // Filtering logic
      let itemsToShow;
      if (this.itemFilter === "all") {
        itemsToShow = allItems;
      } else {
        itemsToShow = allItems.filter(i => i.system?.itemType === this.itemFilter);
      }
      context.equipment = itemsToShow;
      context.activeFilter = this.itemFilter;

      /* --- ABILITIES --- */

      // So it will appear the short version instead; it's included on lang folder of DW
      // Ability short labels (STR, DEX, etc.)
      for (const [key, ability] of Object.entries(context.system.abilities)) {
        ability.short = game.i18n.localize(`DW.${key.toUpperCase()}`);
      }

      /* --- MOVES --- */

      // Filters the actor's items to include only those of type "move"
      context.moves = this.actor.items.filter(i => i.type === "move");

      // Define the categories of moves with metadata for each
      context.moveMeta = MOVE_META;

      // Filters the full move list by each category's type to be used on the template
      context.moveCategories = context.moveMeta.map(cat => {
        const moves = context.moves.filter(m => {
          if (!cat.moveType) return !["basic", "starting", "advanced", "special"].includes(m.system.moveType);
          // Otherwise, include moves matching this category's type
          return m.system.moveType === cat.moveType;
        });

        // Return a new category object containing the metadata plus the filtered moves
        return {
          ...cat,
          moves
        };
      });

      /* --- CUSTOM RESOURCES --- */

      // Dungeon World's 'template.json' gives an actor:
      // "resource1": {
      //   "label": "Custom Resource",
      //   "value": 0,
      //   "max": 0
      // }
      // But will change its label and add up 4 resources

      // Define maximum of custom resources allowed
      const MAX_RESOURCES = 4;
    
      return context;
    }

    activateListeners(html) {
      super.activateListeners(html);

      // Item filter listener
      html.find('input[name="itemFilter"]').change(ev => {
        this.itemFilter = ev.currentTarget.value;
        this.render();
      });

      // NOTE: Add custom click handlers or interactive features here
    }
  };
}
