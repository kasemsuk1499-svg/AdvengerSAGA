# AdvengerSAGA

A lightweight browser RPG prototype with **4 main party slots + 2 support slots**, built around four approved and independently optimized combat animation labs.

## Quick start

Open `index.html` using a local static HTTP server, or enable **GitHub Pages** and open:
https://kasemsuk1499-svg.github.io/AdvengerSAGA/

The repo is plain static HTML/CSS/JavaScript. No Node/build dependencies.

**Enable Pages once:** Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then select **Branch: main**, **Folder: /(root)** and click **Save**. The game is a static HTML/JavaScript site with `index.html` at repository root; no custom build workflow is needed. A failing custom workflow was removed after the first deployment attempt. GitHub will publish new commits from the selected branch automatically.

## Classes (approved optimized animation builds)

- **Saber** — basic quick slash; multihit combo; finishing Ultimate: `labs/saber.html`
- **Mage** — Arcane Bolt; Rune Cascade; Astral Collapse: `labs/mage.html`
- **Tank** — Shield Bash; Bulwark Reversal; Aegis Fall: `labs/tank.html`
- **Gunner** — Precision Shot; Rapid Crossfire; Zero Horizon: `labs/gunner.html`

The core optimized Canvas effects and animation timing are retained in each standalone lab. The only new code inside the labs is a small `postMessage` bridge for sharing enemy HP percentage / EX with the party shell.

## Playable battle interface (v0.2 — mobile and desktop)

The **⚔️ สนามทดสอบ** screen now has an action-first layout:

1. A compact battle-only arena at the top instead of embedding an entire 900px-high character lab.
2. **Basic / Skill / Ultimate** buttons directly below the arena, with action locking and an EX requirement for Ultimate.
3. In-page color selection for the approved element palette of the current hero.
4. Switch among the four class cards; the target HP is shared and each hero's EX persists independently.
5. Use two helper actions, view the combat log, and reset HP/EX/assist uses with **เริ่มไฟต์ใหม่**.
6. Keyboard J/K/L for Basic/Skill/Ultimate and R to reset while on the battle screen.
7. The approved optimized animations are unchanged; the four labs load in `?embed=1` mode to hide duplicate menus, and accept `COMMAND`, `ELEMENT`, and `SYNC` messages from the parent game.

**Scope:** This is still one attacking hero versus a shared training dummy, with all 4 party slots selectable, not yet a 4v4 simultaneous tactical battle with enemy AI.
## Team management (v0.1)

- Main slots: **4/4** (Saber, Mage, Tank, Gunner). Click a main slot and select another hero to swap positions without duplicate IDs.
- Helper slots: **2/2**. Current **placeholder prototypes** are Attack Booster (+25% damage for next hit) and Energy Charge (+30 EX), each once per training encounter; click a helper slot to swap them.
- Saves the team, current demo character, shared training-target HP percentage and per-character EX to `localStorage`.
- Switch which hero's approved lab is active; the other three stay in the main party. Supports do **not** consume a main party slot.
- The embedded lab can still be opened directly in a separate tab and used as a standalone demo.
- A bridge prevents switching helpers/hero mid-attack and maintains the dummy's relative HP when switching classes.

### Current scope and limitations

This is a **formation / battle-preview foundation**, not yet a simultaneous four-character arena: the main party has four equipped members, and one is displayed in the training arena at a time. Support identities are placeholders until character/support designs are approved. There is no full enemy AI, equipment, progression, multiplayer, cloud save, or completed-team encounter yet.

### File structure

```
index.html                Formation + action-first battle interface
js/app.js                 4+2 slots, saved state, switching, support logic
labs/saber.html           Approved Optimized Saber
labs/mage.html            Approved Optimized Mage
labs/tank.html            Approved Optimized Tank
labs/gunner.html          Approved Optimized Gunner
(no workflow required)     GitHub Pages via main branch /(root)
```

### Integration contract

Each lab sends `{app:'AdvengerSAGA',type:'READY'|'START'|'ACTION'|'REJECT'|'RESET',unit:...}` to the shell. The shell sends `COMMAND` with `basic|skill|ultimate`, `ELEMENT` with a valid class color, and `SYNC` with `enemyPercent`, `energy`, and `element`. Standalone labs retain their native buttons.

Future updates may add new class labs and more support definitions to the central registry without rewriting the approved animations. Maintain the existing lab implementations as immutable baselines unless the user explicitly requests edits.
