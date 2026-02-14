// scripts/sheets/character-sheet.js

import { prepareEquipmentItems } from "../utils/equipment.js";
import { MOVE_META, MAX_CUSTOM_RESOURCES, RESOURCE_KEYS, ITEM_TYPE_LABELS, ITEM_TYPE_ICONS, ITEM_TYPE_ORDER } from "../utils/config.js";
import { enableSteppers } from "../utils/ui.js";
import { getSidebarMoveTypes, getCustomMoveTypes } from "../settings.js";

// Foundry V12 + V13 compatibility of TextEditor
const { TextEditor } = foundry.applications.ux ?? foundry.applications.ux.TextEditor.implementation

/**
 * Defines the custom character sheet class.
 * @param {*} baseClass - The base class to extend (usually the system's default ActorSheet)
 * @returns A custom character sheet class
 */
export function defineCharacterCustom(baseClass) {
  return class CharacterSheet extends baseClass {

    /**
     * Default options for the sheet.
     * Merges the base class options with the custom module settings.
     */
    static get defaultOptions() {
      const options = foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["dungeonworld", "sheet", "actor", "dw-custom-sheet"], // CSS classes for styling
        template: "modules/dw-custom-sheet/templates/character/character-sheet.hbs", // Custom Handlebars template
        width: 800, // Sheet width
        height: 900, // Sheet height
        tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "moves" }]
      });
      const isDark = document.body.classList.contains("theme-dark");
      if (isDark) options.classes.push("nightmode");
      return options;
    }

    /**
     * Override the template getter to force the custom template.
     * Without this, the system would use the default Dungeon World template.
     */
    get template() {
      return "modules/dw-custom-sheet/templates/character/character-sheet.hbs";
    }

    // Save filter selection (survives re-render)
    itemFilter = "all";

    /**
     * Prepare the data for the Handlebars template.
     * Returns all system data, items, and flags for rendering.
     * @param {*} options - Options passed from Foundry VTT
     * @returns {Object} Context object for the template
     */
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

        // Orders by TYPE OF ITEM only when filter's 'all'
        // (so items without type comes first)
        itemsToShow.sort((a, b) => {
          // If an item has no type, 'a' or 'b' becomes ""
          const typeA = a.system?.itemType || "";
          const typeB = b.system?.itemType || "";

          // Items without type will come first

          // 'a' has no type, 'b' has so 'a' should come before 'b'
          if (!typeA && typeB) return -1;
          // 'a' has, 'b' hasn't so 'b' should come before 'a'
          if (typeA && !typeB) return 1;
          // Neither have a type so maintain their current relative order
          if (!typeA && !typeB) return 0;

          // Both have a type so compare their positions in ITEM_TYPE_ORDER
          const indexA = ITEM_TYPE_ORDER.indexOf(typeA);
          const indexB = ITEM_TYPE_ORDER.indexOf(typeB);

          // Types not in ITEM_TYPE_ORDER go to the end
          const safeIndexA = indexA === -1 ? ITEM_TYPE_ORDER.length : indexA;
          const safeIndexB = indexB === -1 ? ITEM_TYPE_ORDER.length : indexB;

          return safeIndexA - safeIndexB;
        });
      } else itemsToShow = allItems.filter(i => i.system?.itemType === this.itemFilter);
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
      const allMoves = this.actor.items.filter(i => i.type === "move");
      
      // Keep track of processed move IDs to avoid duplicates
      const processedMoveIds = new Set();

      // Base categories (basic/starting/advanced/special)
      const baseCategories = MOVE_META.filter(c => c.moveType);

      // Custom move types and sidebar configuration from settings
      const customTypes = getCustomMoveTypes();
      const sidebarTypes = getSidebarMoveTypes();

      // Builds dynamic categories from custom settings (avoids duplicates with system ones)
      const customCategories = Object.entries(customTypes).map(([type, label]) => {
        const alreadyExists = MOVE_META.some(m => m.moveType === type);
        if (alreadyExists) return null;

        return {
          key: `${type}Moves`,
          title: label.plural,
          moveType: type,
          name: `${type}-moves`
        };
      }).filter(Boolean);

      // Fallback "other moves" category (moves without a defined type)
      const otherCategory = MOVE_META.find(c => !c.moveType)
        ||
        {
          key: "moves",
          title: "DW.MovesOther",
          name: "other-moves"
        };

      // Merge categories (system + custom + fallback; that order)
      const allCategories = [
        ...baseCategories,
        ...customCategories,
        otherCategory
      ];

      // Collects all defined moveTypes to determine fallback
      const definedMoveTypes = allCategories.map(c => c.moveType).filter(Boolean);

      // Split moves used by template: main vs sidebar
      const moveMainList = [];
      const moveSideList = [];

      for (const cat of allCategories) {
        // Filters moves belonging to the current category
        const movesInCat = allMoves.filter(m => {
          // Prevents duplicates
          if (processedMoveIds.has(m.id)) return false;

          const belongs = !cat.moveType
            ? !definedMoveTypes.includes(m.system.moveType)
            : m.system.moveType === cat.moveType;

          if (belongs) processedMoveIds.add(m.id);
          return belongs;
        });

        // Processes and enriches each move before sending to template
        const processedMoves = await Promise.all(movesInCat.map(async m => {
          const moveObj = m.toObject();

          /* --- MOVE RESULTS --- */

          // Ensures moveResults structure exists
          moveObj.system.moveResults = moveObj.system.moveResults || {};
          for (const key of ["success", "partial", "failure"]) {
            const raw = moveObj.system.moveResults?.[key]?.value
              ?? moveObj.system.results?.[key === "failure" ? "fail" : key]
              ?? "";

            moveObj.system.moveResults[key] = {
              value: !!raw ? 1 : 0,
              enriched: raw ? await TextEditor.enrichHTML(raw, {
                async: true,
                documents: true,
                secrets: this.actor.isOwner,
                relativeTo: m,
                rollData: m.getRollData()
              }) : ""
            };
          }

          /* --- MOVE CHOICES --- */

          // Normalizes choices to always be an array
          if (!Array.isArray(moveObj.system.choices)) {
            moveObj.system.choices = moveObj.system.choices
              ? [moveObj.system.choices]
              : (moveObj.system.results?.choices || []);
          }
          moveObj.system.choicesEnriched = moveObj.system.choicesEnriched || moveObj.system.choices.join(", ");

          /* --- DESCRIPTION --- */

          // Ensures enriched description exists
          moveObj.system.descriptionEnriched = moveObj.system.description
            ? await TextEditor.enrichHTML(moveObj.system.description, {
                async: true,
                documents: true,
                secrets: this.actor.isOwner,
                relativeTo: m,
                rollData: m.getRollData()
              })
            : "";

          return moveObj;
        }));

        // Assigns category to sidebar or main tab based on setting
        if (cat.moveType && sidebarTypes[cat.moveType]) {
          moveSideList.push({ ...cat, moves: processedMoves });
        } else {
          moveMainList.push({ ...cat, moves: processedMoves });
        }
      }

      // Set context for template (separated lists to template)
      context.moveCategories = moveMainList;
      context.moveCategoriesSidebar = moveSideList;

      /* --- CUSTOM RESOURCES --- */

      // Dungeon World's 'template.json' gives an actor:
      // "resource1": {
      //   "label": "Custom Resource",
      //   "value": 0,
      //   "max": 0
      // }
      // But will change its label and add up more resources (defined in utils/config.js)

      const attrs = context.actor.system.attributes;
      // Starts with value and max. being 0
      // 0 if undefined
      RESOURCE_KEYS.forEach(k => {
        const attr = attrs[k];
        if (attr) {
          attr.value = Number(attr.value ?? 0);
          attr.max = Number(attr.max ?? 0);
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
      const localizedLabel = game.i18n.localize("DWCS.Custom.DefaultResource");

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
      html.find('#equipment-search input').on('input', ev => {
        const query = ev.currentTarget.value.toLowerCase();
        html.find('.items-list li').each((_, li) => {
          const name = $(li).find('.item-label').text().toLowerCase();
          $(li).toggle(name.includes(query));
        });
      });

      /* --- CUSTOM RESOURCE --- */

      // Ensure base custom resource exists and is normalized
      this._ensureResource1();

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
      
      /* --- DYNAMIC STEPPERS --- */
      // Handle left/right click on generic steppers and clamp its value according to attributes settings
      enableSteppers(html);
      
      /* --- CIRCULAR XP --- */
      html.find('.xp-circle').each((i, circle) => {
        circle = $(circle);
        const xp = Number(circle.data('xp'));
        const xpMax = Number(circle.data('xp-max'));
        const progressCircle = circle.find('.xp-progress')[0];

        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const percent = Math.min(xp / xpMax, 1);
        const offset = circumference * (1 - percent);

        progressCircle.style.strokeDasharray = circumference;
        progressCircle.style.strokeDashoffset = offset;

        // Level up indicator
        if (circle.data('levelup') === true || circle.data('levelup') === "true") {
          progressCircle.style.stroke = "var(--accent-color)"; // Changes its color to the accent one variable on CSS
          circle.find('.level-input').addClass('level-up-ready');
        } else progressCircle.style.stroke = "#fff"; // Otherwise is white
      });

      // Toggle XP input visibility
      html.find('.edit-xp-icon').on('click', ev => {
        ev.preventDefault();

        const wrapper = $(ev.currentTarget).closest('.xp-circle').find('.xp-input-wrapper');
        wrapper.toggleClass('active');
        if (wrapper.hasClass('active')) {
          const input = wrapper.find('input.xp-input');
          input.focus();

          // Leaving focus, it hides again
          input.one('blur', () => {
            wrapper.removeClass('active');
          });
        }
      });

      // NOTE: Add custom click handlers or interactive features here
    }
  };
}
