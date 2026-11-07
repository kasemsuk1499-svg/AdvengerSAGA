/* AdvengerSAGA v1.6 — one fully editable original hero in this browser.
 * Fixed custom ID: exactly one editable character, loaded before app boot.
 * No arbitrary code, script URLs, SVG uploads, remote image URLs or eval.
 */
(function(g){
 'use strict';
 const KEY='AdvengerSAGA_CHARACTER_CREATOR_V1';
 const ID='custom-hero',VERSION=1,MAX_IMAGE=850000;
 const classIds=['saber','mage','tank','gunner'];
 const presets=Object.freeze({
  saber:{MAX_HP:1000,P_ATK:260,M_ATK:90,DEF:160,SPD:110,CRIT_RATE:.10,COUNTER_RATE:.05},
  mage:{MAX_HP:800,P_ATK:70,M_ATK:320,DEF:100,SPD:100,EFFECT_HIT:.15,WEAK_RATE:.05},
  tank:{MAX_HP:1500,P_ATK:140,M_ATK:70,DEF:300,SPD:75,BLOCK_RATE:.20,DMG_REDUCTION:.05},
  gunner:{MAX_HP:900,P_ATK:290,M_ATK:70,DEF:110,SPD:120,CRIT_RATE:.15,DEF_PEN:.05}
 });
 const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const clone=x=>JSON.parse(JSON.stringify(x));
 const checkedName=(raw,label,max)=>{
  const v=String(raw??'').trim();
  if(!v||v.length>max||/[<>]/.test(v))throw Error(label+' ต้องมี 1–'+max+' ตัวอักษร และไม่มีเครื่องหมาย < >');
  return v;
 };
 const imageAllowed=value=>typeof value==='string'&&value.length<=MAX_IMAGE&&
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
 const classHero=id=>g.AdvengerCharacters?.get(id);
 function classArt(id){return classHero(id)?.art||'characters/'+id+'/art.svg'}
 function initial(classId='saber'){
  if(!classIds.includes(classId))throw Error('ไม่รู้จักอาชีพ');
  const all=g.AdvengerStatDB.all(),base=presets[classId];
  const values={};
  for(const item of all)values[item.id]=base[item.id]??0;
  return values;
 }
 function normalize(raw){
  if(!plain(raw))throw Error('ข้อมูลตัวละครไม่ถูกต้อง');
  const classId=raw.classId;
  if(!classIds.includes(classId)||!classHero(classId))throw Error('อาชีพไม่ถูกต้อง');
  if(!plain(raw.stats))throw Error('ต้องกำหนดค่าสเตตัสตัวละคร');
  const stats={};
  for(const item of g.AdvengerStatDB.all()){
   const n=raw.stats[item.id];
   if(!Number.isFinite(n)||n<0||n>1e7)throw Error('ค่าสถานะ '+item.id+' ไม่ถูกต้อง');
   if(item.unit==='flat'&&!Number.isInteger(n))throw Error(item.id+' ต้องเป็นจำนวนเต็ม');
   if(item.unit==='rate'&&n>100)throw Error(item.id+' ต้องไม่เกิน 100 เท่า');
   stats[item.id]=n;
  }
  if(stats.MAX_HP<1)throw Error('MAX_HP ต้องไม่น้อยกว่า 1');
  const base=classHero(classId);
  const portrait=raw.portrait==null||raw.portrait===''?null:raw.portrait;
  if(portrait&&!imageAllowed(portrait))throw Error('รูปภาพต้องเป็น PNG, JPG หรือ WebP ขนาดไม่เกิน 600 KB');
  const slots={};
  if(raw.slots!==undefined){
   if(!plain(raw.slots))throw Error('รูปแบบช่องสกิลไม่ถูกต้อง');
   for(const key of g.AdvengerSkillCreator.slots){
    const id=raw.slots[key];
    if(id==null||id==='')continue;
    if(!/^created-[1-9]\d{0,8}$/.test(id))
     throw Error('รหัสสกิลในช่อง '+key+' ไม่ถูกต้อง');
    // Missing skills may be imported later; they will not be installed
    // unless present in the local, validated Skill Creator library.
    slots[key]=id;
   }
  }
  return {
   version:VERSION,id:ID,
   name:checkedName(raw.name,'ชื่อตัวละคร',40),
   nameTh:checkedName(raw.nameTh||raw.name,'ชื่อที่แสดง',40),
   classId,description:String(raw.description??'').trim().slice(0,180),
   portrait,stats,slots,
   icon:base.icon,accent:base.accent
  };
 }
 function asCharacter(data){
  const base=classHero(data.classId);
  return {
   id:ID,classId:data.classId,name:data.name,nameTh:data.nameTh,
   role:g.AdvengerClasses[data.classId].label,icon:base.icon,accent:base.accent,
   art:data.portrait||classArt(data.classId),fallback:classArt(data.classId),
   maxHP:data.stats.MAX_HP,stats:clone(data.stats),
   skills:{
    basic:'Basic · '+data.name,
    skill:'Skill · '+data.name,
    ultimate:'Ultimate · '+data.name
   },
   colors:clone(base.colors),defaultElement:base.defaultElement,maxEnergy:100,
   description:data.description,createdInLab:true
  };
 }
 function save(raw){
  const normalized=normalize(raw);
  const serialized=JSON.stringify(normalized);
  try{g.localStorage?.setItem(KEY,serialized)}
  catch(e){throw Error('พื้นที่เก็บข้อมูลเบราว์เซอร์ไม่พอ กรุณาลดขนาดรูปภาพหรือสำรอง JSON')}
  // Once registered, the Skill Creator assignment DB is authoritative.
  const skillDB=g.AdvengerSkillCreator;
  if(g.AdvengerCharacters?.get(ID)&&skillDB){
   for(const slot of skillDB.slots){
    const skillId=normalized.slots[slot];
    skillDB.assign(ID,slot,skillId&&skillDB.get(skillId)?skillId:null);
   }
  }
  return clone(normalized);
 }
 function get(){
  try{
   const raw=g.localStorage?.getItem(KEY);
   return raw?normalize(JSON.parse(raw)):null;
  }catch(e){return null}
 }
 function boot(){
  const data=get();if(!data)return null;
  const record=g.AdvengerCharacters.get(ID)||
   g.AdvengerCharacters.register(asCharacter(data));
  const skills=g.AdvengerSkillCreator;
  if(skills){
   skills.load();
   // Apply the character's initial slot choices only once. Subsequent
   // edits in Skill Creator stay authoritative across browser reloads.
   if(!Object.hasOwn(skills.assignments(),ID)){
    for(const slot of skills.slots){
     const id=data.slots[slot];
     skills.assign(ID,slot,id&&skills.get(id)?id:null);
    }
   }
  }
  return record;
 }
 function remove(){
  g.localStorage?.removeItem(KEY);
  const skills=g.AdvengerSkillCreator;
  if(skills&&g.AdvengerCharacters?.get(ID)){
   for(const slot of skills.slots)skills.assign(ID,slot,null);
  }
  return true;
 }
 function exportData(){
  const character=get();
  const active=g.AdvengerSkillCreator?.assignments()?.[ID];
  if(character&&active)character.slots={...active};
  return {version:VERSION,character,
   skillLibrary:g.AdvengerSkillCreator?.exportData()||null};
 }
 function importData(raw){
  if(!plain(raw)||!plain(raw.character))throw Error('ไฟล์ JSON ไม่มีตัวละคร');
  const normalized=normalize(raw.character);
  if(raw.skillLibrary){
   // First validate all bundled skill records, then import.
   const lib=raw.skillLibrary;
   if(!plain(lib)||!Array.isArray(lib.skills)||lib.skills.length>150)
    throw Error('คลังสกิลในไฟล์ไม่ถูกต้อง');
   for(const item of lib.skills)g.AdvengerSkillCreator.validate(item,true);
   g.AdvengerSkillCreator.importData(lib);
  }
  return save(normalized);
 }
 g.AdvengerCharacterCreator=Object.freeze({
  id:ID,version:VERSION,storageKey:KEY,presets,classIds,
  initial,normalize,asCharacter,save,get,boot,remove,exportData,importData,
  imageAllowed,maxImageSize:MAX_IMAGE
 });
})(window);
