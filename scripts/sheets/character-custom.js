// scripts/sheets/character-custom.js

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
        height: 600 // Sheet height
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
    async getData(options) {
      const context = await super.getData(options);

      // Commit: Replace explicit item categories with dynamic structure (scripts/sheets/character-custom.js)
      
      /* --- SHEET VIEWER --- */
      /* Define categories to simplify the custom template */

      // Filters the actor's items to include only those of type "move"
      context.moves = this.actor.items.filter(i => i.type === "move");

      // Define the categories of moves with metadata for each
      context.moveMeta = [
        { key: "basicMoves", title: "DW.MovesBasic", moveType: "basic", name: "basic-moves" },
        { key: "startingMoves", title: "DW.MovesStarting", moveType: "starting", name: "starting-moves" },
        { key: "advancedMoves", title: "DW.MovesAdvanced", moveType: "advanced", name: "advanced-moves" },
        { key: "specialMoves", title: "DW.MovesSpecial", moveType: "special", name: "special-moves" },
        { key: "moves", title: "DW.MovesOther", name: "other-moves" } // "Other" moves that don't fit the above categories
      ];

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

      console.log(context);

      return context;
    }

    /**
     * Sets up event listeners for interactive elements on the sheet.
     * Only attaches listeners if the sheet is editable.
     * @param {*} html - The jQuery-wrapped HTML of the sheet
     */
    activateListeners(html) {
      super.activateListeners(html);
      if (!this.options.editable) return;

      // NOTE: Add custom click handlers or interactive features here
    }
  };
}
