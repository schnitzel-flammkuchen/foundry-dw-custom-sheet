import { getSecretAccessPlayers } from "../../settings.js";

/**
 * FormApplication for selecting which non-GM players
 * have GM-like access to secret blocks in Journals,
 * Actors, and Items.
 */
export class SecretAccessForm extends FormApplication {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "dwcs-secret-access", // Unique DOM ID
      title: "DWCS.Settings.SecretAccessPlayers.name", // Form title displayed
      template: "modules/dw-custom-sheet/templates/settings/secret-access.hbs",
      width: 600,
      height: "auto",
      submitOnChange: false, // Only save on explicit submit
      closeOnSubmit: true // Close the form after saving
    });
  }

  constructor() {
    super();
    // Get list of players who currently have secret access
    const secretIds = getSecretAccessPlayers();
    // Build form data: list of non-GM users with checkbox for access
    this.data = {
      players: game.users.filter(u => !u.isGM).map(u => ({
        id: u.id,
        name: u.name,
        hasAccess: secretIds.includes(u.id)
      }))
    };
  }

  getData() {
    return this.data; // Provide data context to the template
  }

  async _updateObject(_event, _formData) {
    // Collect IDs of players with access checked
    const haveSecretAccess = this.data.players.filter(p => p.hasAccess).map(p => p.id);
    // Save updated access list to module settings
    await game.settings.set("dw-custom-sheet", "SecretAccessPlayers", JSON.stringify(haveSecretAccess, null, 2));
    
    // Map IDs to user names
    const whoHasIt = haveSecretAccess
      .map(id => game.users.get(id)?.name || id) // Fallback to ID if user not found
      .join(", ");

    // Show notification with user names
    if (whoHasIt) ui.notifications.info(`DWCS: Access Granted to "${whoHasIt}"`);
    else ui.notifications.info(`DWCS: No Access Granted to any User`);
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Update the internal data when a checkbox changes
    html.find("input[type=checkbox]").change(ev => {
      const id = $(ev.currentTarget).data("id");
      const player = this.data.players.find(p => p.id === id);
      player.hasAccess = ev.currentTarget.checked;
    });
  }
}