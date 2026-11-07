/* AdvengerSAGA v0.9 — data-only enemy and encounter catalog.
   Add enemies or encounters here without editing the battle renderer. */
(function(g){
 'use strict';
 const sprites='assets/training-sentinel.svg';
 const types=Object.freeze({
  sentinel:Object.freeze({speed:95,name:'Training Sentinel',nameTh:'หุ่นทดสอบ',icon:'◆',element:'metal',maxHP:4200,attack:215,art:sprites,boss:false}),
  scout:Object.freeze({speed:125,name:'Void Scout',nameTh:'หน่วยลาดตระเวน',icon:'◇',element:'wind',maxHP:1300,attack:120,art:sprites,boss:false}),
  guardian:Object.freeze({speed:70,name:'Iron Guardian',nameTh:'ผู้พิทักษ์เหล็ก',icon:'⬡',element:'earth',maxHP:2100,attack:175,art:sprites,boss:false}),
  wisp:Object.freeze({speed:115,name:'Arcane Wisp',nameTh:'ภูตอาคม',icon:'✧',element:'arcane',maxHP:1100,attack:150,art:sprites,boss:false,
   statusOnHit:{key:'attackDown',power:.12,turns:2,chance:1}}),
  overlord:Object.freeze({speed:90,name:'Abyss Overlord',nameTh:'จอมราชันแห่งห้วงลึก',icon:'♛',element:'void',maxHP:6800,attack:295,art:sprites,boss:true})
 });
 const encounters=Object.freeze({
  training:Object.freeze({name:'Training Grounds',nameTh:'ฝึกต่อสู้ · ศัตรู 1 ตัว',enemies:['sentinel']}),
  skirmish:Object.freeze({name:'Three-Way Skirmish',nameTh:'ปะทะหมู่ · ศัตรู 3 ตัว',enemies:['scout','guardian','wisp']}),
  boss:Object.freeze({name:'Abyss Boss',nameTh:'บอส + ลูกสมุน 2 ตัว',enemies:['wisp','overlord','scout']}),
  horde:Object.freeze({name:'Four Foe Skill Lab',nameTh:'ห้องทดลองสกิล · ศัตรู 4 ตัว',enemies:['sentinel','scout','guardian','wisp']}),
  'story-01':Object.freeze({name:'เสียงเรียกจากรอยแยก',nameTh:'เสียงเรียกจากรอยแยก',enemies:Object.freeze([{"kind":"sentinel","maxHP":1300,"attack":95,"speed":65}].map(e=>Object.freeze(e)))}),
  'story-02':Object.freeze({name:'ผู้ลาดตระเวนแห่งวอยด์',nameTh:'ผู้ลาดตระเวนแห่งวอยด์',enemies:Object.freeze([{"kind":"scout","maxHP":1200,"attack":115,"speed":130},{"kind":"sentinel","maxHP":1100,"attack":90,"speed":75}].map(e=>Object.freeze(e)))}),
  'story-03':Object.freeze({name:'คำสาปบนทางแยก',nameTh:'คำสาปบนทางแยก',enemies:Object.freeze([{"kind":"wisp","maxHP":1400,"attack":130,"speed":115},{"kind":"guardian","maxHP":2000,"attack":125,"speed":72}].map(e=>Object.freeze(e)))}),
  'story-04':Object.freeze({name:'ป้อมปราการที่ไร้ชื่อ',nameTh:'ป้อมปราการที่ไร้ชื่อ',enemies:Object.freeze([{"kind":"guardian","maxHP":2200,"attack":150,"speed":73},{"kind":"scout","maxHP":1300,"attack":145,"speed":127},{"kind":"wisp","maxHP":1400,"attack":160,"speed":114}].map(e=>Object.freeze(e)))}),
  'story-05':Object.freeze({name:'สี่เงาแห่งคำสาบาน',nameTh:'สี่เงาแห่งคำสาบาน',enemies:Object.freeze([{"kind":"sentinel","maxHP":1950,"attack":130,"speed":86},{"kind":"scout","maxHP":1650,"attack":155,"speed":135},{"kind":"guardian","maxHP":2300,"attack":145,"speed":70},{"kind":"wisp","maxHP":1500,"attack":165,"speed":116}].map(e=>Object.freeze(e)))}),
  'story-06':Object.freeze({name:'ราชันแห่งขอบฟ้าแตกสลาย',nameTh:'ราชันแห่งขอบฟ้าแตกสลาย',enemies:Object.freeze([{"kind":"wisp","maxHP":1700,"attack":170,"speed":118},{"kind":"overlord","maxHP":5500,"attack":230,"speed":98,"boss":true},{"kind":"guardian","maxHP":2000,"attack":165,"speed":72}].map(e=>Object.freeze(e)))})
 });
 /* Encounter entries may be enemy-type IDs or registered character modules.
    This lets the same character fight as ally, enemy or boss in story content. */
 function instantiate(list){
  if(!Array.isArray(list)||!list.length||list.length>4)
   throw new Error('Encounter needs 1–4 enemies');
  return list.map((entry,index)=>{
   const opt=typeof entry==='string'?{kind:entry}:entry;
   if(!opt||typeof opt!=='object')throw new Error('Invalid enemy entry');
   const actor=opt.characterId&&g.AdvengerCharacters?.get(opt.characterId);
   const base=actor||types[opt.kind];
   if(!base)throw new Error('Unknown enemy or character: '+(opt.characterId||opt.kind));
   const maxHP=Math.max(1,Math.round(opt.maxHP??opt.stats?.MAX_HP??base.stats?.MAX_HP??base.maxHP??1000));
   const attack=Math.max(1,Math.round(opt.attack??opt.stats?.P_ATK??base.stats?.P_ATK??base.attack??150));
   const stats=g.AdvengerStatDB?.create({maxHP,attack,
    speed:opt.speed??opt.stats?.SPD??base.stats?.SPD??base.speed??100,
    stats:{...(base.stats||{}),...(opt.stats||{}),MAX_HP:maxHP,P_ATK:attack}})||null;
   const element=opt.element??base.element??base.defaultElement??null;
   if(element&&!g.AdvengerElements.has(element))throw Error('Unknown enemy element '+element);
   return {id:'foe-'+index,kind:opt.characterId||opt.kind,characterId:opt.characterId||null,
    element,name:base.name,nameTh:base.nameTh,icon:base.icon||'◆',
    hp:maxHP,maxHP,attack,stats,art:base.art||sprites,fallback:base.fallback||base.art||sprites,
    statusOnHit:opt.statusOnHit||base.statusOnHit||null,life:opt.life||base.life||null,boss:!!(opt.boss??base.boss)};
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
