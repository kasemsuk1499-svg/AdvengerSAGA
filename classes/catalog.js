/* Profession presets, separate from playable individual characters.
   A profession describes combat role only, never a person's name or skills. */
window.AdvengerClasses=Object.freeze({
 saber:Object.freeze({id:'saber',defaultSPD:110,label:'Saber',labelTh:'นักดาบ',combatType:'melee',defaultHP:1000}),
 mage:Object.freeze({id:'mage',defaultSPD:100,label:'Mage',labelTh:'นักเวท',combatType:'magic',defaultHP:800}),
 tank:Object.freeze({id:'tank',defaultSPD:75,label:'Tank',labelTh:'ผู้พิทักษ์',combatType:'defender',defaultHP:1500}),
 gunner:Object.freeze({id:'gunner',defaultSPD:120,label:'Gunner',labelTh:'มือปืน',combatType:'ranged',defaultHP:900})
});