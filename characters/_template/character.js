/* TEMPLATE ONLY: duplicate this folder to characters/new-hero/ and replace
   "new-hero" everywhere in its JS. Do NOT put templates in manifest. */
(function(){
 'use strict';
 const id='new-hero';
 const kit=window.AdvengerCharacterSkills?.[id];
 if(!kit||['basic','skill','ultimate'].some(kind=>typeof kit[kind]!=='function'))
  throw new Error('Missing skills for '+id);
 AdvengerCharacters.register({
  id,
  classId:'saber', // change to 'mage', 'tank', 'gunner', or future profession
  name:'New Hero',nameTh:'ตัวละครใหม่',role:'Saber',icon:'⚔️',maxHP:1000,maxEnergy:100,
  accent:'#89d2ff',
  art:'characters/new-hero/assets/standing.svg',
  fallback:'characters/new-hero/assets/standing.svg',
  // Later use art:'characters/new-hero/assets/standing.png'
  // Optional portrait:'characters/new-hero/assets/portrait.png'
  skills:{basic:'Basic Attack',skill:'Special Skill',ultimate:'Ultimate'},
  colors:[['water','น้ำ','#73cfff'],['fire','ไฟ','#ff986b']],
  defaultElement:'water',
  async perform(api,kind){
   if(!['basic','skill','ultimate'].includes(kind))throw Error('Unknown move '+kind);
   return kit[kind](api);
  }
 });
})();