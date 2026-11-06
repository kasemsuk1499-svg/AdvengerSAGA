# One directory per real playable character

**Classes are not characters.** `classes/catalog.js` defines reusable Saber, Mage, Tank and Gunner jobs. Any number of individual playable characters may share a job, but each keeps independent art, stats and attack logic.

## Standard character package

```text
characters/<id>/
  character.js
  skills/
    basic.js
    skill.js
    ultimate.js
  assets/
    standing.svg           temporary art, included in the template
    standing.png           optional transparent PNG to upload
    portrait.png           optional card portrait PNG
    cutin.png              optional Ultimate cut-in PNG
```

To add a new real character, copy `characters/_template/` to `characters/<id>/`, replace every `new-hero` identifier across the JS files, fill out the identity and profession (`classId`) in `character.js`, and replace their skill code and art as desired.

Add **one manifest entry** to `characters/manifest.js` listing that folder's Basic, Skill, Ultimate and character.js in order. The loader and team selection register the unit automatically. When editing an existing character, update only its own folder and increase the manifest entry's `version`. No manual `<script>` lines in `index.html`.

The current playable Saber/Mage/Tank/Gunner demo folders are temporarily retained to preserve the approved prototype animations, saved party IDs and existing battlefield. They are not new canon characters; the first real person's identity is still to be decided.
