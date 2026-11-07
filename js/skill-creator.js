/* AdvengerSAGA v1.5 — original character skill creator database.
 * Local-only, data-first skill authoring. No eval, dynamic scripting, assets,
 * official Seven Knights code or arbitrary file execution.
 */
(function(g){
 'use strict';
 const KEY='AdvengerSAGA_SKILL_CREATOR_V1',VERSION=1;
 const slots=Object.freeze(['basic','skill1','skill2','ultimate']);
 const types=Object.freeze(['damage','status','heal','cleanse',
  'revive','guts','autoRevive','immortality','execute','reduceBuffDuration']);
 const normalLimits=Object.freeze({effects:24,hits:12,power:100,cooldown:30,uses:9});
 const overlimitLimits=Object.freeze({effects:128,hits:1000000,power:1000000,
  cooldown:999,uses:999});
 const maxEffects=overlimitLimits.effects,maxSkills=150;
 const allowedTargets=new Set(g.AdvengerSkillDB.targetTypes);
 const num=(v,lo,hi,label)=>{
  if(v===''||v==null||!Number.isFinite(Number(v))||
    Number(v)<lo||Number(v)>hi)throw Error(label+' ต้องอยู่ระหว่าง '+lo+'–'+hi);
  return Number(v);
 };
 const percent=(v,label,limit=normalLimits.power)=>num(v,0,limit,label); // fraction 1 = 100%
 const integer=(v,lo,hi,label)=>{
  const n=num(v,lo,hi,label);
  if(!Number.isInteger(n))throw Error(label+' ต้องเป็นจำนวนเต็ม');
  return n;
 };
 const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const cleanTarget=(v,label='เป้าหมาย')=>{
  if(!allowedTargets.has(v))throw Error(label+' ไม่รองรับ: '+v);
  return v;
 };
 const name=v=>{
  const t=String(v||'').trim();
  if(!t||t.length>70)throw Error('ชื่อสกิลต้องยาว 1–70 ตัวอักษร');
  return t;
 };
 function effect(raw,limits=normalLimits){
  if(!plain(raw)||!types.includes(raw.type))throw Error('ไม่รู้จักประเภทเอฟเฟกต์');
  const x={type:raw.type};
  if(raw.target)x.target=cleanTarget(raw.target,'เป้าหมายของเอฟเฟกต์');
  switch(x.type){
   case 'damage':
    x.hits=integer(raw.hits??1,1,limits.hits,'ฮิตต่อเป้าหมาย');
    x.attackPct=percent(raw.attackPct??1,'พลังโจมตี',limits.power);
    x.defensePct=percent(raw.defensePct??0,'พลังป้องกัน',limits.power);
    x.hpPct=percent(raw.hpPct??0,'HP สูงสุด',limits.power);
    break;
   case 'heal':
    x.attackPct=percent(raw.attackPct??0,'พลังฮีลตาม ATK',limits.power);
    x.defensePct=percent(raw.defensePct??1,'พลังฮีลตาม DEF',limits.power);
    break;
   case 'status':
    if(!g.AdvengerStatusDB.has(raw.key))throw Error('ไม่รู้จักสถานะ '+String(raw.key));
    x.key=raw.key;
    // The designer must set a percentage; never silently invent a
    // Paralysis chance for the approved 4x4 example.
    x.chance=num(raw.chance,0,1,'โอกาสติดสถานะ');
    x.turns=integer(raw.turns??2,1,999,'ระยะเวลาสถานะ');
    if(raw.power!==undefined&&raw.power!==null&&raw.power!=='')
     x.power=percent(raw.power,'ความแรงสถานะ',limits.power);
    x.eachHit=!!raw.eachHit;
    break;
   case 'cleanse':x.count=integer(raw.count??1,1,99,'จำนวนที่ล้าง');break;
   case 'reduceBuffDuration':x.turns=integer(raw.turns??1,1,999,'จำนวนรอบที่ลด');break;
   case 'revive':
   case 'autoRevive':
    x.hpPct=percent(raw.hpPct??.4,'HP ที่ฟื้น');
    if(x.type==='autoRevive')x.uses=integer(raw.uses??1,1,limits.uses,'จำนวนครั้ง');
    break;
   case 'guts':x.uses=integer(raw.uses??1,1,limits.uses,'จำนวนครั้ง');break;
   case 'immortality':
    x.turns=integer(raw.turns??2,1,999,'เวลาอมตะ');
    x.uses=integer(raw.uses??1,1,9,'จำนวนครั้ง');
    break;
   case 'execute':
    x.hpThresholdPct=percent(raw.hpThresholdPct??.24,'HP ที่สำเร็จโทษ',limits.power);
    x.attackLimitPct=percent(raw.attackLimitPct??1.2,'ATK ที่จำกัด',limits.power);
    break;
  }
  return x;
 }
 function normalize(raw,keepId=false){
  if(!plain(raw))throw Error('ข้อมูลสกิลไม่ถูกต้อง');
  const overlimit=raw.overlimit===true;
  const limits=overlimit?overlimitLimits:normalLimits;
  const fx=raw.effects;
  if(!Array.isArray(fx)||!fx.length||fx.length>limits.effects)
   throw Error('ต้องมีเอฟเฟกต์ตั้งแต่ 1 ถึง '+limits.effects+' ขั้น'+
    (overlimit?' (Overlimit)':''));
  const result={
   name:name(raw.name),overlimit,
   target:cleanTarget(raw.target),
   damageType:raw.damageType==='magic'?'magic':'physical',
   cooldownRounds:integer(raw.cooldownRounds??0,0,limits.cooldown,'คูลดาวน์'),
   effects:fx.map(v=>effect(v,limits))
  };
  if(keepId){
   if(typeof raw.id!=='string'||!/^created-[1-9]\d{0,8}$/.test(raw.id))
    throw Error('รหัสสกิลที่นำเข้าไม่ถูกต้อง');
   result.id=raw.id;
  }
  return result;
 }
 const empty=()=>({version:VERSION,nextId:1,skills:[],assignments:{},animations:{}});
 let db=empty();
 const clone=x=>JSON.parse(JSON.stringify(x));
 function validHero(id){return !!g.AdvengerCharacters?.get(id)}
 const nativeKinds=['basic','skill','ultimate'];
 const kitKinds=['basic','skill1','skill2'];
 function resolve(id){
  if(typeof id!=='string')return null;
  const created=get(id);
  if(created)return {id,kind:'created',name:created.name,skill:created};
  let m=/^native:(saber|mage|tank|gunner):(basic|skill|ultimate)$/.exec(id);
  if(m){
   const hero=g.AdvengerCharacters?.get(m[1]),skillName=hero?.skills?.[m[2]];
   if(!skillName)return null;
   return {id,kind:'native',name:hero.name+' · '+skillName,
    sourceHero:m[1],sourceKind:m[2]};
  }
  m=/^kit:([a-z][a-z0-9-]*):(basic|skill1|skill2)$/.exec(id);
  if(m){
   const hero=g.AdvengerSkillDB.get(m[1]),skill=hero?.skills?.[m[2]];
   if(!skill)return null;
   return {id,kind:'database',name:hero.name+' · '+skill.name,
    skill:{...clone(skill),id,sourceKind:m[2],
     cooldownRounds:g.AdvengerSkillDB.rounds(skill.cooldownSeconds||0)},
    sourceHero:m[1],sourceKind:m[2]};
  }
  return null;
 }
 function catalog(){
  const native=['saber','mage','tank','gunner'].flatMap(hero=>
   nativeKinds.map(kind=>resolve('native:'+hero+':'+kind)).filter(Boolean));
  const kit=g.AdvengerSkillDB.all().flatMap(hero=>
   kitKinds.map(kind=>resolve('kit:'+hero.id+':'+kind)).filter(Boolean));
  const custom=db.skills.map(skill=>resolve(skill.id));
  return {native,kit,custom,all:[...native,...kit,...custom]};
 }
 function load(){
  try{
   const parsed=JSON.parse(g.localStorage?.getItem(KEY)||'null');
   if(plain(parsed)&&Array.isArray(parsed.skills))importData(parsed,false);
  }catch(e){db=empty();}
  return list();
 }
 function persist(){
  try{g.localStorage?.setItem(KEY,JSON.stringify(db))}catch(e){}
 }
 function list(){return clone(db.skills)}
 function get(id){const x=db.skills.find(s=>s.id===id);return x?clone(x):null}
 function add(raw){
  if(db.skills.length>=maxSkills)throw Error('คลังเต็ม '+maxSkills+' สกิล');
  const result=normalize(raw);
  result.id='created-'+db.nextId++;
  db.skills.push(result);persist();return clone(result);
 }
 function update(id,raw){
  const i=db.skills.findIndex(x=>x.id===id);
  if(i<0)throw Error('ไม่พบสกิลที่จะบันทึก');
  const x=normalize(raw);x.id=id;
  db.skills[i]=x;persist();return clone(x);
 }
 function remove(id){
  if(!db.skills.some(s=>s.id===id))return false;
  db.skills=db.skills.filter(s=>s.id!==id);
  for(const assigned of Object.values(db.assignments))
   for(const slot of slots)if(assigned[slot]===id)delete assigned[slot];
  persist();return true;
 }
 function assign(hero,slot,id){
  if(!validHero(hero)||!slots.includes(slot))throw Error('ช่องสกิล/ตัวละครไม่ถูกต้อง');
  if(id&&!resolve(id))throw Error('เลือกสกิลที่มีอยู่ในคลังก่อนจึงจะติดตั้งได้');
  const entries=db.assignments[hero]||={};
  if(id)entries[slot]=id;else delete entries[slot];
  persist();return id||null;
 }
 function equipped(hero,slot){
  const selection=resolve(db.assignments[hero]?.[slot]);
  return selection?.skill||null;
 }
 function equippedSource(hero,slot){return resolve(db.assignments[hero]?.[slot])}
 function assignments(){return clone(db.assignments)}
 function assignAnimation(hero,slot,animationId){
  if(!validHero(hero)||!slots.includes(slot))
   throw Error('ช่องแอนิเมชันหรือตัวละครไม่ถูกต้อง');
  if(animationId&&!g.AdvengerAnimations?.has(animationId))
   throw Error('แอนิเมชันนี้ไม่อยู่ในคลังท่าที่รองรับ');
  const assigned=db.animations[hero]||={};
  if(animationId)assigned[slot]=animationId;
  else delete assigned[slot];
  persist();return animationId||null;
 }
 function animationFor(hero,slot){
  const id=db.animations?.[hero]?.[slot];
  return g.AdvengerAnimations?.get(id)||null;
 }
 function animationAssignments(){return clone(db.animations||{})}
 function importData(raw,persistResult=true){
  if(!plain(raw)||!Array.isArray(raw.skills)||raw.skills.length>maxSkills)
   throw Error('รูปแบบ JSON ไม่ถูกต้องหรือจำนวนสกิลเกินกำหนด');
  const keys=new Set();
  const skills=raw.skills.map(entry=>{
   const s=normalize(entry,true);
   if(keys.has(s.id))throw Error('พบรหัสสกิลซ้ำ '+s.id);
   keys.add(s.id);return s;
  });
  const as={};
  if(plain(raw.assignments))
   for(const [hero,assignments] of Object.entries(raw.assignments)){
    if(!validHero(hero)||!plain(assignments))continue;
    as[hero]={};
    for(const slot of slots)
     if(typeof assignments[slot]==='string'&&
       (keys.has(assignments[slot])||resolve(assignments[slot])?.kind!=='created'))
      if(resolve(assignments[slot])||keys.has(assignments[slot]))
       as[hero][slot]=assignments[slot];
   }
  const max=skills.reduce((v,s)=>Math.max(v,Number(s.id.slice(8))),0);
  const animations={};
  if(plain(raw.animations))
   for(const [hero,entries] of Object.entries(raw.animations)){
    if(!validHero(hero)||!plain(entries))continue;
    for(const slot of slots){
     if(g.AdvengerAnimations?.has(entries[slot])){
      (animations[hero]||={})[slot]=entries[slot];
     }
    }
   }
  db={version:VERSION,nextId:Math.max(max+1,1),skills,assignments:as,animations};
  if(persistResult)persist();
  return list();
 }
 function exportData(){return clone(db)}
 function overlimitExample(){
  return {name:'☄️ OVERLIMIT · สายฟ้าล้างโลก',overlimit:true,
   target:'fourEnemies',damageType:'magic',cooldownRounds:0,
   effects:[
    {type:'damage',hits:99999,attackPct:1000,defensePct:0,hpPct:0},
    {type:'status',target:'fourEnemies',key:'paralysis',
     chance:1,turns:999,eachHit:true},
    {type:'status',target:'self',key:'attackUp',
     power:10,turns:999,chance:1}
   ]};
 }
 function example(){
  return {name:'ตัวอย่าง 4 เป้าหมาย × 4 ฮิต',target:'fourEnemies',
   damageType:'physical',cooldownRounds:3,
   effects:[
    {type:'damage',hits:4,attackPct:1,defensePct:0,hpPct:0},
    {type:'status',key:'paralysis',turns:2,chance:null,eachHit:true},
    {type:'status',target:'self',key:'attackUp',power:.4,chance:1,turns:4}
   ]};
 }
 g.AdvengerSkillCreator=Object.freeze({
  version:VERSION,storageKey:KEY,slots,types,maxEffects,normalLimits,overlimitLimits,
  load,list,get,add,update,remove,assign,equipped,equippedSource,catalog,resolve,assignments,
  assignAnimation,animationFor,animationAssignments,
  exportData,importData,validate:normalize,example,overlimitExample
 });
})(window);
