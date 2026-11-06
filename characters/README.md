# One folder per playable individual — shared class attacks, optional overrides

Characters and professions are distinct. A Saber and another Saber may look completely different and have individual skills, while reusing the **same optimized Saber attack choreography** wherever no custom override is defined.

```text
characters/<id>/
  character.js
  skills/
    basic.js             # optional per-character override
    skill.js             # optional per-character override
    ultimate.js          # optional per-character override
  assets/
    standing.svg         # temporary art
    standing.png         # optional transparent PNG
    portrait.png         # optional party status-card portrait
    cutin.png            # optional Ultimate cut-in
```

`character.js` declares `classId`, name, stats, skill titles, palette and paths to that character's art. New character modules inherit each class move by default. To replace only one move, assign a function to `AdvengerCharacterSkills[characterId].basic`, `.skill` or `.ultimate` in the corresponding character-owned skill script. **Only the move with an override changes.** No copy/pasting of class logic is needed.

To add a character, copy `characters/_template/`, replace all `new-hero` placeholders, fill out the individual's information and PNG paths, and add the folder to `characters/manifest.js`. List any skill files before `character.js`. The manifest is the only central character list to edit; increment that entry's `version` on later updates.

Shared class animation files are in `classes/<classId>/animations.js` and the general attack runtime remains in `js/shared-arena.js`. The approved demo units `characters/saber/`, `mage/`, `tank/`, and `gunner/` now inherit their respective class attacks directly. They keep their original saved IDs and are not names for future real characters.
