# AdvengerSAGA — Four-Hero Turn-Based Battle Arena (v0.5)

**A lightweight browser-based anime battle prototype with four main characters standing in one shared battlefield and two support slots.** This version replaces the earlier single-hero iframe preview. It keeps modular character definitions and the original approved optimized single-hero demonstrations.

## Open and publish

Game URL after GitHub Pages is enabled: https://kasemsuk1499-svg.github.io/AdvengerSAGA/

Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch → main → /(root) → Save**. The project is a static HTML/CSS/JS site with no build step.


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

## File structure

```text
index.html                          Main interface and script loading
css/team-arena.css                  Unified battlefield layout
css/fate-inspired.css               Original cinematic command-card / RPG battle styling
js/app.js                           Team management, save, enemy HP, action selection
js/character-registry.js            Register character modules
js/shared-arena.js                  Shared battle field and movement primitives
js/team-effects.js                  Optimized cached field effects (idle pause)
js/turn-rules.js                    Turn order, HP caps, guard and enemy attack rules
css/turn-battle.css                 One-line 4-character formation and turn HUD
assets/training-sentinel.svg        Practice enemy artwork
characters/
  saber/
    character.js                    Saber metadata, element colors, Basic/Skill/Ult code
    art.svg                         Current placeholder sprite
    lab.html                        Approved optimized standalone Saber demo
  mage/
    character.js                    Independent Mage logic
    art.svg
    lab.html
  tank/
    character.js                    Independent Tank logic
    art.svg
    lab.html
  gunner/
    character.js                    Independent Gunner logic
    art.svg
    lab.html
labs/
  saber.html, mage.html, ...        Backward-compatible redirects only
```

## Replacing a character sprite with a transparent PNG

1. Upload a PNG into that **character's own directory**, e.g. `characters/saber/sprite.png` (a cropped transparent portrait/standing character works best).
2. Open `characters/saber/character.js` and change only the `art` path to `characters/saber/sprite.png`.
3. Keep `fallback:'characters/saber/art.svg'` for a safe fallback. When adding a new character, give it its own directory with a `character.js` and sprite file.
4. Commit. GitHub Pages will publish the change with the same static site; no changes to shared battle logic are required to replace an existing character sprite.

A PNG around 512×768 pixels with transparency (and reasonable compression) is a good starting point for mobile. The stage uses `object-fit:contain` so the character remains visible without cropping.

## Adding a new character or skill set

Each character module registers with `AdvengerCharacters.register({...})`, including `id`, `art`, `fallback`, `name`, `skills`, `colors`, `defaultElement` and an asynchronous `perform(api,kind)` method.

The `perform` API provides `rush`, `strafe`, `charge`, `projectile`, `rune`, `meteor`, `shield`, `lock`, `beam`, `cinematic`, `hit` and `wait`. Calling `hit(n)` notifies the central battle engine and produces damage feedback. Each class can have completely different animations without modifying the engine.

New character modules require **one script registration line** in `index.html` to load their `character.js`. Existing characters' code/art can otherwise be modified independently. The team selector automatically lists registered modules; the team still has four main slots.

## Approved animation baselines

Previous standalone optimized labs are preserved unchanged in `characters/<id>/lab.html` and work independently. They are for visual reference and detailed animation testing. The **new shared field has its own lightweight multi-character effect implementation**; its effect visuals are not a frame-for-frame clone of the standalone labs. This avoids four concurrent Canvas renderers running in one mobile view.

## Limitations and next steps

There is now a basic deterministic single-enemy retaliation phase, per-hero HP and turn initiative. There is still no multi-enemy AI, inventory, progression, multiplayer or cloud save. The latest work specifically fixes four-character shared presentation and modular per-character updateability, so those other mechanics should be evaluated separately.
