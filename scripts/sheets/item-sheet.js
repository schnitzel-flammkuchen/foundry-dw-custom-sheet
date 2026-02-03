// scripts/sheets/item-sheet.js

/**
 * Defines the custom item sheet class.
 * @param {*} itemClass - The base ItemSheet class (DwItemSheet)
 * @returns A custom ItemSheet class
 */
export function defineItemCustom(itemClass) {
  return class ItemSheet extends itemClass {

    /** @override */
    static get defaultOptions() {
      const options = foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["dungeonworld", "sheet", "item", "dw-custom-sheet"],
        width: 600,
        height: 550,
        submitOnChange: true
      });

      const isDark = document.body.classList.contains("theme-dark");
      if (isDark) options.classes.push("nightmode");

      return options;
    }

    /** @override */
    get template() {
      // One template per item type, same as original system
      return `modules/dw-custom-sheet/templates/items/${this.item.type}-sheet.hbs`;
    }

    /**
     * Prepare the data for the Handlebars template.
     * Returns all system data, items, and flags for rendering.
     * @param {*} options - Options passed from Foundry VTT
     * @returns {Object} Context object for the template
     */
    async getData(options) {
      const context = await super.getData(options);

      /* --- USEFUL ALIASES FOR TEMPLATE --- */

      context.itemType = this.item.type;
      context.isMove = ["move", "npcMove"].includes(this.item.type);
      context.isEquipment = this.item.type === "equipment";
      context.isSpell = this.item.type === "spell";

      /* --- ORGANIZATION OF DETAILS --- */

      // Group attributes into logical blocks
      context.details = {
        description: context.system.descriptionEnriched,
        tags: context.system.tagsString,
        choices: context.system.choicesEnriched,
        moveResults: context.system.moveResults
      };

      return context;
    }

    /** @override */
    activateListeners(html) {
      super.activateListeners(html);
    }
  };
}

/**
 * Defines the custom class item sheet.
 * @param {*} classItemClass - DwClassItemSheet
 * @returns Custom class ItemSheet
 */
export function defineClassItemCustom(classItemClass) {
  return class ClassItemSheet extends classItemClass {

    /** @override */
    static get defaultOptions() {
      const options = foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["dungeonworld", "sheet", "item", "class", "dw-custom-sheet"],
        width: 1000,
        height: 700,
        tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "equipment" }]
      });

      const isDark = document.body.classList.contains("theme-dark");
      if (isDark) options.classes.push("nightmode");

      return options;
    }

    /** @override */
    get template() {
      return "modules/dw-custom-sheet/templates/items/class-sheet--equipment-group.hbs";
    }

    /**
     * Prepare the data for the Handlebars template.
     * Returns all system data, items, and flags for rendering.
     * @param {*} options - Options passed from Foundry VTT
     * @returns {Object} Context object for the template
     */
    async getData(options) {
      const context = await super.getData(options);

      /* --- USEFUL ALIASES FOR TEMPLATE --- */

      context.hasEquipmentGroups = context.system?.equipment
        && Object.keys(context.system.equipment).length > 0;

      return context;
    }

    /** @override */
    activateListeners(html) {
      super.activateListeners(html);
    }
  };
}