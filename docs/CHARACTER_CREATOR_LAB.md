# AdvengerSAGA v1.6 — Original Character Creator Lab

**One complete editable original playable character per browser.** This is an extension of the v1.5 Skill Creator, not a replacement for existing Saber, Mage, Tank, Gunner or Tanjiro files. Its purpose is to let a player define a fifth *candidate* character, then choose four main-party members in the unchanged 4+2 battle format.

## Build your character

1. Open the game and press **👤 สร้างตัวละคร** in the main navigation.
2. Choose a display name, optional Thai name, and one approved class: Saber, Mage, Tank, or Gunner. Each class uses the original approved lightweight combat movement and animation assets as its initial move set.
3. Open the **30 Stat** groups to edit Core/Offense/Defense/Effect/Utility. Changing class loads the class template (and clears the uploaded portrait); **↺ ใช้ค่าสายนี้** explicitly resets the 30 stat values. Values starting from the class template are *test baselines*, not authoritative Seven Knights balance.
4. Optionally choose an image via **PNG / JPG / WebP**, maximum **600 KB**. This is a local image saved into browser storage. SVG and remote URLs are deliberately not accepted. Without a custom image the class's existing SVG illustration is used.
5. Select saved skills for **Basic, Skill 1, Skill 2 and Ultimate** via the right-hand slot selectors. They come from the existing **Skill Creator** database; if a slot is blank, the inherited class action remains playable.
6. Press **💾 สร้าง / บันทึกตัวละคร**. The game reloads so the static battle application can build its formation roster from the new registered character. Go to **จัดทีม** and click a main slot, then pick your character. It takes one of the existing **four** positions; there is no fifth combat slot.
7. In Battle, the created character has its own HP/P_ATK/M_ATK/DEF/SPD values, uses SPD-based initiative, and can cast its equipped custom skills through the same shared 30-stat, status, life and skill engines. The original class animations are retained until custom animation production is added.

The hero's stable internal ID is `custom-hero`. Changing the name, class or stats edits the same saved character on reload instead of creating duplicates. Clearing the hero deletes its local record and the skill equipment associated with it; if it was in the active formation, the game safely falls back to its original roster on reload.

## Class defaults

| Class | MAX_HP | P_ATK | M_ATK | DEF | SPD |
| --- | ---: | ---: | ---: | ---: | ---: |
| Saber | 1,000 | 260 | 90 | 160 | 110 |
| Mage | 800 | 70 | 320 | 100 | 100 |
| Tank | 1,500 | 140 | 70 | 300 | 75 |
| Gunner | 900 | 290 | 70 | 110 | 120 |

Starting bonus rates are illustrative: Saber CRIT_RATE +10%, COUNTER_RATE +5%; Mage EFFECT_HIT +15%, WEAK_RATE +5%; Tank BLOCK_RATE +20%, DMG_REDUCTION +5%; Gunner CRIT_RATE +15%, DEF_PEN +5%. All other fields begin at 0, unless the player edits them. **Not all these stats are yet consumed by finalized combat formulas**: missing critical, block, evasion, penetration and other advanced mechanics remain independent upcoming work.

The 30-field dictionary comes from `AdvengerStatDB.all()`. Numeric rates are entered in the UI as **percentages** (40 means 40%) but saved as fractions (0.40), as in the existing Stat Engine.

## Persistence and backups

- A single character record is saved locally under `AdvengerSAGA_CHARACTER_CREATOR_V1`.
- Per-character custom skill assignments are saved under the existing `AdvengerSAGA_SKILL_CREATOR_V1` Skill Creator library; it is authoritative after the character's first creation. Updating slots in the Character Creator syncs to the same skill library.
- **ส่งออก JSON** includes the character, its 30 stats, any uploaded raster portrait and the **whole local skill library**, so another device/browser can recreate it. Copy the text into a local file yourself.
- **นำเข้า JSON** validates class, stat keys and limits, image data, skill effect schemas and identifiers before storing it locally. It will ask before replacing browser data.
- GitHub Pages is a static hosting service. **No account synchronization, server-side database or GitHub commit occurs when a player saves**. Do not clear browser storage without exporting a backup.

## Architecture

- `js/character-creator.js`: secure data model, 1-slot persistence, validation, defaults, class fallback art and JSON backup.
- `js/character-creator-ui.js`: interactive form, 30 dynamically generated stat inputs, image preview and skill selection.
- `js/character-registry.js`: allows the special original hero to use only its class's bundled artwork or a validated small raster data URL; all ordinary modular character directories remain isolated.
- `js/character-loader.js`: loads the standard character manifest, **then** registers the local custom hero, **then** runs the battle application and both creator UIs. App state is built once after the hero is registered.
- `index.html` / `css/character-creator.css`: responsive standalone workshop, matching the existing dark-mode style. No heavy three-dimensional renderer, animation loop, or live canvas was added.
- The existing four-member formation and enemy/boss compatibility are unchanged.

## Known limits

- Exactly **one** original character is editable through this version. Creating multiple user characters, choosing sprite animations, drawing custom skill animations and authoring conditional Passive trigger graphs are not included yet.
- A default class image/animation is *not* a fully unique anime portrait. Users can upload their own portrait image, but the class action choreography remains the approved preset.
- Uploading a custom illustration and saving does not upload or publish that image to the GitHub repository. Others visiting the same Pages URL see their own local records, not yours.
- Automated tests cover validation, persistent reload, real battle rules and headless formation selection. Actual browser/mobile visual review is still recommended.

Run the regression suite using `node --test tests/*.test.cjs`.
