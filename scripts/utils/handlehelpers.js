// scripts/utils/handlehelpers.js

// Register handlebars helpers
export function registerHandlebarsHelpers() {
    // Localize helper - for equipment filter
    Handlebars.registerHelper('localizeFallback', function(key) {
        if (!key) return key;
        let compareKey = key.replace(/\s+/g, ''); // Normalize key
    
        // Extract the category if it exists, e.g.: "Placeholder.Name" -> ["Placeholder", "Name"] to be utilize to check if it exists on the module
        // Because Dungeon World natively doesn't have them
        let parts = compareKey.split('.');
        let baseKey = parts[parts.length - 1]; // Last part
        let category = parts.length > 1 ? parts[0] : null; // Category for (DWCS.*)
    
        // Tries mine first (DWCS.*)
        let fallbackKey = category ? `DWCS.${category}.${baseKey}` : `DWCS.${baseKey}`;
        let fallbackValue = game.i18n.localize(fallbackKey);
        if (game.i18n.has(fallbackKey)) return fallbackValue;
    
        // If mine hasn't, tries Dungeon World lang/*.json localize (DW.*)
        compareKey = key.startsWith("DW.") ? key : "DW." + key;
        let dwValue = game.i18n.localize(compareKey);
        if (game.i18n.has(compareKey)) return dwValue;
    
        // If none of them exist, returns the original key (maintain the way it is)
        return key;
    });
}