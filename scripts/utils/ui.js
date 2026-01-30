/**
 * Enables generic dropdown behavior based on data attributes.
 * 
 * A container element maked with 'data-dropdown'; a clickable header inside it as 'data-header' and its collapsible content as 'data-content'.
 * Elements marked with 'data-ignore' inside the header do not trigger the dropdown.
 */
export function enableDropdowns(html) {

  // For each container marked as dropdown
  html.find("[data-dropdown]").each((_, dropdownEl) => {
    const dropdown = dropdownEl;

    // Find header and content within the dropdown container
    const header  = dropdown.querySelector("[data-header]");
    const content = dropdown.querySelector("[data-content]");

    // Abort if required elements are missing
    if (!header || !content) return;

    // Optional initial state: collapsed by default
    if (dropdown.hasAttribute("data-collapsed")) content.style.display = "none";

    header.addEventListener("click", ev => {
      if (ev.target.closest("[data-ignore]")) return;
      ev.preventDefault();

      // Only animate if the content actually has children
      // (helps with visual 'blinking')
      if (content.children.length > 0) $(content).slideToggle(150);

      // Automatically toggle chevron icons inside the header if they are present
      const icon = header.querySelector("i[class*=fa-chevron]");
      if (icon) $(icon).toggleClass("fa-chevron-up fa-chevron-down");
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
      if (ev.button === 0) updateValue(-step); 
      if (ev.button === 2) updateValue(+step);
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
