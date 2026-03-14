// forms/settingsForms.js
import { MovesSettingsForm } from "./MovesSettingsForm.js";
import { SecretAccessForm } from "./SecretAccessForm.js";
import { TagCompendiumForm } from "./TagCompendiumForm.js";

/**
 * Expose all form applications for registration
 * in the module settings menus.
 */
export const forms = {
  MovesSettings: MovesSettingsForm, // Form for configuring custom moves
  SecretAccess: SecretAccessForm, // Form for selecting players with secret access
  TagCompendium: TagCompendiumForm // Form for selecting the compendium used for tags
};