/* AdvengerSAGA v0.9 — data-only enemy and encounter catalog.
   Add enemies or encounters here without editing the battle renderer. */
(function(g){
 'use strict';
 const sprites='assets/training-sentinel.svg';
 const types=Object.freeze({
  sentinel:Object.freeze({name:'Training Sentinel',nameTh:'หุ่นทดสอบ',icon:'◆',maxHP:4200,attack:215,art:sprites,boss:false}),
  scout:Object.freeze({name:'Void Scout',nameTh:'หน่วยลาดตระเวน',icon:'◇',maxHP:1300,attack:120,art:sprites,boss:false}),
  guardian:Object.freeze({name:'Iron Guardian',nameTh:'ผู้พิทักษ์เหล็ก',icon:'⬡',maxHP:2100,attack:175,art:sprites,boss:false}),
  wisp:Object.freeze({name:'Arcane Wisp',nameTh:'ภูตอาคม',icon:'✧',maxHP:1100,attack:150,art:sprites,boss:false,
   statusOnHit:{key:'attackDown',power:.12,turns:2,chance:1}}),
  overlord:Object.freeze({name:'Abyss Overlord',nameTh:'จอมราชันแห่งห้วงลึก',icon:'♛',maxHP:6800,attack:295,art:sprites,boss:true})
 });
 const encounters=Object.freeze({
  training:Object.freeze({name:'Training Grounds',nameTh:'ฝึกต่อสู้ · ศัตรู 1 ตัว',enemies:['sentinel']}),
  skirmish:Object.freeze({name:'Three-Way Skirmish',nameTh:'ปะทะหมู่ · ศัตรู 3 ตัว',enemies:['scout','guardian','wisp']}),
  boss:Object.freeze({name:'Abyss Boss',nameTh:'บอส + ลูกสมุน 2 ตัว',enemies:['wisp','overlord','scout']})
 });
 /* Encounter entries may be enemy-type IDs or registered character modules.
    This lets the same character fight as ally, enemy or boss in story content. */
 function instantiate(list){
  if(!Array.isArray(list)||!list.length||list.length>3)
   throw new Error('Encounter needs 1–3 enemies');
  return list.map((entry,index)=>{
   const opt=typeof entry==='string'?{kind:entry}:entry;
   if(!opt||typeof opt!=='object')throw new Error('Invalid enemy entry');
   const actor=opt.characterId&&g.AdvengerCharacters?.get(opt.characterId);
   const base=actor||types[opt.kind];
   if(!base)throw new Error('Unknown enemy or character: '+(opt.characterId||opt.kind));
   const maxHP=Math.max(1,Math.round(opt.maxHP||base.maxHP||1000));
   const attack=Math.max(1,Math.round(opt.attack||base.attack||150));
   return {id:'foe-'+index,kind:opt.characterId||opt.kind,characterId:opt.characterId||null,
    name:base.name,nameTh:base.nameTh,icon:base.icon||'◆',
    hp:maxHP,maxHP,attack,art:base.art||sprites,fallback:base.fallback||base.art||sprites,
    statusOnHit:opt.statusOnHit||base.statusOnHit||null,boss:!!(opt.boss??base.boss)};
  });
 }
 function spawn(id){
  const encounter=encounters[id];
  if(!encounter)throw new Error('Unknown encounter: '+id);
  return instantiate(encounter.enemies);
 }
 g.AdvengerEncounters=Object.freeze({
  types,encounters,spawn,instantiate,
  get:id=>encounters[id]||null,
  all:()=>Object.entries(encounters).map(([id,data])=>({id,...data}))
 });
})(window);
