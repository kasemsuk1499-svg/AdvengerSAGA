/* Only this index needs one new entry when adding a playable character.
   Skill and artwork overrides live in individual folders; class motion defaults live under classes/<classId>/animations.js.
   Bump only that character's version after editing its files, to refresh Pages cache. */
window.AdvengerCharacterManifest=[
 {id:'saber',version:2,scripts:['characters/saber/character.js']},
 {id:'mage',version:2,scripts:['characters/mage/character.js']},
 {id:'tank',version:2,scripts:['characters/tank/character.js']},
 {id:'gunner',version:2,scripts:['characters/gunner/character.js']},
 {id:'tanjiro',version:1,scripts:[
  'characters/tanjiro/skills/basic.js',
  'characters/tanjiro/skills/skill.js',
  'characters/tanjiro/skills/ultimate.js',
  'characters/tanjiro/character.js'
 ]}
];