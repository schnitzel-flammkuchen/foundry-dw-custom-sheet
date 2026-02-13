// scripts/sheets/item-sheet.js

import { getCustomMoveTypes } from "../settings.js";

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
      const path = "modules/dw-custom-sheet/templates/items";
      return `${path}/${this.item.type}-sheet.hbs`;
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

      /* --- NEW MOVE TYPES --- */

      // INTERCEPT: add new moveTypes
      if (this.item.type === "move") {
        context.selects.moveTypes = {
          ...context.selects.moveTypes,
          ...getCustomMoveTypes()
        };
      }

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
      const path = "modules/dw-custom-sheet/templates/items";
      return `${path}/${this.item.type}-sheet.hbs`;
    }

    /** @override */
    async _onClickClassControl(event) {
      // Intercept only the creation of equipment-groups
      const a = event.currentTarget;
      if (a.dataset.action === "create" && a.dataset.type === "equipment-groups") {
        event.preventDefault();

        const field_values = this.object.system.equipment;
        const nk = Object.keys(field_values).length + 1;

        // Render the equipment group using the custom module template
        const path = "modules/dw-custom-sheet/templates/items";
        const template = `${path}/_class-sheet--equipment-group.hbs`;
        const templateData = { group: nk };
        let newKey = document.createElement('div');
        newKey.innerHTML = await renderTemplate(template, templateData);
        newKey = newKey.children[0];

        // Prepare the system update
        let update = { system: foundry.utils.duplicate(this.object.system) };
        update.system.equipment[nk] = {
          label: '',
          mode: 'radio',
          items: [],
          objects: []
        };

        // Apply update and append the new element
        await this.object.update(update);
        this.form.appendChild(newKey);
        await this._onSubmit(event);

        return; // Exit early to avoid calling the original method
      }

      // Delegate all other clicks to the original implementation
      return super._onClickClassControl(event);
    }

    /**
     * Prepare the data for the Handlebars template.
     * Returns all system data, items, and flags for rendering.
     * @param {*} options - Options passed from Foundry VTT
     * @returns {Object} Context object for the template
     */
    // async getData(options) {
    //   const context = await super.getData(options);

    //   /* --- USEFUL ALIASES FOR TEMPLATE --- */

    //   context.hasEquipmentGroups = context.system?.equipment
    //     && Object.keys(context.system.equipment).length > 0;

    //   return context;
    // }

    /** @override */
    activateListeners(html) {
      super.activateListeners(html);
    }
  };
}