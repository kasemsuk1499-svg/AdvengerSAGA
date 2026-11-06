# AdvengerSAGA

A lightweight browser RPG prototype with **4 main party slots + 2 support slots**, built around four approved and independently optimized combat animation labs.

## Quick start

Open `index.html` using a local static HTTP server, or enable **GitHub Pages** and open:
https://kasemsuk1499-svg.github.io/AdvengerSAGA/

The repo is plain static HTML/CSS/JavaScript. No Node/build dependencies.

**Enable Pages once:** Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow `.github/workflows/pages.yml` will deploy automatically after subsequent pushes to `main`. You can also re-run the workflow manually in the GitHub Actions tab.

## Classes (approved optimized animation builds)

- **Saber** — basic quick slash; multihit combo; finishing Ultimate: `labs/saber.html`
- **Mage** — Arcane Bolt; Rune Cascade; Astral Collapse: `labs/mage.html`
- **Tank** — Shield Bash; Bulwark Reversal; Aegis Fall: `labs/tank.html`
- **Gunner** — Precision Shot; Rapid Crossfire; Zero Horizon: `labs/gunner.html`

The core optimized Canvas effects and animation timing are retained in each standalone lab. The only new code inside the labs is a small `postMessage` bridge for sharing enemy HP percentage / EX with the party shell.

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
index.html                Formation screen + embedded battle preview
js/app.js                 4+2 slots, saved state, switching, support logic
labs/saber.html           Approved Optimized Saber
labs/mage.html            Approved Optimized Mage
labs/tank.html            Approved Optimized Tank
labs/gunner.html          Approved Optimized Gunner
.github/workflows/pages.yml  GitHub Pages static deployment
```

### Integration contract

Each lab sends `{app:'AdvengerSAGA',type:'READY'|'START'|'ACTION'|'RESET',unit:...}` to the same-origin shell. Shell replies with `{app:'AdvengerSAGA',type:'SYNC',unit:...,enemyPercent:0..1,energy:0..100}`.

Future updates may add new class labs and more support definitions to the central registry without rewriting the approved animations. Maintain the existing lab implementations as immutable baselines unless the user explicitly requests edits.
