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
 const maxEffects=24,maxSkills=150;
 const allowedTargets=new Set(g.AdvengerSkillDB.targetTypes);
 const num=(v,lo,hi,label)=>{
  if(v===''||v==null||!Number.isFinite(Number(v))||
    Number(v)<lo||Number(v)>hi)throw Error(label+' ต้องอยู่ระหว่าง '+lo+'–'+hi);
  return Number(v);
 };
 const percent=(v,label)=>num(v,0,100,label); // fractions: 1 = 100%; UI divides percent inputs
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
 function effect(raw){
  if(!plain(raw)||!types.includes(raw.type))throw Error('ไม่รู้จักประเภทเอฟเฟกต์');
  const x={type:raw.type};
  if(raw.target)x.target=cleanTarget(raw.target,'เป้าหมายของเอฟเฟกต์');
  switch(x.type){
   case 'damage':
    x.hits=integer(raw.hits??1,1,12,'ฮิตต่อเป้าหมาย');
    x.attackPct=percent(raw.attackPct??1,'พลังโจมตี');
    x.defensePct=percent(raw.defensePct??0,'พลังป้องกัน');
    x.hpPct=percent(raw.hpPct??0,'HP สูงสุด');
    break;
   case 'heal':
    x.attackPct=percent(raw.attackPct??0,'พลังฮีลตาม ATK');
    x.defensePct=percent(raw.defensePct??1,'พลังฮีลตาม DEF');
    break;
   case 'status':
    if(!g.AdvengerStatusDB.has(raw.key))throw Error('ไม่รู้จักสถานะ '+String(raw.key));
    x.key=raw.key;
    // The designer must set a percentage; never silently invent a
    // Paralysis chance for the approved 4x4 example.
    x.chance=num(raw.chance,0,1,'โอกาสติดสถานะ');
    x.turns=integer(raw.turns??2,1,999,'ระยะเวลาสถานะ');
    if(raw.power!==undefined&&raw.power!==null&&raw.power!=='')
     x.power=percent(raw.power,'ความแรงสถานะ');
    x.eachHit=!!raw.eachHit;
    break;
   case 'cleanse':x.count=integer(raw.count??1,1,99,'จำนวนที่ล้าง');break;
   case 'reduceBuffDuration':x.turns=integer(raw.turns??1,1,999,'จำนวนรอบที่ลด');break;
   case 'revive':
   case 'autoRevive':
    x.hpPct=percent(raw.hpPct??.4,'HP ที่ฟื้น');
    if(x.type==='autoRevive')x.uses=integer(raw.uses??1,1,9,'จำนวนครั้ง');
    break;
   case 'guts':x.uses=integer(raw.uses??1,1,9,'จำนวนครั้ง');break;
   case 'immortality':
    x.turns=integer(raw.turns??2,1,999,'เวลาอมตะ');
    x.uses=integer(raw.uses??1,1,9,'จำนวนครั้ง');
    break;
   case 'execute':
    x.hpThresholdPct=percent(raw.hpThresholdPct??.24,'HP ที่สำเร็จโทษ');
    x.attackLimitPct=percent(raw.attackLimitPct??1.2,'ATK ที่จำกัด');
    break;
  }
  return x;
 }
 function normalize(raw,keepId=false){
  if(!plain(raw))throw Error('ข้อมูลสกิลไม่ถูกต้อง');
  const fx=raw.effects;
  if(!Array.isArray(fx)||!fx.length||fx.length>maxEffects)
   throw Error('ต้องมีเอฟเฟกต์ตั้งแต่ 1 ถึง '+maxEffects+' ขั้น');
  const result={
   name:name(raw.name),
   target:cleanTarget(raw.target),
   damageType:raw.damageType==='magic'?'magic':'physical',
   cooldownRounds:integer(raw.cooldownRounds??0,0,30,'คูลดาวน์'),
   effects:fx.map(effect)
  };
  if(keepId){
   if(typeof raw.id!=='string'||!/^created-[1-9]\d{0,8}$/.test(raw.id))
    throw Error('รหัสสกิลที่นำเข้าไม่ถูกต้อง');
   result.id=raw.id;
  }
  return result;
 }
 const empty=()=>({version:VERSION,nextId:1,skills:[],assignments:{}});
 let db=empty();
 const clone=x=>JSON.parse(JSON.stringify(x));
 function validHero(id){return !!g.AdvengerCharacters?.get(id)}
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
  if(id&&!get(id))throw Error('ต้องบันทึกสกิลลงคลังก่อนจึงจะติดตั้งได้');
  const entries=db.assignments[hero]||={};
  if(id)entries[slot]=id;else delete entries[slot];
  persist();return id||null;
 }
 function equipped(hero,slot){return get(db.assignments[hero]?.[slot])}
 function assignments(){return clone(db.assignments)}
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
     if(keys.has(assignments[slot]))as[hero][slot]=assignments[slot];
   }
  const max=skills.reduce((v,s)=>Math.max(v,Number(s.id.slice(8))),0);
  db={version:VERSION,nextId:Math.max(max+1,1),skills,assignments:as};
  if(persistResult)persist();
  return list();
 }
 function exportData(){return clone(db)}
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
  version:VERSION,storageKey:KEY,slots,types,maxEffects,
  load,list,get,add,update,remove,assign,equipped,assignments,
  exportData,importData,validate:normalize,example
 });
})(window);
