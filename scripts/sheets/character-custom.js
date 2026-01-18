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
      const actor = this.actor;
      const system = actor.system ?? {};

      // --- BASE DATA ---
      context.actor = actor; // The entire actor object
      context.system = system; // The actor's system data
      context.system.details ??= {}; // Ensure certain objects exist
      context.system.attributes ??= {};
      context.system.abilities ??= {};
      context.system.xpSvg ??= ""; // Optional SVG representation of XP

      // --- ITEMS ORGANIZATION ---
      const items = actor.items.contents;

      // Define categories and filter functions
      const itemCategories = {
        bonds: i => i.type === "bond",
        basicMoves: i => i.type === "move" && i.system.moveType === "basic",
        startingMoves: i => i.type === "move" && i.system.moveType === "starting",
        advancedMoves: i => i.type === "move" && i.system.moveType === "advanced",
        specialMoves: i => i.type === "move" && i.system.moveType === "special",
        moves: i => i.type === "move" && !["basic","starting","advanced","special"].includes(i.system.moveType),
        spells: i => i.type === "spell",
        equipment: i => i.type === "equipment"
      };

      // Apply filters dynamically
      for (const [category, filterFn] of Object.entries(itemCategories)) {
        context[category] = items.filter(filterFn);
      }

      // Add roll modes, including the new "push" mode
      context.rollModes = {
        def: "DW.Normal",
        adv: "DW.Advantage",
        dis: "DW.Disadvantage",
        psh: "DW.Push"
      };

      // console.log("Context with rollModes:", context.rollModes);

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
