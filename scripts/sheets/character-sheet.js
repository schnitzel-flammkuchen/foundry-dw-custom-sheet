// scripts/sheets/character-sheet.js

import { prepareEquipmentItems } from "../utils/equipment.js";
import { MOVE_META, MAX_CUSTOM_RESOURCES, RESOURCE_KEYS, ITEM_TYPE_LABELS, ITEM_TYPE_ICONS, ITEM_TYPE_ORDER } from "../utils/config.js";

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
      
      /* --- INVENTORY FILTER --- */

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

      /* --- INVENTORY VALUE (Total Worth) --- */
      /* Can be calculated for all items or a filtered subset */

      // Initialize total worth accumulator
      let totalWorth = 0;

      // Loop through all items in the inventory
      // If not using a filtered list, replace 'itemsToShow' with 'allItems'
      for (const item of itemsToShow) {
        // Get the quantity of the item, default to 1 if not specified
        const qty = Number(item.system?.quantity ?? 1);
        // Get the price of the item, default to 0 if not specified
        const price = Number(item.system?.price ?? 0);

        // Only include items with a positive value and add the total value of this item (value * quantity) to the accumulator
        if (price > 0) totalWorth += price * qty;
      }

      // If using 'itemsToShow', this means the items are filtered
      // Determine the label for the item type (for display/tag)
      let filterLabel = this.itemFilter === "all"
        ? ""
        : ITEM_TYPE_LABELS[this.itemFilter] ?? this.itemFilter;

      // Expose the total worth context for display on template
      context.totalWorth = totalWorth;
      context.totalWorthLabel = filterLabel; // Only used if filtering by item type

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

      const attrs = context.actor.system.attributes;
      // Starts with value and max. being 0
      // 0 if undefined
      RESOURCE_KEYS.forEach(k => {
        const attr = this.actor.system.attributes[k];
        if (attr) {
          attr.value = Number(attr.value ?? 0);
          attr.max = Number(attr.max   ?? 0);
        }
      });

      // Creates list for the template
      context.customResources = RESOURCE_KEYS.filter(k => attrs[k]).map(k => ({
        key: k,
        label: attrs[k].label ?? game.i18n.localize("DWCS.Custom.DefaultResource"),
        value: Number(attrs[k].value ?? 0),
        max: Number(attrs[k].max ?? 0),
        removable: k !== "resource1"
      }));


      // Controls UI visibility for the add button
      context.canAddResource = this._countCustomResources() < MAX_CUSTOM_RESOURCES;
    
      return context;
    }

    /**
     * Ensures that resource1 exists and has a proper structure.
     * Does not override label if user has edited it.
     * @async
     * @returns {Promise<void>}
     */
    async _ensureResource1() {
      const attrs = this.actor.system.attributes;
      const res1 = attrs.resource1;

      // Only set label if it doesn't exist yet
      if (!res1) {
        await this.actor.update({
          "system.attributes.resource1": {
            label: game.i18n.localize("DWCS.Custom.DefaultResource"),
            value: 0,
            max: 0
          }
        });
      } else {
        // Ensure value/max exist, but leave label intact
        const updates = {};
        if (res1.value === undefined) updates["system.attributes.resource1.value"] = 0;
        if (res1.max === undefined) updates["system.attributes.resource1.max"] = 0;
        if (Object.keys(updates).length) await this.actor.update(updates);
      }
    }

    /**
     * Counts how many custom resources currently exist on the actor.
     * Includes resource1 and any additional (resource2–resource4).
     * @returns {number} Number of custom resources defined on the actor
     */
    _countCustomResources() {
      const attrs = this.actor.system.attributes;
      return RESOURCE_KEYS.filter(k => attrs[k]).length;
    }

    /**
     * Adds a new custom resource (resource2–resource4 only).
     * Sets a default label from localization but preserves user's future edits.
     * @async
     * @returns {Promise<void>}
     */
    async _addExtraResource() {
      const attrs = this.actor.system.attributes;
      const localizedLabel = game.i18n.localize("DWCS.CustomResource");

      // Hard stop: never allow more than MAX_CUSTOM_RESOURCES
      if (this._countCustomResources() >= MAX_CUSTOM_RESOURCES) {
        ui.notifications.warn(game.i18n.localize("DWCS.MaxCustomResourcesReached"));
        return;
      }

      // Find first available resource slot (excluding resource1)
      const nextKey = RESOURCE_KEYS.slice(1).find(k => !attrs[k]);
      if (!nextKey) return;

      await this.actor.update({
        [`system.attributes.${nextKey}`]: {
          label: localizedLabel, // Only default label
          value: 0,
          max: 0
        }
      });
    }

    /**
     * Removes a custom resource from the actor (resource2–resource4 only).
     * Will not remove resource1.
     * @async
     * @param {string} key The resource key to remove (e.g., "resource2")
     * @returns {Promise<void>}
     */
    async _removeExtraResource(key) {
      if (!key || key === "resource1") return;

      await this.actor.update({
        [`system.attributes.-=${key}`]: null
      });
    }

    /** @override */
    activateListeners(html) {
      super.activateListeners(html);

      /* --- EQUIPMENT TAB --- */

      // Item filter listener
      html.find('input[name="itemFilter"]').change(ev => {
        this.itemFilter = ev.currentTarget.value;
        this.render();
      });

      // Equipment search bar interactivity (label on click)
      const equipmentTitle = html.find('.equipment-title').first();
      const equipmentSearchDiv = html.find('#equipment-search');
      const equipmentInput = equipmentSearchDiv.find('input');

      // Click on title shows search bar and input
      equipmentTitle.on('click', () => {
        equipmentSearchDiv.addClass('active');
        equipmentInput.focus();
      });

      // If lost focus and input is empty, it hides again
      equipmentInput.on('blur', () => {
        if (equipmentInput.val().trim() === "") equipmentSearchDiv.removeClass('active');
      });

      // Equipment search bar: filter equipment on input
      html.find('.equipment-search input').on('input', ev => {
          const query = ev.currentTarget.value.toLowerCase();
          html.find('.items-list li').each((i, li) => {
              const name = $(li).find('.item-label').text().toLowerCase();
              $(li).toggle(name.includes(query));
          });
      });

      /* --- MOVES TAB --- */

      // Dropdown toggle for moves categories
      html.find(".moves-header").on("click", ev => {
        if (ev.target.closest(".item-controls")) return; // So it won't close when clicking the "+" button
        ev.preventDefault();
        const header = $(ev.currentTarget);
        const content = header.next(".items-list");
        content.slideToggle(150); // Smooth expand/collapse
        $(ev.currentTarget).find("i.fas").toggleClass("fa-chevron-up fa-chevron-down");
      });

      /* --- SPELLS TAB --- */

      // Dropdown toggle for spells categories
      html.find(".spells-header").on("click", ev => {
        if (ev.target.closest(".item-controls")) return;
        ev.preventDefault();
        const header = $(ev.currentTarget);
        const content = header.next(".items-list");
        content.slideToggle(150);
        $(ev.currentTarget).find("i.fas").toggleClass("fa-chevron-up fa-chevron-down");
      });

      /* --- CUSTOM RESOURCE --- */

      // Ensure base custom resource exists and is normalized
      this._ensureResource1();

      // Dropdown toggle for custom resources
      html.find(".custom-resources-toggle").click(ev => {
        ev.preventDefault();
        const content = $(ev.currentTarget).siblings(".custom-resources-content");
        content.slideToggle(150);
        $(ev.currentTarget).find("i.fas").toggleClass("fa-chevron-down fa-chevron-up");
      });

      // Add custom resource
      html.find(".add-extra-resource").click(async ev => {
        ev.preventDefault();
        await this._addExtraResource();
        this.render();
      });

      // Remove custom resource
      html.find(".remove-extra-resource").click(async ev => {
        ev.preventDefault();
        const key = ev.currentTarget.dataset.resource;
        await this._removeExtraResource(key);
        this.render();
      });

      /* --- INPUT IN GENERAL --- */

      // Normalize every input number
      html.find('input[type="number"]').each((i, el) => {
        const $el = $(el);

        // Losting focus, if empty, it's 0
        $el.on("blur", ev => {
          if (ev.currentTarget.value === "" || isNaN(ev.currentTarget.value)) {
            ev.currentTarget.value = 0;
          }
        });

        // If press 'Enter', guarantee it's 0
        $el.on("keypress", ev => {
          if (ev.key === "Enter") {
            if (ev.currentTarget.value === "" || isNaN(ev.currentTarget.value)) {
              ev.currentTarget.value = 0;
            }
          }
        });
      });

      // NOTE: Add custom click handlers or interactive features here
    }
  };
}
