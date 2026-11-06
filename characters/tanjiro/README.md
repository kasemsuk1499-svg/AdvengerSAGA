# Tanjiro Kamado — Saber (Fire)

**ID**: `tanjiro`  
**Name**: คามาโดะ ทันจิโร่ / Tanjiro Kamado  
**Class**: `saber` (reuses the approved Saber class animation baseline)  
**Element**: `fire`  
**HP**: 1100  
**EX**: 100 maximum

### Moves

- **Basic — Quick Slash**: inherited from Saber, 1 hit / 110 base damage, unchanged.
- **Skill — Hinokami Flash**: Tanjiro-specific 3-hit flame combo, 70 + 95 + 130 = 295 base damage.
- **Ultimate — Hinokami Kagura**: Tanjiro-specific cinematic with 4 hits, 90 + 110 + 140 + 260 = 600 base damage. Costs 100 EX under the shared battle system.

### Folder ownership

```text
characters/tanjiro/
  character.js                metadata, class, stats, paths
  skills/
    basic.js                  intentionally inherits Saber
    skill.js                  exclusive fire combo
    ultimate.js               exclusive cinematic
  assets/
    standing.svg              temporary generic fallback
    standing.png              YOU upload
    portrait.png              YOU upload
    cutin.png                 YOU upload
    README.md                 PNG placement instructions
```

All three PNG paths are already present in `character.js`. Missing images fall back to `standing.svg`. The placeholder SVG is not the official Tanjiro portrait.

The character is registered in `characters/manifest.js` and becomes selectable from the main-team formation picker, where one of the four starting demo characters can be replaced by him. Do not force a roster migration or overwrite existing saves.

Update only Tanjiro's files for future skill, art or balance changes. The class animation and other characters remain unchanged.
