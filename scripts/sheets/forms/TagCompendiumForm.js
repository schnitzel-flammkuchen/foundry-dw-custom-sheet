import { prepareHealthEstimateCompendium } from "../../main.js";

/**
 * FormApplication for managing the Tag Compendium setting
 * used by the Health Estimate feature.
 */
export class TagCompendiumForm extends FormApplication {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "dwcs-tagcomp-settings", // Unique DOM ID
      title: "DWCS.Settings.TagCompendium.name", // Form title displayed
      template: "modules/dw-custom-sheet/templates/settings/tag-compendium.hbs",
      width: 600,
      height: "auto",
      submitOnChange: false, // Only save on explicit submit
      closeOnSubmit: true // Close the form after saving
    });
  }

  constructor() {
    super();

    // Initialize form data from current game settings
    this.data = {
      tagCompendium: game.settings.get("dw-custom-sheet", "TagCompendium") || "",
      tagSource: game.settings.get("dw-custom-sheet", "TagSource") || "both" // "global" | "compendium" | "both"
    };
  }

  getData() {
    return {
      tagCompendium: this.data.tagCompendium,
      tagSource: this.data.tagSource
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
  }

  /**
   * Saves the updated Tag Compendium settings
   * @param {Event} _event - Submit event
   * @param {Object} formData - key/value of inputs
   */
  async _updateObject(_event, formData) {
    // Save compendium string
    const compendiumName = formData["tagCompendium"] || "";
    await game.settings.set("dw-custom-sheet", "TagCompendium", compendiumName);

    // Save source choice: global | compendium | both
    const sourceChoice = formData["tagSource"] || "both";
    await game.settings.set("dw-custom-sheet", "TagSource", sourceChoice);

    // Reload cached compendium
    await prepareHealthEstimateCompendium();

    ui.notifications.info(`DWCS: Tag Compendium settings saved!`);
  }
}