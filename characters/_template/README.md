# Individual character starter — class inheritance + optional custom skills

Copy this folder into `characters/<character-id>/` and replace every `new-hero` identifier in its JavaScript files with a unique ID (lowercase letters, numbers and hyphens).

```text
<character-id>/
  character.js           # identity, classId, HP, sprite / portrait / cut-in PNG paths
  skills/
    basic.js             # optional Basic override
    skill.js             # optional Skill override
    ultimate.js          # optional Ultimate override
  assets/
    standing.svg         # temporary, replaceable by transparent standing.png
```

**Default: all three attacks inherit the class's approved animation.** The skill files contain commented-out examples and don't replace the default until you uncomment and implement the relevant `kit.basic`, `kit.skill` or `kit.ultimate` assignment.

For example, a Mage character can inherit the Mage Basic and Skill, but customize only its Ultimate by assigning:

```js
const kit=(window.AdvengerCharacterSkills ||= {})['new-hero'] ||= {};
kit.ultimate=async function(a){
  await a.cinematic('MY ULTIMATE', 'CHARACTER EXCLUSIVE', 900);
  await a.charge(350);
  a.hit(250, 'magic', true);
};
```

Only the overridden move changes; the other two still use their class animation. For a complete custom set, implement all three skill files. To restore a class move, leave its override unassigned or omit that skill file from the manifest.

When ready, add **one entry** to `characters/manifest.js` with skill scripts first and `character.js` last:

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

Update an individual character's script or PNG and increment only that entry's version. There is no need to edit `js/app.js`, `js/shared-arena.js`, or class presets unless intentionally changing the shared class attack.

Class ID, role display text, element palette and HP are initially set for Saber in this template; update them together if selecting another class. The template itself is not a playable character until copied and registered in the manifest. The four approved demo characters remain available.
