# 🐉 Dungeon World: Custom Character Sheet

## Overview

A custom **player character sheet** module for **Dungeon World** on **Foundry VTT (v12+)**. This module adds an alternative **player character sheet** for Dungeon World, focusing on a different layout and sheet organization, and additional quality-of-life features — while remaining fully compatible with the official Dungeon World system.

## Motivation

This project started because my sibling once asked if I could make a few changes to the default Dungeon World character sheet, since they disliked it and wanted some small visual assets and layout tweaks.

At the time, I had **no prior experience with Foundry VTT development**, so I initially attempted to solve the problem by injecting JavaScript to rearrange existing elements and add new features. That approach quickly turned into an overly **hacky and fragile workaround**, so I decided to step back and properly learn how to build a Foundry module instead.

As a result, this module aims to provide tailored UI support and additional functionality to enhance the default Dungeon World experience, while keeping full compatibility with the core system.

---

## ✨ Features

<!-- TODO: add screenshots section -->

- Custom **player character sheet** for Dungeon World
- A different UI layout and clearer data organization
- Better separation of:

  - Core attributes (HP, Armor, Damage, Level, XP)
  - Resources (Forward, Ongoing, Hold, etc.)
  - Economy (Coin and Load)
  - Abilities and moves
- Additional roll functionality (including custom roll modes)
- Designed for Foundry VTT **v12+**
- Non-intrusive: does not alter core system data or rules

---

## ⚙️ Compatibility

  ✔️ Foundry VTT version 12 or later
  ✔️ Fully compatible with the official Dungeon World system

---

## 📦 Installation

### Foundry VTT

1. Install the module using its **[manifest URL]()** <!-- Add manifest raw github url -->

2. Activate the module in your world under:
   **Settings -> Manage Modules**

---

## 🔧 Usage

To use the custom character sheet:

1. Create or open a **Player Character** actor
2. Open **Sheet Configuration** (gear icon on the actor sheet)
3. Select **Customized Character Sheet**
4. Save and reopen the sheet if necessary

---

## 🧪 Development Notes

This module is under active development. Feedback, suggestions, and contributions are very welcome!

  - Author: schnitzel-flammkuchen
  - Repository: https://github.com/schnitzel-flammkuchen/foundry-dw-custom-sheet

---

## 🙏 Acknowledgements

This module **leverages and builds upon ideas and functionality from**
**[Dungeon World: Extra Sheets](https://github.com/GreybeardGM/dw-extra-sheets)** by GreybeardGM.

Many thanks for the inspiration and groundwork provided by that module.

---

## 📚 Languages

Feel free to submit a pull request or an issue containing translations for the entries in the `*.json` file inside `lang` folder.

  🇧🇷 Brazilian Portuguese  
  🇬🇧 English  
  🇫🇷 French  
  🇩🇪 German  
  🇮🇹 Italian   
  🇪🇸 Spanish  
  🇸🇪 Swedish  
  🇺🇦 Ukrainian

> Currently, the translations were created with the help of online translation tools and may require review by native speakers.

---

## ⚠️ Disclaimer

This is an unofficial Dungeon World module created as a learning project and is not affiliated with or endorsed by Sage Kobold Productions.  

It was developed specifically to meet the requirements of a user who requested certain changes to the default character sheet and, while it aims to be stable and usable, it may change over time or be abandoned.

---

## 📜 Licenses

This module is released under the MIT License.
Dungeon World © Sage Kobold Productions.
