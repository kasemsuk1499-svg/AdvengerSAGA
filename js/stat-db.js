/* AdvengerSAGA v1.1 — editable, character-neutral combat stat database.
 * 30 attributes: five groups, numerical base values plus metadata.
 * Ratios are stored as fractions (0.40 = +40%); damage formulas/caps are
 * NOT finalized. Do not treat this catalog as Seven Knights exact balance.
 */
(function(g){
 'use strict';
 const groups=Object.freeze({
  core:'ค่าสถานะพื้นฐาน',
  offense:'การโจมตี',
  defense:'การป้องกัน',
  effects:'ความแม่นยำและต้านสถานะ',
  utility:'การสนับสนุนและกลไกพิเศษ'
 });
 const rows=[
  ['MAX_HP','พลังชีวิตสูงสุด','Max HP','core','flat','HP สูงสุดของยูนิต'],
  ['P_ATK','พลังโจมตีกายภาพ','Physical Attack','core','flat','ฐานพลังโจมตีกายภาพ'],
  ['M_ATK','พลังโจมตีเวทมนตร์','Magic Attack','core','flat','ฐานพลังโจมตีเวทมนตร์'],
  ['DEF','พลังป้องกัน','Defense','core','flat','ฐานพลังป้องกัน'],
  ['SPD','ความเร็ว','Speed','core','flat','ค่าสำหรับลำดับเทิร์นในอนาคต'],
  ['CRIT_RATE','อัตราคริติคอล','Critical Rate','offense','rate','โอกาสคริติคอล'],
  ['CRIT_DMG','ความเสียหายคริติคอล','Critical Damage','offense','rate','โบนัสความเสียหายคริติคอล'],
  ['WEAK_RATE','อัตราโจมตีจุดอ่อน','Weakness Hit Rate','offense','rate','โอกาสโจมตีจุดอ่อน'],
  ['WEAK_DMG','ความเสียหายจุดอ่อน','Weakness Hit Damage','offense','rate','โบนัสความเสียหายจุดอ่อน'],
  ['DMG_BOOST','เพิ่มความเสียหาย','Damage Boost','offense','rate','โบนัสความเสียหายโดยตรง'],
  ['DMG_AMP','ขยายความเสียหาย','Damage Amplification','offense','rate','ตัวคูณความเสียหายเพิ่มเติม แยกจาก Damage Boost'],
  ['DEF_PEN','เจาะป้องกัน','Defense Penetration','offense','rate','อัตราการเจาะค่าป้องกัน'],
  ['CRUSH','เจาะการบล็อก','Block Crush','offense','rate','การลดประสิทธิภาพการบล็อก'],
  ['BLOCK_RATE','อัตราบล็อก','Block Rate','defense','rate','โอกาสป้องกันความเสียหายบางส่วน'],
  ['DMG_REDUCTION','ลดความเสียหาย','Damage Reduction','defense','rate','การลดความเสียหายที่รับ'],
  ['RESILIENCE','ต้านความเสียหายคริติคอล','Critical Resilience','defense','rate','ลดความเสียหายจากคริติคอล'],
  ['PHYS_RESIST','ต้านทานกายภาพ','Physical Resistance','defense','rate','การต้านความเสียหายกายภาพ'],
  ['MAG_RESIST','ต้านทานเวท','Magic Resistance','defense','rate','การต้านความเสียหายเวทมนตร์'],
  ['EVASION','หลบหลีก','Evasion','defense','rate','โอกาสหลบการโจมตี'],
  ['EFFECT_HIT','ความแม่นยำเอฟเฟกต์','Effect Hit','effects','rate','เพิ่มโอกาสให้ผลสถานะสำเร็จ'],
  ['EFFECT_RESIST','ต้านทานเอฟเฟกต์','Effect Resistance','effects','rate','ลดโอกาสได้รับผลสถานะ'],
  ['STATUS_BOOST','เพิ่มโอกาสสถานะ','Status Chance Boost','effects','rate','ปรับโอกาสพื้นฐานของสถานะจากสกิล'],
  ['CC_RESIST','ต้านทานควบคุม','Crowd-Control Resistance','effects','rate','ต้านสถานะควบคุม เช่น อัมพาตและมึนงง'],
  ['COUNTER_RATE','อัตราสวนกลับ','Counter Rate','utility','rate','โอกาสโจมตีตอบโต้'],
  ['FOLLOWUP_RATE','อัตราโจมตีติดตาม','Follow-up Rate','utility','rate','โอกาสร่วมโจมตีติดตาม'],
  ['HEAL_POWER','พลังฟื้นฟู','Healing Power','utility','rate','เพิ่มปริมาณการฮีลที่ทำได้'],
  ['HEAL_RECEIVED','การรับฮีล','Healing Received','utility','rate','เพิ่มหรือลดปริมาณการรักษาที่ได้รับ'],
  ['LIFESTEAL','ดูดเลือด','Lifesteal','utility','rate','ฟื้น HP จากความเสียหายที่สร้าง'],
  ['CD_REDUCTION','ลดคูลดาวน์','Cooldown Reduction','utility','rate','ปรับจำนวนรอบรอสกิล'],
  ['EX_GAIN','อัตราฟื้น EX','EX Gain','utility','rate','ปรับปริมาณ EX ที่ได้รับ']
 ];
 const names=new Set();
 const records=rows.map(([id,nameTh,name,group,unit,description])=>{
  if(names.has(id)||!groups[group])throw Error('Duplicate or unknown stat '+id);
  names.add(id);
  return Object.freeze({id,name,nameTh,group,unit,
   defaultValue:unit==='flat'?(id==='MAX_HP'?1000:id==='SPD'?100:0):0,
   description});
 });
 const metadata=Object.freeze(Object.fromEntries(records.map(x=>[x.id,x])));
 const keys=Object.freeze(records.map(x=>x.id));
 const asNumber=(v,otherwise)=>Number.isFinite(v)?v:otherwise;
 const clamp=(n,max=1e9)=>Math.max(0,Math.min(max,Math.round(n)));
 function create(entity={}){
  if(!entity||typeof entity!=='object')throw new Error('Stat entity must be an object');
  const overrides=entity.stats??{};
  if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))
   throw new Error('stats must be a dictionary of stat IDs');
  for(const [id,value] of Object.entries(overrides)){
   if(!Object.hasOwn(metadata,id))throw new Error('Unknown stat ID: '+id);
   if(!Number.isFinite(value)||value<0)throw new Error('Invalid value for '+id);
  }
  const classHP=g.AdvengerClasses?.[entity.classId]?.defaultHP;
  const maxHP=asNumber(overrides.MAX_HP,asNumber(entity.maxHP,asNumber(classHP,1000)));
  const defaults={
   MAX_HP:Math.max(1,Math.round(maxHP)),
   P_ATK:asNumber(entity.attack,Math.round(maxHP*.23)),
   M_ATK:asNumber(entity.magicAttack,asNumber(entity.attack,Math.round(maxHP*.23))),
   DEF:asNumber(entity.defense,Math.round(maxHP*.15)),
   SPD:asNumber(entity.speed,100)
  };
  const out={};
  for(const {id,unit,defaultValue} of records){
   const v=Object.prototype.hasOwnProperty.call(overrides,id)?overrides[id]:
    asNumber(defaults[id],defaultValue);
   if(!Number.isFinite(v)||v<0)throw new Error('Invalid stat value '+id);
   out[id]=unit==='flat'?clamp(v):(v);
  }
  out.MAX_HP=Math.max(1,out.MAX_HP);
  return Object.freeze(out);
 }
 function forCharacter(id){
  const character=g.AdvengerCharacters?.get(id);
  return character?character.stats||create(character):null;
 }
 function forEnemy(enemy){
  return enemy?(enemy.stats||create(enemy)):null;
 }
 const negative=new Set(['burn','poison','bleed','attackDown','defenseDown',
  'physicalVulnerability','damageReductionDown','stun','shock','silence','death','paralysis','freeze']);
 const runtimeDefinitions=Object.freeze({
  HP:'HP ปัจจุบันและสูงสุด (อ้างอิงจาก battle state)',
  EX:'พลังงานปัจจุบันและสูงสุด (อ้างอิงจาก battle state)',
  SHIELD:'โล่สะสมในไฟต์',
  BUFFS:'บัฟพร้อมระยะเวลาคงเหลือ',
  DEBUFFS:'ดีบัฟพร้อมระยะเวลาคงเหลือ',
  COOLDOWNS:'คูลดาวน์สกิล (จำนวนรอบคงเหลือ)',
  STACKS:'จำนวนชั้นสถานะ',
  ABILITY_USES:'จำนวนครั้งที่ใช้ความสามารถพิเศษ',
  LIFE_STATE:'สถานะ Alive / KO'
 });
 const unitKeys=(state,side)=>side==='ally'?(state.party||[]):
  (state.enemies||[]).map(e=>e.id);
 const runtimeEntry=()=>({shield:0,stacks:{},charges:{}});
 function resetRuntime(state){
  state.statRuntime={version:1,ally:{},enemy:{}};
  for(const side of ['ally','enemy'])
   for(const id of unitKeys(state,side))state.statRuntime[side][id]=runtimeEntry();
  return state.statRuntime;
 }
 const safeMap=(input,maxValue)=>{
  const out={};
  if(input&&typeof input==='object'&&!Array.isArray(input))
   for(const [key,val] of Object.entries(input)){
    if(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(key)&&Number.isFinite(val))
     out[key]=clamp(val,maxValue);
   }
  return out;
 };
 function restoreRuntime(state,saved){
  resetRuntime(state);
  if(!saved||typeof saved!=='object')return state.statRuntime;
  for(const side of ['ally','enemy']){
   for(const id of unitKeys(state,side)){
    const entry=saved[side]?.[id];
    if(!entry||typeof entry!=='object')continue;
    const dest=state.statRuntime[side][id];
    dest.shield=clamp(asNumber(entry.shield,0));
    dest.stacks=safeMap(entry.stacks,999);
    dest.charges=safeMap(entry.charges,999);
   }
  }
  return state.statRuntime;
 }
 function battleView(state,side,id){
  if(!['ally','enemy'].includes(side)||!unitKeys(state,side).includes(id))return null;
  const foe=side==='enemy'?(state.enemies||[]).find(e=>e.id===id):null;
  const stats=side==='ally'?forCharacter(id):forEnemy(foe);
  if(!stats)return null;
  const hpMax=side==='enemy'?foe.maxHP:stats.MAX_HP;
  const hp=Math.min(hpMax,Math.max(0,asNumber(side==='ally'?state.hp?.[id]:foe.hp,0)));
  const exMax=side==='ally'?Math.max(1,asNumber(g.AdvengerCharacters?.get(id)?.maxEnergy,100)):0;
  const ex=side==='ally'?Math.min(exMax,Math.max(0,asNumber(state.energy?.[id],0))):0;
  const statuses=state.skillStatuses?.[side+'/'+id]||[];
  const cooldowns={};
  if(side==='ally')for(const [kind,expiresAt] of Object.entries(state.skillTimers?.[id]||{}))
   if(Number.isFinite(expiresAt))cooldowns[kind]=Math.max(0,Math.round(expiresAt-(state.round||1)));
  const extra=state.statRuntime?.[side]?.[id]||runtimeEntry();
  return {id,side,stats,hp:{current:hp,max:hpMax},ex:{current:ex,max:exMax},
   shield:Math.max(0,extra.shield||0),
   buffs:statuses.filter(x=>!negative.has(x.key)).map(x=>({...x})),
   debuffs:statuses.filter(x=>negative.has(x.key)).map(x=>({...x})),
   cooldowns,stacks:{...extra.stacks},
   abilityUses:{...extra.charges,...(side==='ally'?{reviveUsed:!!state.skillUsed?.[id]}:{})},
   lifeState:hp>0?'ALIVE':'KO'};
 }
 g.AdvengerStatDB=Object.freeze({
  version:1,groups,definitions:metadata,keys,runtimeDefinitions,
  count:records.length,all:()=>records.slice(),
  get:id=>Object.hasOwn(metadata,id)?metadata[id]:null,create,forCharacter,forEnemy,
  resetRuntime,restoreRuntime,battleView
 });
})(window);
