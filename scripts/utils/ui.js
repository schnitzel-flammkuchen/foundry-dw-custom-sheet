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
 */
export function enablePersistentDropdowns(html) {
  // Find all dropdowns in all tabs
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

    // Click handler
    header.addEventListener("click", ev => {
      const ignoreTags = ["INPUT", "BUTTON", "SELECT", "TEXTAREA"];
      if (ev.target.closest("[data-ignore]") || ignoreTags.includes(ev.target.tagName)) return;

      ev.preventDefault();

      const currentlyOpen = content.style.display !== "none";
      const willOpen = !currentlyOpen;

      if (content.children.length > 0) $(content).slideToggle(150);

      if (icon) $(icon).toggleClass("fa-chevron-up fa-chevron-down");

      saveDropdownState(dropdownId, willOpen);
    });
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
