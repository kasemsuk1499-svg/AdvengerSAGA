/* AdvengerSAGA v0.9 — data-only enemy and encounter catalog.
   Add enemies or encounters here without editing the battle renderer. */
(function(g){
 'use strict';
 const sprites='assets/training-sentinel.svg';
 const types=Object.freeze({
  sentinel:Object.freeze({name:'Training Sentinel',nameTh:'หุ่นทดสอบ',icon:'◆',maxHP:4200,attack:215,art:sprites,boss:false}),
  scout:Object.freeze({name:'Void Scout',nameTh:'หน่วยลาดตระเวน',icon:'◇',maxHP:1300,attack:120,art:sprites,boss:false}),
  guardian:Object.freeze({name:'Iron Guardian',nameTh:'ผู้พิทักษ์เหล็ก',icon:'⬡',maxHP:2100,attack:175,art:sprites,boss:false}),
  wisp:Object.freeze({name:'Arcane Wisp',nameTh:'ภูตอาคม',icon:'✧',maxHP:1100,attack:150,art:sprites,boss:false}),
  overlord:Object.freeze({name:'Abyss Overlord',nameTh:'จอมราชันแห่งห้วงลึก',icon:'♛',maxHP:6800,attack:295,art:sprites,boss:true})
 });
 const encounters=Object.freeze({
  training:Object.freeze({name:'Training Grounds',nameTh:'ฝึกต่อสู้ · ศัตรู 1 ตัว',enemies:['sentinel']}),
  skirmish:Object.freeze({name:'Three-Way Skirmish',nameTh:'ปะทะหมู่ · ศัตรู 3 ตัว',enemies:['scout','guardian','wisp']}),
  boss:Object.freeze({name:'Abyss Boss',nameTh:'บอส + ลูกสมุน 2 ตัว',enemies:['wisp','overlord','scout']})
 });
 function spawn(id){
  const encounter=encounters[id];
  if(!encounter)throw new Error('Unknown encounter: '+id);
  return encounter.enemies.map((kind,index)=>{
   const type=types[kind];
   return {id:'foe-'+index,kind,name:type.name,nameTh:type.nameTh,icon:type.icon,
    hp:type.maxHP,maxHP:type.maxHP,attack:type.attack,art:type.art,boss:type.boss};
  });
 }
 g.AdvengerEncounters=Object.freeze({
  types,encounters,spawn,
  get:id=>encounters[id]||null,
  all:()=>Object.entries(encounters).map(([id,data])=>({id,...data}))
 });
})(window);
