/* TEMPLATE ONLY: duplicate this folder to characters/new-hero/, then replace
   every new-hero identifier across this character folder.
   A character automatically inherits all three approved class animations.
   skills/*.js may override ONLY the moves you want to customize. */
(function(){
 'use strict';
 AdvengerCharacters.register({
  id:'new-hero',
  classId:'saber', // choose any role from classes/catalog.js
  name:'New Hero',nameTh:'ตัวละครใหม่',role:'Saber',icon:'⚔️',
  maxHP:1000,maxEnergy:100,accent:'#89d2ff',
  art:'characters/new-hero/assets/standing.svg',
  fallback:'characters/new-hero/assets/standing.svg',
  // To use PNGs later, update only this folder:
  // art:'characters/new-hero/assets/standing.png',
  // portrait:'characters/new-hero/assets/portrait.png',
  // cutin:'characters/new-hero/assets/cutin.png',
  skills:{basic:'Basic Attack',skill:'Special Skill',ultimate:'Ultimate'},
  colors:[['water','น้ำ','#73cfff'],['fire','ไฟ','#ff986b']],
  defaultElement:'water'
  // No perform() required. Shared profession defaults are automatic.
  // To customize Skill, assign AdvengerCharacterSkills['new-hero'].skill
  // in skills/skill.js before loading this character.js.
 });
})();