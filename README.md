# AdvengerSAGA — Modular Anime Battle Engine + Skill & Stat Databases (v1.6)

**A lightweight browser-based anime battle prototype with four main characters standing in one shared battlefield, two support slots and selectable enemy encounters.** This version replaces the earlier single-hero iframe preview. It keeps modular character definitions and the original approved optimized single-hero demonstrations.

## Open and publish

Game URL after GitHub Pages is enabled: https://kasemsuk1499-svg.github.io/AdvengerSAGA/

Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch → main → /(root) → Save**. The project is a static HTML/CSS/JS site with no build step.


## v1.6 — One Original Character Creator / สร้างตัวละครเอง 1 ตัว

- New playable **👤 Character Creator** browser workshop: create and edit **one original character** with its own name/Thai display name, class, description, all **30 stats**, optional PNG/JPG/WebP portrait, and **four** skill slots linked to v1.5 Skill Creator.
- Supports the four approved class starting stat templates (Saber / Mage / Tank / Gunner) and lets users override every individual stat. The character inherits the chosen class's lightweight **original combat animations**; no new animation renderer or heavy 3D loop was added.
- **Save → reload → choose in จัดทีม:** the generated hero registers alongside original modular characters, then may replace **one of four** main-party slots. Shared SPD initiative, HP, damage, status, KO/revive and equipped skill rules apply in Battle. The custom hero is not a fifth simultaneous fighter.
- User art is stored **only on the current browser** (max 600 KB, PNG/JPG/WebP). Built-in class SVG remains the fallback. Character/skills are **not** uploaded to GitHub Pages or synchronized to other players automatically.
- One-click JSON backup includes the hero, portrait and current Skill Creator library; JSON import uses whitelisted classes, stat IDs, skill effects and raster image data.
- The editor supports one local character with the persistent ID \`custom-hero\`; new unique passive skill logic and custom character animation design are separate future tasks.
- Full guide: [Character Creator Lab](docs/CHARACTER_CREATOR_LAB.md). Regression tests verify 30 stats, custom classes, portrait safety, save/reload, skill equip, SPD attacks and formation selection.

## v1.5 — Skill Creator Lab / ห้องทดลองสร้างสกิลตัวละคร

- **Playable 🧪 Skill Creator** tab: visually build and reorder **1–24 sequential effects**, with separate target override, multi-target and multi-hit, status chance per landed hit, healing, cleanse, Guts, Revive, Immortality, Execute and self-buffs. The approved example of **4 enemies × 4 hits each = up to 16 hits**, then Paralysis per hit, then self ATK +40% for 4 turns, is available as an editable template. **Paralysis chance is intentionally blank** until the author specifies it.
- Create, rename, duplicate and delete **standalone reusable skills**. Equip them to any registered character in **Basic / Skill 1 / Skill 2 / Ultimate** slots. Custom buttons appear alongside original attacks and reference kits without replacing them.
- Cast these skills during the actual **SPD turn**, with a separate per-skill cooldown and EX 100 required for Ultimate. The existing 30-stat, status, death/revive and lightweight shared-VFX engines are reused.
- Added **🧪 SKILL LAB · 4 enemies** training encounter so the full 16-hit behavior can actually be tested in battle.
- Local browser persistence plus copyable **JSON export/import**; **not** cloud-synced or committed to GitHub automatically. The original class animations remain unchanged.
- Full workflow and developer guide: [Skill Creator Lab](docs/SKILL_CREATOR_LAB.md). Custom passive scripting and per-character animated-art editing are future work.

## v1.4 — Death, Guts, Immortality & Revival / ความตายและการคืนชีพ

- **9 reusable life-effect definitions** in `js/life-db.js`: Death, Death Immunity, Soul Death, Revive, Auto Revive, Guts, Immortality, Execution and Damage Immunity. All use original turn-based code, adapted from verified Seven Knights Re:BIRTH references.
- The central `js/life-engine.js` now handles lethal damage for **allies, enemies and bosses**, including attacks, multi-hits, 7K-inspired Death, damage over time and execution. It resolves once-per-battle passives, survivability grants, Soul Death restrictions, Immortality expiry, and no-repeat actions after resurrection.
- Added curated, source-attributed **Kris** (Death + passive Immortality) and **Rosie** (Death + revive two KO allies with 40% HP) to the existing sample skill kit selector. The old Rachel once-only revive works through the same pipeline. Only selected base effects are implemented; several enhancements/passive subeffects are not.
- New **LIFE LAB** in Battle lets you grant Guts, Immortality and Auto Revive; simulate lethal damage; apply Soul Death; and revive a fallen member. **About → Death & Revival Library** explains all nine mechanics.
- Stored life flags and remaining Immortality turns are retained in browser save data. The shared SPD initiative, class attack effects and Canvas renderer are unchanged.
- Full build guide, sources and limitations: [Death & Revival skill system](docs/DEATH_REVIVAL_SYSTEM.md). Regressions include passive resurrection, boss KO, life-ring analogues, revive target selection, save restoration and UI smoke tests.

## v1.3 — Seven Knights–inspired Status Skill System / ระบบสถานะผิดปกติ

- **17 reusable ailments** catalogued in `js/status-db.js` and executed by `js/status-engine.js`: Burn, Dragon Flame, Bleed, Poison, Death, Stun, Paralysis, Shock, Freeze, Petrify, Sleep, Fear, Blind, Silence, Confusion, Heal Block and Soul Death.
- Effects resolve in array order; `eachHit:true` rolls an ailment independently for each **landed** hit in the preceding damage step. `target:'self'` on a final effect permits a self ATK buff after hitting the enemy (no retroactive boost). `fourEnemies` supports up to 4 targets in the skill engine; v1.5 added a dedicated four-foe testing encounter.
- CC blocks its target's pending **SPD initiative action**, decrementing one duration per missed action; Silence prevents active/ultimate skills, while basic and guard remain available.
- DoT, status reactions, cleanse, poison/CC immunity, deterministic chance using EFFECT_HIT / EFFECT_RESIST, 5-stack Bleed, and local status save restore are integrated into existing battles.
- The new **STATUS LAB** in the battle panel can apply a chosen ailment for testing without consuming a turn. All 17 statuses are visible in **ข้อมูล**.
- The core class FX and 30-stat database are preserved. Advanced Seven Knights–specific mechanics and full critical/block calculations are intentionally **not yet complete**.
- Full semantics and adaptation notes: [Status Effect System](docs/STATUS_EFFECTS.md). New status engine unit tests are run by GitHub Actions.

## v1.2 — Speed-based initiative / ลำดับคิว SPD

- SPD now selects the **next acting unit across both teams**, not just who acts first on the player side. **One action per living ally/enemy/boss per round**, in descending SPD. Normal attack, Skill, Ultimate, Guard and database skills all spend the active unit's action.
- Approved prototype class speeds: **Gunner 120, Saber 110, Mage 100, Tank 75**. Enemies have initial SPD too (Scout 125, Wisp 115, Sentinel 95, Overlord 90, Guardian 70). Individual character/enemy `stats.SPD` overrides work; the prototypes' HP/attack/defense and class animations are preserved.
- Equal SPD: allies first, then ally formation slot; enemies are ordered by encounter slot. The speed ranking is fixed at the **start of each round** (future speed buffs will be applied when a new round starts).
- Interactive **Turn Order** now shows every ally and enemy in actual SPD sequence and marks NEXT/DONE/KO; players cannot skip ahead to another ally. Enemy turns run automatically when their queued turn arrives.
- Round-based status effects tick and cooldown progression advance **once after the last remaining actor finishes**, not after every enemy.
- Mid-round browser saves store used initiative slots. Old version-2/3 saves are migrated while preserving team, remaining HP/EX, enemy health, statuses and spent turns where possible.
- [SPD Initiative rules and examples](docs/SPEED_INITIATIVE.md). Node regression tests include speed ordering, ties, early enemy actions, KO skips, single-action constraints and mid-round save migration.

## v1.1 — Universal Stat Database

- **30 permanent stats** defined in the central `js/stat-db.js` registry (5 Core, 8 Offensive, 6 Defensive, 4 Effect, 7 Utility). Every item has a stable ID, Thai/English label, group, unit and description.
- Character modules can declare `stats: {MAX_HP:1200,P_ATK:320,M_ATK:200,DEF:180,SPD:110,CRIT_RATE:0.25}`; missing stats inherit safe initial values. Old `maxHP`, `attack` and `defense` properties remain supported.
- All four classes, custom playable heroes, enemies, and bosses use the same stat schema. Existing turn state remains authoritative; a separate `statRuntime` reservoir holds shield/stack/counter data for future skills, with local save recovery.
- New **Stat Encyclopedia** on the About tab and a compact live stat snapshot in Battle.
- **Not yet activated:** formulas for crit, evasion, block, penetration, cooldown reduction and stat-based skill effects. Their storage/IDs are ready; balance and stacking rules are not yet decided.
- [Full stat catalog and character example](docs/STAT_DATABASE.md). Note: the earlier numbered list actually totaled 30, not 31.

## v1.0 — Central Seven Knights Re:BIRTH–referenced Skill System

- **Playable reference kits:** Rachel, Lucy, and Ellen, with a curated subset of sourced factual skill names, percentages, hit counts, target scope and cooldowns. This is not the whole Seven Knights database.
- **Two layers stay independent:** The original approved class/individual Basic, Skill and Ultimate animations are untouched; the new **DB Basic / Active 1 / Active 2** buttons apply data-driven skills with shared arena FX. Kits start unequipped, so existing combat balance is unchanged until the player opts in.
- **Turn integration:** Skill cast consumes one hero action, uses target selection, round-based cooldowns, status and passive triggers. Burning damage, buffs/debuffs, healing, cleanse, magic immunity, weakness bonuses and single-use revive are supported in the adapted rules.
- **Cooldown adaptation:** 30 seconds of source cooldown = 1 AdvengerSAGA round (ceiling). Numeric damage and effect probability are adapted to this game; they are not the original combat simulation.
- **Extendable:** Load more reviewed source records with `node scripts/import-skill-db.cjs verified.json` to generate `js/skill-imports.js`, without changing the battle engine.
- **Source credit, schemas and limitations:** [Central skill-system documentation](docs/SKILL_SYSTEM.md).
- **Regression tests:** `node --test tests/*.test.cjs` through GitHub Actions. Real-browser/mobile playtesting still required.
## v0.9 — ระบบต่อสู้กลาง / Shared Battle Core

The browser game now runs three **data-defined encounter presets** using the same character animations and optimized Canvas effect renderer:

| Encounter | Enemy formation | Notes |
| --- | --- | --- |
| Training Grounds | Training Sentinel ×1 | Original practice encounter remains available |
| Three-Way Skirmish | Void Scout, Iron Guardian, Arcane Wisp | Target any living enemy |
| Abyss Boss | Arcane Wisp, Abyss Overlord, Void Scout | One boss plus two minions; boss is not yet a separate illustrated asset |

- **Central data**: `js/encounter-catalog.js` contains enemy base stats, names, images, boss flags and encounter rosters. Add new enemies and fights there without modifying any character's attack scripts. `AdvengerEncounters.instantiate([{characterId:'tanjiro',boss:true,attack:180}])` also creates an enemy/boss from the **same registered character folder** used by the player's party; enemy-side skills and decision AI are not yet specialized.
- **Central combat rules**: `js/battle-core.js` owns target selection, enemy HP, damage capping, guard reduction, deterministic enemy targeting, defeat/victory and round transitions. The UI uses this shared engine; the pre-approved class/character Basic, Skill and Ultimate animations are **unchanged**.
- **Multiple enemies**: clickable target buttons and battlefield target sprites. Combo strikes continue against the initially chosen target for that action; after a KO, selection moves to the next living enemy. Each living enemy counterattacks once after all surviving heroes use their round action.
- **Player party**: four heroes, two one-use support commands, EX, Guard, local save and formation swaps remain intact.
- **Existing save migration & recovery**: browser saves from v0.8 (battleVersion 2) keep their party, selected elements, HP/EX, remaining enemy percentage and support usage. New battle saves use version 3, resume any incomplete enemy phase from its stored action cursor and do not persist provisional EX spending until a player move finishes; no cloud account is required.
- **Regression checks**: run `node --test tests/battle-core.test.cjs` without any npm installation. GitHub Actions also runs the same tests on each push to main.
- **Performance**: one optimized effects canvas shared by all units; no per-enemy Canvas or extra animation loop.
- **Limitations**: enemy visuals currently reuse a temporary training-sentinel SVG. Opponents use simple deterministic target selection, not advanced tactical AI. No loot, character leveling, story chapters, inventory, multiplayer or cloud save yet. Mobile animation responsiveness and final balancing still require real-device checks.

## v0.8 — Tanjiro Kamado playable Fire Saber

The first named playable character is now registered as `tanjiro`, **class Saber**, **element Fire**, with separate files under `characters/tanjiro/`. Existing demo characters remain available and previous saved team selections are preserved.

- **Basic: Quick Slash**, inherited unchanged from Saber (1 hit, 110 base damage).
- **Skill: Hinokami Flash**, custom 3-hit Fire combo (70 + 95 + 130 = 295 base damage).
- **Ultimate: Hinokami Kagura**, custom cinematic Fire combo (90 + 110 + 140 + 260 = 600 base damage; consumes 100 EX).
- **Stats:** 1100 HP, 100 EX maximum. The element palette is locked to Fire for this character.
- **Team picker:** choose Tanjiro from the main-team formation selection to replace one demo fighter. Changing the four-character formation starts a fresh battle to initialize the new member's HP/turn/EX properly.
- **PNG-ready assets:** `characters/tanjiro/assets/standing.png` for the battlefield, `portrait.png` for formation and battle cards, `cutin.png` for Ultimate. Files have NOT been uploaded; the game currently uses the generic `standing.svg` fallback in all three places. See [Tanjiro asset guide](characters/tanjiro/assets/README.md). Uploading PNGs at those paths requires no code changes.
- **Performance:** skills use the shared optimized FX field and do not create separate continuous animation loops.

Code checks and simulated combat tests passed for registration, team selection, all three attacks, HP/damage, EX cost, battle turns and local save. Visual review and mobile performance on a real device still need user confirmation.

## v0.7 — Inherit approved class attacks, override moves individually

The shared, previously approved Saber/Mage/Tank/Gunner attack logic has been extracted into independent role-owned modules:

```text
classes/saber/animations.js
classes/mage/animations.js
classes/tank/animations.js
classes/gunner/animations.js
js/class-animation-registry.js
```

- Every character defines a `classId` and **automatically inherits** that class's Basic, Skill and Ultimate if not overridden.
- Any individual character can replace just Basic, just Skill, just Ultimate, any pair, or all three by implementing `AdvengerCharacterSkills[id][kind]` in its own `characters/<id>/skills/<kind>.js` file.
- **Priority:** character-specific move override → class default. The legacy `perform(api, kind)` hook remains supported for special standalone characters if needed.
- The existing four demo units now **actually use the shared class animations**, rather than duplicating their attack code in each character folder. Hit counts, damage values and timing are unchanged from the approved v0.6 behavior.
- New character template skill files contain *commented examples* and inherit all moves by default. Uncomment a specific assignment to override that single move.
- The separate common stage and cached VFX system are unchanged; no new render loop or extra Canvas is introduced by this change.

A new playable character still needs only its independent folder plus one entry in `characters/manifest.js`. The class animation scripts are loaded before the character loader. To modify a shared class animation for everyone using the default, edit only its `classes/<classId>/animations.js` file and bump that script's version in `index.html`.

## v0.6 — Per-character folders (distinct from class jobs)

Each new real person gets `characters/<unique-id>/` containing that character's own `character.js`, `skills/basic.js`, `skills/skill.js`, `skills/ultimate.js`, and `assets/`. Optional transparent `standing.png`, `portrait.png`, and `cutin.png` belong inside that one person's folder. Two different people can share the same Saber/Mage/Tank/Gunner profession without sharing their character files.

- `classes/catalog.js` is the independent profession catalog, not a list of playable people.
- `characters/_template/` is a **copyable example**, not a playable character.
- `characters/manifest.js` is the **single file** used to list which character folders the browser loads. Each person's script version can be incremented independently to refresh cached code.
- `js/character-loader.js` loads scripts in each character folder, then starts the existing game. No `index.html` edit is needed for a new character.
- Existing `characters/saber/`, `mage/`, `tank/` and `gunner/` folders remain separate **demo characters**, preserving their approved attacks, saved IDs and the current four-person team. These are not names for the first new real character.
- The turn-based battle, 4+2 team formation, animation timings, and the original standalone optimized labs are retained.

See [characters/README.md](characters/README.md) and [characters/_template/README.md](characters/_template/README.md) for copying and registering a new character.

## v0.4 — Original Fate/Grand Order-inspired battlefield layout

- Uses the **information hierarchy and camera staging** of a classic anime command RPG as a reference, not Fate's actual assets or proprietary command-card art.
- **Training enemy is now on the left** and **all four party characters remain visible on the right** in near/far staggered positions. Saber/Tank reverse-direction rush attacks correctly move toward the left-side target.
- Replaces the roster list with **four compact illustrated EX-status cards** directly beneath the battlefield. Press a card to select who acts next; the other three remain present.
- Command selection is a high-contrast **Basic / Skill / Ultimate** original card trio immediately below the party; color palette picker is expandable. On small screens, the command panel uses a sticky lower-edge treatment.
- Keeps the game's established **4 main + 2 support** formation and per-character module folder design. No 5-card Fate deck, Noble Phantasm terminology, or Fate IP artwork is incorporated.
- Responsive CSS file: `css/fate-inspired.css`. Original character files, transparent-PNG sprite future path, shared battle engine and saves are unchanged.

**Verification:** Script syntax checked; a simulated battle confirmed all four party portraits, Saber basic damage, Mage ultimate damage, character switching, element selection, reset and persistent save. The dash path was validated in both directions. Real mobile device visual/performance checks are still required.
## v0.5 — Single-row lineup and true turn-based combat

- **Formation:** all four main characters stand on the **same horizontal line** on the right side of the battlefield, facing the practice enemy on the left. The lineup is responsive on mobile; characters no longer occupy a 2×2 block.
- **Player phase:** each surviving party member gets **one action per round** (Basic, Skill, Ultimate or Guard). Choose an unused hero via the stage or their status card; after a move, the game automatically selects the next available hero. Used heroes are marked **DONE** and cannot act again until the next round.
- **Guard:** takes the hero's action, gains +15 EX and halves incoming damage to that character during the subsequent enemy phase. Guard expires after the enemy attacks.
- **Enemy phase:** after all surviving heroes act, Training Sentinel attacks **one surviving hero**, with an animation, damage number and HP loss. Enemy targets rotate reproducibly each round. The system then resets each surviving hero's action and advances to the next round.
- **HP per hero:** max HP is defined individually in each `characters/<id>/character.js` file (Saber 1000, Mage 800, Tank 1500, Gunner 900). Characters at zero HP display **KO**, remain visible, and cannot act.
- **Win/loss:** defeat the training enemy for **VICTORY** or lose all four heroes for **DEFEAT**. The reset button starts a complete new encounter. One enemy is present in this build.
- **HUD:** a five-token turn timeline (four allies + one enemy), round counter, hero HP/EX meters, guard command, action locking, and combat log.
- **Save migration:** existing local saves retain team order, support choice and element colors, but start a fresh turn-based encounter on first v0.5 load. New v0.5 saves retain round, HP, EX, actions, guards and support usage. Encounter state is stored locally in the browser.
- **Files:** `js/turn-rules.js` for deterministic turn logic; `css/turn-battle.css` for the single-row formation and status display. No character attack FX have been redesigned.

**Testing:** JS syntax checks, mocked battle tests for one complete round, enemy retaliation, guard, EX, damage, victory, defeat, reset and saved state passed. The shared field remains a static GitHub Pages site. On-device visual smoothness needs checking on the user's own phone.

## What works

- **Main team: four active slots**. Saber, Mage, Tank and Gunner are rendered together in the same arena. Tap a character in the field or its roster card to choose the next attacker; the other three remain visible.
- **Two support slots**. Attack Booster adds +25% damage to the next attack action; Energy Charge adds +30 EX to the selected character. One use per support per encounter.
- **Basic / Skill / Ultimate**. Each hero runs its own choreography and damage sequence from its own module (the number and damage of hits match the approved labs). Ultimate requires 100 EX; the selected actor consumes its EX.
- **Shared enemy HP** and independently tracked EX per hero; HP, EX, party order, selected colors and support usage are stored in browser localStorage.
- **Element palette** changes effect colors but not damage.
- **Responsive four-character battlefield** with on-demand cached Canvas effects, a maximum 30 effect frames per second, and fading ground marks.
- **Reset encounter**, action locking, formation editor, combat log and keyboard shortcuts J/K/L (attacks) and R (reset).

**Scope:** Training dummy with one attacking character at a time, not yet a full turn-based 4v4 battle or enemy AI. The four party characters remain visible at the same time. Support characters are abstract action slots for now and do not have field sprites.

## Folder structure and adding a character

```text
classes/catalog.js                  Profession roles, not individual people
classes/<classId>/animations.js      Approved shared Basic/Skill/Ultimate attacks
js/class-animation-registry.js       Reusable class attack animation registry
characters/manifest.js              Browser roster manifest: one entry per character
characters/_template/              Copyable independent character package
  character.js                      Character data and registration
  skills/basic.js                   Basic attack logic
  skills/skill.js                   Special skill logic
  skills/ultimate.js                Ultimate logic
  assets/standing.svg               Temporary sprite placeholder
characters/saber/                   Legacy playable Saber DEMO (not a class library)
characters/mage/                    Legacy playable Mage DEMO
characters/tank/                    Legacy playable Tank DEMO
characters/gunner/                  Legacy playable Gunner DEMO
js/character-loader.js              Loads character packages before app.js
js/character-registry.js            Validates and registers playable characters
js/shared-arena.js                  Shared arena movements, independent of characters
js/app.js                           Party UI, battle logic and saved state
```

Copy `characters/_template/` to `characters/<character-id>/`, replace every `new-hero` token with that person's unique ID, and set `classId`. The template automatically inherits all three class moves; edit only the skill scripts whose behavior needs to be unique. Add the character's scripts to `characters/manifest.js`, loading **Basic → Skill → Ultimate → character.js**. Future edits only require changing files in that folder and incrementing that manifest entry's version. Change `art` to the person's `standing.png`, optionally provide `portrait.png` and `cutin.png`, without editing battle-system files.

## Approved animation baselines

Previous standalone optimized labs are preserved unchanged in `characters/<id>/lab.html` and work independently. They are for visual reference and detailed animation testing. The **new shared field has its own lightweight multi-character effect implementation**; its effect visuals are not a frame-for-frame clone of the standalone labs. This avoids four concurrent Canvas renderers running in one mobile view.

## Limitations and next steps

There is now a basic deterministic single-enemy retaliation phase, per-hero HP and turn initiative. There is still no multi-enemy AI, inventory, progression, multiplayer or cloud save. The latest work specifically fixes four-character shared presentation and modular per-character updateability, so those other mechanics should be evaluated separately.
