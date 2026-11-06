# Individual character starter folder

Copy this folder to `characters/<character-id>/` and edit all occurrences of
`new-hero` in the scripts to your new unique ID (lowercase letters, numbers and hyphens).

- `character.js` — unique ID, display name, classId, maxHP, image paths, elemental palettes, skill names and character registration
- `skills/basic.js` — Basic choreography
- `skills/skill.js` — special skill choreography
- `skills/ultimate.js` — Ultimate choreography
- `assets/standing.svg` — *temporary* illustrated standing sprite; replace with transparent `standing.png` and update `art` in `character.js` when ready
- `assets/` — future `portrait.png`, `cutin.png`, effects, audio and other assets **for this one character only**

The scripts are loaded in this order via `characters/manifest.js`: Basic, Skill, Ultimate, **then** character.js.

Add just one entry to `characters/manifest.js` after creating the folder:
```js
{
 id:'new-hero',version:1,
 scripts:[
  'characters/new-hero/skills/basic.js',
  'characters/new-hero/skills/skill.js',
  'characters/new-hero/skills/ultimate.js',
  'characters/new-hero/character.js'
 ]
}
```

The templates in this `_template` folder are deliberately **not registered in the game**. The four existing demo characters remain playable and keep their approved animations.

Changing skill code: edit only `characters/<character-id>/skills/<move>.js` and increment that character's `version` in `characters/manifest.js`. You do not have to edit the central battle engine.

For future anime character images, upload or supply licensed / appropriately usable transparent PNG images; avoid committing huge uncompressed files.
