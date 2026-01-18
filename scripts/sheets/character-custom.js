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

      // --- SHEET VIEW MODEL ---
      context.sheet = {};

      // Core attributes (top section of sheet)
      // Excludes weight, coin and abilities
      context.sheet.coreAttributes = {
        hp: system.attributes.hp,
        ac: system.attributes.ac,
        damage: system.attributes.damage,
        level: system.attributes.level,
        xp: system.attributes.xp
      };

      // Game resources (moves, ongoing values, etc.)
      context.sheet.resources = {
        forward: system.attributes.forward,
        ongoing: system.attributes.ongoing,
        hold: system.attributes.hold,
        resource1: system.attributes.resource1,
        rollFormula: system.attributes.rollFormula
      };

      // Economy section — separates weight and coin
      context.sheet.economy = {
        weight: system.attributes.weight,
        coin: system.attributes.coin
      };

      // Abilities block — separate section in the sheet
      context.sheet.abilities = system.abilities;

      // --- ITEMS ORGANIZATION ---
      const items = actor.items.contents;

      // Filter items by type to display in separate sections
      context.bonds = items.filter(i => i.type === "bond");
      context.basicMoves = items.filter(i => i.type === "move" && i.system.moveType === "basic");
      context.startingMoves = items.filter(i => i.type === "move" && i.system.moveType === "starting");
      context.advancedMoves = items.filter(i => i.type === "move" && i.system.moveType === "advanced");
      context.specialMoves = items.filter(i => i.type === "move" && i.system.moveType === "special");
      context.moves = items.filter(i =>
        i.type === "move" &&
        !["basic", "starting", "advanced", "special"].includes(i.system.moveType)
      );
      context.spells = items.filter(i => i.type === "spell");
      context.equipment = items.filter(i => i.type === "equipment");

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
