/**
 * Sets up the character class input listeners
 * @param {JQuery<HTMLElement>} html - the sheet HTML
 */
export function setupClassListeners(html) {
  const classMap = new Map();
  html.find('datalist#classlist option').each((i, opt) => {
    const id = opt.getAttribute('value'); // E.g. "The Barbarian"
    if (!id) return;

    const idClean = id.replace(/^The /i, ''); // Remove "The " prefix
    const label = game.i18n.localize(`DWCS.Classes.${idClean}`) || idClean; // Translated label plus fallback if has not to guarantee label isn't empty
    if (label && classMap.has(label.toLowerCase())) el.value = label;

    // Store label lowercade for case-insensitive matching
    classMap.set(label.toLowerCase(), id);
    opt.setAttribute('value', label); // Replace datalist option value with translated label
  });

  const classInput = html.find('input[name="system.details.class"]');

  // Initialize input value with translated label
  classInput.each((i, el) => {
    const val = el.value.trim();
    if (!val) return;
    const idClean = val.replace(/^The /i, '');
    const label = game.i18n.localize(`DWCS.Classes.${idClean}`) || idClean;
    if (classMap.has(label.toLowerCase())) {
      el.value = label;
      el.dataset.backup = label; // Store current valid label as backup
    }
  });

  // Intercept input changes
  classInput.on('change', event => {
    const el = event.currentTarget;
    const val = el.value.trim();

    if (!val) return; // Keep empty input empty

    const valLower = val.toLowerCase(); // Normalize for case-insensitive lookup
    if (classMap.has(valLower)) el.value = classMap.get(valLower);
    else {
      console.warn(`${game.i18n.localize("DWCS.Warnings.InvalidClass")}: ${val}`);
      el.value = el.dataset.backup || ""; // Restore previous valid value
    }
  });
}

/**
 * Sets up the character name input listeners
 * @param {JQuery<HTMLElement>} html - The sheet HTML
 * @param {Actor} actor - The actor to restore name from
 * @param {HTMLFormElement} form - The form element of the sheet
 */
export function setupNameListeners(html, actor, form) {
  const nameInput = html.find('input[name="name"]');

  // On change or form submit
  nameInput.on('change', event => {
    const el = event.currentTarget;
    if (!el.value.trim()) el.value = actor.name; // Restore original name if empty
  });

  // Extra safety on submit (intercepts before the sheet submits, just in case)
  form.addEventListener('submit', () => {
    const el = nameInput[0];
    if (el && !el.value.trim()) el.value = actor.name;
  });
}
