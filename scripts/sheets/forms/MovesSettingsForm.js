import { getCustomMoveTypes, getSidebarMoveTypes, getAutoAddMoveTypes } from "../../settings.js";

/**
 * FormApplication for managing custom moves,
 * their sidebar placement, and auto-add options.
 */
export class MovesSettingsForm extends FormApplication {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "dwcs-move-settings", // Unique DOM ID
      title: "DWCS.Settings.NewMoveTypes.name", // Form title displayed
      template: "modules/dw-custom-sheet/templates/settings/custom-moves-settings.hbs",
      width: 900,
      height: "auto",
      submitOnChange: false, // Only save on explicit submit
      closeOnSubmit: true // Close the form after saving
    });
  }

  constructor() {
    super();
    // Initialize table data from current game settings
    this.data = {
      moves: Object.entries(getCustomMoveTypes()).map(([key, val]) => ({
        key,
        singular: val.singular,
        plural: val.plural,
        sidebar: getSidebarMoveTypes()[key] ?? false,
        autoAdd: getAutoAddMoveTypes()[key] ?? false
      })),
      movesCompendium: game.settings.get("dw-custom-sheet", "MovesCompendium") || "",
      movesSource: game.settings.get("dw-custom-sheet", "MovesSource") || "both" // "global" | "compendium" | "both"
    };
  }

  getData() {
      return {
        moves: this.data.moves,
        movesCompendium: this.data.movesCompendium,
        movesSource: this.data.movesSource
      };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Add a new move row to the table
    html.find("#add-move").click(() => {
      this.data.moves.push({ key: "", singular: "", plural: "", sidebar: false, autoAdd: false });
      this.render();
    });

    // Remove a move row from the table
    html.on("click", ".remove-move", ev => {
      const idx = $(ev.currentTarget).closest("tr").data("index");
      this.data.moves.splice(idx, 1);
      this.render();
    });
  }

  /**
   * Updates the module settings based on the current form data
   * @param {Event} event - The submit event
   * @param {Object} formData - Key-value map of form inputs
   */
  async _updateObject(_event, formData) {
    const moveTypes = {}; // Stores singular/plural labels
    const sidebarTypes = {}; // Stores sidebar visibility (boolean)
    const autoAddTypes = {}; // Stores auto-add flag (boolean)

    // Iterate through each row using indexed input names like key-0, singular-0, etc.
    this.data.moves.forEach((_row, idx) => {
      const key = formData[`key-${idx}`]?.trim();
      if (!key) return; // Skip empty rows
      moveTypes[key] = {
        singular: formData[`singular-${idx}`] || "",
        plural: formData[`plural-${idx}`] || ""
      };
      sidebarTypes[key] = !!formData[`sidebar-${idx}`];
      autoAddTypes[key] = !!formData[`autoAdd-${idx}`];
    });

    // Save updated move configurations to the game settings
    await game.settings.set("dw-custom-sheet", "customMoveTypes", JSON.stringify(moveTypes, null, 2));
    await game.settings.set("dw-custom-sheet", "sidebarMoveTypes", JSON.stringify(sidebarTypes, null, 2));
    await game.settings.set("dw-custom-sheet", "autoAddMoveTypes", JSON.stringify(autoAddTypes, null, 2));

    await game.settings.set("dw-custom-sheet", "MovesCompendium", formData["movesCompendium"] || "");
    await game.settings.set("dw-custom-sheet", "MovesSource", formData["movesSource"] || "both");

    ui.notifications.info("DWCS: Custom moves settings saved!");
  }
}