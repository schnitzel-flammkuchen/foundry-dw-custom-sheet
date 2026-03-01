/**
 * Normalizes input values.
 * 
 * Numeric inputs default to 0 if left empty, and required text inputs
 * (data-required="true") revert to the last valid value if left empty.
 * Warnings are localized using game.i18n.format with field names.
 */
export function normalizeInputs(html) {
  const $html = $(html);

  /**
   * Adds validation to a single input.
   * @param {HTMLInputElement} input
   * @param {boolean} isNumeric
   */
  function addValidation(input, isNumeric = false) {
    // Determine the field name for notifications
    // Preferable dataset.label if set, otherwise fallback to input name
    const fieldName = input.dataset.label || input.name;
    // Store the current value as the last valid value
    input.dataset.previous = input.value;

    const validate = () => {
      const val = input.value.trim();
      if (isNumeric ? val === "" || isNaN(Number(val)) : val === "") {
        // Notify the user that this field cannot be empty/invalid
        ui.notifications.warn(game.i18n.format("DWCS.Notifications.EmptyField", { field: fieldName }));
        // Revert input to the last valid value (or 0 for numeric fields if no previous value exists)
        input.value = isNumeric ? (input.dataset.previous || 0) : input.dataset.previous;
      } else input.dataset.previous = input.value; // Update the last valid value
    };

    $(input).on("change", validate); // Listen for changes and validate it
    $(input).on("keypress", ev => { if (ev.key === "Enter") validate(); }); // Listen for 'Enter' to validate it immediately
  }

  // Numeric inputs
  $html.find('input[type="number"]').each((_, el) => addValidation(el, true));

  // Required text inputs
  $html.find('input[type="text"][data-required="true"]').each((_, el) => addValidation(el, false));
}

/**
 * Persistent dropdown manager for tabs like moves and spells.
 * Restores open/closed state per dropdown per tab using localStorage.
 * Works even if the tab is not active at render.
 * Ignores clicks on interactive elements or [data-ignore].
 * 
 * enablePersistentDropdowns($('.sheet-main'));
 */
const DROPDOWN_FLAG_NAMESPACE = "dw-dropdown";

function getDropdownKey(id) {
  return `${DROPDOWN_FLAG_NAMESPACE}-${id}`;
}

function saveDropdownState(id, isOpen) {
  try { localStorage.setItem(getDropdownKey(id), JSON.stringify(isOpen)); } 
  catch (err) { console.error(`Failed to save dropdown state for ${id}`, err); }
}

function loadDropdownState(id, defaultValue = false) {
  try {
    const raw = localStorage.getItem(getDropdownKey(id));
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load dropdown state for ${id}`, err);
    return defaultValue;
  }
}

/**
 * Enables persistent dropdowns inside tabs.
 * Toggles dropdowns on header click.
 * Restores saved open/closed state per dropdown.
 * Opens the dropdown automatically if an item-create button is clicked (moves/spells only - if it's currently closed).
 * And, finally, saves state in localStorage.
 */
export function enablePersistentDropdowns(html) {
  // Iterate over all dropdowns
  html.find("[data-dropdown]").each((index, dropdownEl) => {
    const dropdown = dropdownEl;
    const header = dropdown.querySelector("[data-header]");
    const content = dropdown.querySelector("[data-content]");
    if (!header || !content) return;

    // Determine the tab name for namespace
    const tabEl = dropdown.closest(".tab");
    const tabName = tabEl?.dataset.tab ?? "unknown";

    // Unique ID: tab + dropdown-id or index
    const dropdownId = dropdown.dataset.dropdownId
      ? `${tabName}-${dropdown.dataset.dropdownId}`
      : `${tabName}-dropdown${index}`;

    // Restore state
    const isOpen = loadDropdownState(dropdownId, !dropdown.hasAttribute("data-collapsed"));
    content.style.display = isOpen ? "" : "none";

    // Chevron icon
    const icon = header.querySelector("i[class*=fa-chevron]");
    if (icon) {
      icon.classList.toggle("fa-chevron-up", isOpen);
      icon.classList.toggle("fa-chevron-down", !isOpen);
    }

    /**
     * Click handler.
     * Header click toggles dropdown normally.
     */
    header.addEventListener("click", ev => {
      if (ev.target.closest("[data-ignore]")) return;

      ev.preventDefault();

      const currentlyOpen = content.style.display !== "none";
      const willOpen = !currentlyOpen;

      if (content.children.length > 0) $(content).slideToggle(150);

      if (icon) $(icon).toggleClass("fa-chevron-up fa-chevron-down");

      saveDropdownState(dropdownId, willOpen);
    });

    /**
     * Handle automatic opening for moves/spells dropdowns when item-create is clicked
     */
    const itemControls = dropdown.querySelector(".item-controls");
    const hasItemsList = dropdown.querySelector(".items-list");

    if (itemControls && hasItemsList) {
      itemControls.addEventListener("click", ev => {
        const btn = ev.target.closest(".item-create");
        if (!btn) return;

        // Only open if currently closed (chevron down)
        const isClosed = icon && icon.classList.contains("fa-chevron-down");
        if (!isClosed) return; // Already open, do nothing

        // Open the dropdown and change icon
        $(content).slideDown(150);
        if (icon) $(icon).toggleClass("fa-chevron-up fa-chevron-down");

        // Save state
        saveDropdownState(dropdownId, true);
      });
    }
  });
}

/**
 * Auto stepper for numeric inputs.
 * It enables automatic stepper behavior for numeric input elements.
 *
 * Any '<input type="number">' marked with the 'data-stepper' attribute
 * will gain mouse and keyboard controls for incrementing and decrementing
 * its value, with optional min/max constraints defined declaratively in HTML.
 */
export function enableSteppers(html) {
  // Finds the wrapper element for this input
  const getWrapper = input => {
    // Get optional wrapper selector
    const selector = input.dataset.wrapper
    // If selector exists, find closest matching ancestor, else default to direct parent
    return selector ? input.closest(selector) : input.parentElement;
  };

  // Finds the maximum allowed value for this input
  const getMax = input => {
    const maxAttr = input.dataset.max;
    if (!maxAttr) return Number.POSITIVE_INFINITY;

    // If it's a number, use it directly
    const maybeNumber = Number(maxAttr);
    if (!isNaN(maybeNumber)) return maybeNumber;

    // Otherwise, treat it as as selector; it search for the max. element inside the same logical wrapper
    const element = getWrapper(input)?.querySelector(maxAttr);
    // Read its value and converts to number
    const max = Number(element?.value);

    // If the value's a finite number, uses it, otherwise, treat the max. as unlimited
    return Number.isFinite(max) ? max : Number.POSITIVE_INFINITY;    
  };

  // Helper function: clamp value between min and max
  const clamp = (value, min, max) => {
    if (!isNaN(max)) value = Math.min(value, max); // Ensure value's <= max.
    if (!isNaN(min)) value = Math.max(value, min); // Ensure value's >= min.
    return value;
  };

  // Find all input elements inside 'html' with the attribute data-stepper
  html.find("input[data-stepper]").each((_, el) => { // '_' being the 'index', passed but not used
    const input = el;

    // Increment by step - default being 1
    const step = Number(input.dataset.step ?? 1);

    // If there's data-min defined: puts the number, if no number, see if it allows negative, if yes then it goes to -Infinity, otherwise default to 0
    const min =
      input.dataset.min !== undefined
        ? Number(input.dataset.min)
        : input.hasAttribute("data-allow-negative")
          ? Number.NEGATIVE_INFINITY
          : 0;

    /* --- Value Update Helper --- */
    const updateValue = delta => {
      const max = getMax(input);
      const current = Number(input.value) || 0;
      input.value = clamp(current + delta, min, max);

      // Notify reactive systems without committing
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    /* --- Commit Helper --- */
    const commitValue = () => {
      const max = getMax(input);
      const value = Number(input.value) || 0;
      input.value = clamp(value, min, max);

      // Commit value
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    /* --- Mouse Controls --- */
    input.addEventListener("mousedown", ev => {
      if (ev.ctrlKey || ev.metaKey) return; // Allow ctrl/meta for normal behavior

      ev.preventDefault(); // Prevent native spinner/selection
      input.focus(); // Required so blur will fire later

      // Left click decreases, right click increases
      // Contraintuitive (left click increases; right click decreases) due to Dungeon World own increment/decrement (on equipment tags like 'Uses')
      if (ev.button === 0) updateValue(+step); 
      if (ev.button === 2) updateValue(-step);
    });

    // Prevent right-click context
    input.addEventListener("contextmenu", ev => ev.preventDefault());

    /* --- Keyboard Controls --- */
    input.addEventListener("keydown", ev => {
      if (ev.ctrlKey || ev.metaKey) return;

      // ArrowUp increases, ArrowDown decreases
      // Enter confirms
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        input.focus();
        updateValue(step);
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        input.focus();
        updateValue(-step);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        commitValue();
      }
    });

    // Commit on loss of focus
    input.addEventListener("blur", commitValue);
  });
}

// Import the item type icons mapping from the config for subsequent use in the 'updateContentLinkIcons' function
import { ITEM_TYPE_ICONS } from "./config.js";

/**
 * Updates icons for content links (items, moves, spells, etc.).
 * 
 * Each link with class 'content-link' is inspected for its UUID. If a valid
 * item is found, the icon inside the link is updated based on the item's type.
 * Special handling exists for moves and spells, with fallback for equipment
 * or custom types. Preserves CSS transitions by replacing the class.
 * @param {HTMLElement|jQuery} html - The root HTML of the sheet
 */
export function updateContentLinkIcons(html) {
  // Normalize jQuery -> HTMLElement
  let root = html;
  if (typeof html?.jquery !== "undefined") root = html[0];
  if (!root || !(root instanceof HTMLElement)) return;

  // Iterate over all content links
  root.querySelectorAll(".content-link").forEach(link => {

    // Get the UUID of the linked item
    const uuid = link.dataset.uuid;
    if (!uuid) return;

    // Retrieve the item from Foundry
    const item = fromUuidSync(uuid);
    if (!item || item.documentName !== "Item") return;

    // Determine the type: check moves first, then spells, then fallback to system itemType or equipment
    let type;
    if (item.type === "move") type = "move"; // DW moves
    else if (item.type === "spell") type = "spell"; // DW spells
    else type = item.system?.itemType || "equipment"; // fallback for equipment or custom types

    // Select the corresponding icon class from the config
    // Special cases for 'move' and 'spell', otherwise fallback to ITEM_TYPE_ICONS or 'fa-suitcase'
    let iconClass;
    if (type === "move") iconClass = "fal fa-dice-d20"; // Default move icon
    else if (type === "spell") iconClass = "fas fa-sparkles"; // Default spell icon
    else iconClass = ITEM_TYPE_ICONS[type] || "fas fa-suitcase"; // Fallback - none of these

    // Update the <i> element inside the link, preserving CSS transitions
    const iElem = link.querySelector("i");
    if (iElem) iElem.className = iconClass;
  });
}

/**
 * Dynamically applies permission-based CSS classes to all secret blocks in a sheet.
 * Works for ActorSheets, ItemSheets, JournalEntryPage and ChatMessages sheets.
 * Adds 'authorized' class if the current user is:
 * - ASSISTANT GM of the Actor (permission 2)
 * - GM (game.user.isGM)
 * Else adds 'unauthorized'.
 * Handles 'default' fallback in the ownership object.
 * @param {Application} sheet - The sheet being rendered
 * @param {HTMLElement|jQuery} html - The root HTML of the sheet
 */
export function applyOwnershipClasses(sheet, html) {
  // Normalize jQuery -> HTMLElement
  let root = html;
  if (typeof html?.jquery !== "undefined") root = html[0];
  if (!root || !(root instanceof HTMLElement)) return;
  
  const doc = sheet.document;
  if (!doc) return;
  
  let isAuthorized = false;
  const gm = game.user.isGM;

  // Helper to check ownership (ASSISTANT)
  const hasPermission = (entity) => {
    const perm = entity?.ownership?.[game.user.id] ?? entity?.ownership?.["default"] ?? 0;
    return perm === CONST.DOCUMENT_OWNERSHIP_LEVELS.ASSISTANT;
  };

  if (doc instanceof Actor || doc instanceof Item || doc instanceof JournalEntry || doc instanceof JournalEntryPage) {
    // -----------------------------------------
    // ActorSheet & ItemSheet & any JournalEntry
    // -----------------------------------------
    // TODO: ADD SETTING TO ALLOW ASSISTANTS TO SEE UNREVEALED SECRETS, BUT NOT EDIT THEM. CURRENTLY, ONLY GMS CAN SEE SECRETS AND EDIT THEM.
    // TODO: ADD SETTINGS TO ALLOW ASSISTANTS TO SEE SECRETS BUT NOT EDIT THEM.
    // TODO: ADD SETTINGS TO ALLOW ASSISTANTS TO EDIT SECRETS BUT NOT SEE UNREVEALED ONES. ADD SETTING TO LET GM DECIDE WHO CAN SEE SECRETS AND WHO CAN EDIT THEM.
    // isAuthorized = gm || (parent && hasPermission(parent));
    isAuthorized = gm; // Only the GM will be authorized to see secrets and edit them. Assistants will not be able to see secrets not revealed, but they will be able to edit the sheet.
    // // Debug doc info:
    // console.log("Doc:", doc?.name, "\nOwnership:", doc?.ownership, "\nUser level:", doc?.getUserLevel(game.user), "\nAuthorized:", isAuthorized);
    // Example in FoundryVTT console: game.actors.getName("CHARACTER NAME").sheet.document.ownership.{USERID}
  } else if (doc instanceof ChatMessage) {
    // ---------------------------
    // ChatMessage
    // ---------------------------
    if (gm || doc.user?.id === game.user.id) isAuthorized = true;
    else if (doc.speaker?.actor) {
      const actor = game.actors.get(doc.speaker.actor);
      isAuthorized = actor && hasPermission(actor);
    }
    // console.log("Doc:", doc?.name, "\nOwnership:", doc?.ownership, "\nUser level:", doc?.getUserLevel(game.user), "\nAuthorized:", isAuthorized);
  }

  // ------------------------------------------
  // Apply CSS to ALL secret blocks AND editors
  // ------------------------------------------
  const applyToSecret = (secret) => {
    const parent = secret.parentElement;
    if (parent) {
      parent.classList.toggle("authorized", isAuthorized);
      parent.classList.toggle("unauthorized", !isAuthorized);
    }

    const editor = secret.closest(".editor");
    if (editor) {
      editor.classList.toggle("authorized", isAuthorized);
      editor.classList.toggle("unauthorized", !isAuthorized);
    }
  };

  // -----------------------------------
  // Apply to all existing secret blocks
  // -----------------------------------
  root.querySelectorAll("section.secret").forEach(applyToSecret);
}

/**
 * Converts secret reveal buttons into icon-based buttons.
 * Changes the button on secret sections to be replaced with an icon that
 * visually represents the revealed state ('fa-eye' for revealed, 'fa-eye-slash'
 * for hidden). Observes the root for dynamically added buttons.
 * @param {HTMLElement|jQuery} root - The root element to search for secret buttons
 */
export function convertSecretButtonsToIcons(root) {
  // Normalize jQuery -> HTMLElement
  if (!root) return;
  if (typeof root.jquery !== "undefined") root = root[0];
  if (!(root instanceof HTMLElement)) return;

  // Convert all buttons already present in the root
  root.querySelectorAll('section.secret button.reveal').forEach(btn => {
    if (btn.querySelector('i.reveal-icon')) return; // Skip if already converted

    const secret = btn.closest('section.secret');
    if (!secret) return;

    const icon = document.createElement('i');
    icon.classList.add('reveal-icon', 'fas');
    if (secret.classList.contains('revealed')) icon.classList.add('fa-eye');
    else icon.classList.add('fa-eye-slash');

    btn.textContent = '';
    btn.appendChild(icon);

    btn.addEventListener('click', () => {
      const revealed = secret.classList.contains('revealed');
      icon.classList.toggle('fa-eye', !revealed);
      icon.classList.toggle('fa-eye-slash', revealed);
    });
  });

  // Observe dynamically added buttons
  const observer = new MutationObserver(() => {
    root.querySelectorAll('section.secret button.reveal').forEach(btn => {
      if (btn.querySelector('i.reveal-icon')) return;

      const secret = btn.closest('section.secret');
      if (!secret) return;

      const icon = document.createElement('i');
      icon.classList.add('reveal-icon', 'fas');
      if (secret.classList.contains('revealed')) icon.classList.add('fa-eye');
      else icon.classList.add('fa-eye-slash');

      btn.textContent = '';
      btn.appendChild(icon);

      btn.addEventListener('click', () => {
        const revealed = secret.classList.contains('revealed');
        icon.classList.toggle('fa-eye', !revealed);
        icon.classList.toggle('fa-eye-slash', revealed);
      });
    });
  });

  observer.observe(root, { childList: true, subtree: true });
}