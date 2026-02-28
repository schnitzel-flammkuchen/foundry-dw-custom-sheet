/**
 * Prepare and enrich equipment items for rendering in a Dungeon World sheet.
 *
 * Inspired by the implementation from the "dw-extra-sheets" module,
 * adapted and simplified for use in dw-custom-sheet.
 *
 * Responsibilities:
 * - Normalize actor data for Handlebars consumption
 * - Enrich item descriptions (TextEditor)
 * - Provide safe defaults for images
 * - Filter items to only equipment types
 *
 * @param {Object} context - Sheet context returned from getData()
 * @param {Actor} actor - The actor owning the items
 */
export async function prepareEquipmentItems(context, actor) {

  // Clone actor data to avoid mutating live documents
  const actorData = actor.toObject(false);

  context.actor = actorData;
  context.items = actorData.items ?? [];

  // Ensure consistent ordering
  context.items.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  // Inject labels from live Item documents
  for (const itemData of context.items) {
    const item = actor.items.get(itemData._id);
    if (item) itemData.labels = item.labels;
  }

  // Normalize tag display
  if (context.system.tags) {
    try {
      const parsed = JSON.parse(context.system.tags);
      context.system.tagsString = parsed
        .map(t => t?.value ?? String(t))
        .join(", ");
    } catch {
      context.system.tagsString = String(context.system.tags);
    }
  } else context.system.tagsString ??= "";

  // Foundry V12/V13 compatibility for TextEditor
  const RichText =
    foundry?.applications?.ux?.TextEditor?.implementation
    ?? globalThis.TextEditor;

  const enrichmentOptions = {
    async: true,
    documents: true,
    secrets: actor.isOwner,
    rollData: actor.getRollData()
  };

  const equipment = [];

  for (const itemData of context.items) {
    const item = actor.items.get(itemData._id);

    // Enrich description with proper roll context
    if (itemData.system?.description && RichText?.enrichHTML) {
      enrichmentOptions.relativeTo = item ?? null;
      enrichmentOptions.rollData = item?.getRollData?.() ?? actor.getRollData();

      itemData.system.descriptionEnriched =
        await RichText.enrichHTML(
          itemData.system.description,
          enrichmentOptions
        );
    }

    // Safe fallback icon
    itemData.img ??=
      CONFIG?.Token?.defaults?.texture?.src ?? "icons/svg/item-bag.svg";

    // Collect only equipment items
    if (itemData.type === "equipment") equipment.push(itemData);
  }
  context.equipment = equipment;
}
