/* Tanjiro Kamado — first named playable character.
   Saber profession, locked Fire element. Art files will be supplied separately.
   Basic inherits the APPROVED Saber animation; Skill and Ultimate override it. */
(function(){
 'use strict';
 AdvengerCharacters.register({
  id:'tanjiro',
  classId:'saber',
  name:'Tanjiro Kamado',
  nameTh:'คามาโดะ ทันจิโร่',
  role:'Saber',
  icon:'🔥',
  maxHP:1100,
  maxEnergy:100,
  accent:'#ff8a5b',
  // Upload these transparent PNGs to this exact folder when ready.
  // Until then, all three views fall back to the temporary standing.svg.
  art:'characters/tanjiro/assets/standing.png',
  portrait:'characters/tanjiro/assets/portrait.png',
  cutin:'characters/tanjiro/assets/cutin.png',
  fallback:'characters/tanjiro/assets/standing.svg',
  skills:{
   basic:'Quick Slash',
   skill:'Hinokami Flash',
   ultimate:'Hinokami Kagura'
  },
  colors:[['fire','ไฟ','#ff8a5b']],
  defaultElement:'fire'
  // No perform(): inherits Saber Basic; independent Skill/Ultimate loaded
  // by the manifest from this character's own skills/ files.
 });
})();