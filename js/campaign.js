/* AdvengerSAGA v2.0 — Campaign progress, six canonical stages and resources.
 * DOM-free original story campaign. The 4+2 optimized combat runtime is shared.
 * No randomized gacha, stamina paywalls, server APIs or background loops.
 */
(function(g){
 'use strict';
 const KEY='AdvengerSAGA_CAMPAIGN_V1';
 const missions=[
  {id:'story-01',chapter:0,number:'00-01',title:'เสียงเรียกจากรอยแยก',
   subtitle:'พันธสัญญาแรก',
   story:'เสียงหนึ่งดังขึ้นจากรอยแยกระหว่างโลก “หากยังอยากเห็นรุ่งอรุณ จงพิสูจน์ว่าพันธสัญญาของเจ้ามีความหมาย” กลุ่มผู้เดินทางพบด่านทดสอบที่ไม่มีใครรู้ว่าใครเป็นผู้สร้าง',
   objective:'กำจัดผู้เฝ้ารอยแยก',after:'ตราประทับบนพื้นแตกออก เศษแสงสีฟ้ากลายเป็นแผนที่นำทางไปยังซากประตูโบราณ',
   enemies:[{kind:'sentinel',maxHP:1300,attack:95,speed:65}],
   xp:45,gold:80},
  {id:'story-02',chapter:0,number:'00-02',title:'ผู้ลาดตระเวนแห่งวอยด์',
   subtitle:'รอยเท้าในความมืด',
   story:'ร่องรอยบนแผนที่ถูกเฝ้าดูโดยเงาที่เคลื่อนไหวเร็วกว่ามนุษย์ ตัวละครต้องแบ่งหน้าที่ป้องกันและรับมือศัตรูที่แทรกคิวได้ก่อน',
   objective:'เอาชนะหน่วยลาดตระเวน',after:'เหล่าเงาถอยหนี ทิ้งคำเตือนสั้น ๆ ว่า “จงอย่าเปิดประตู”',
   enemies:[{kind:'scout',maxHP:1200,attack:115,speed:130},{kind:'sentinel',maxHP:1100,attack:90,speed:75}],
   xp:65,gold:110},
  {id:'story-03',chapter:0,number:'00-03',title:'คำสาปบนทางแยก',
   subtitle:'ประตูด่านที่สาม',
   story:'แสงเรืองรองของภูตอาคมทำให้ทุกการโจมตีมีความเสี่ยง พวกมันกัดกร่อนพลังโจมตีด้วยดีบัฟ ขณะที่ผู้พิทักษ์เหล็กกั้นทางออก',
   objective:'กำจัดภูตอาคมและผู้พิทักษ์',after:'คำสาปคลายตัว บนกำแพงมีข้อความสลักว่า “การตัดสินใจทุกครั้งย่อมมีราคา”',
   enemies:[{kind:'wisp',maxHP:1400,attack:130,speed:115},{kind:'guardian',maxHP:2000,attack:125,speed:72}],
   xp:90,gold:150},
  {id:'story-04',chapter:1,number:'01-01',title:'ป้อมปราการที่ไร้ชื่อ',
   subtitle:'การปะทะเปิดฉาก',
   story:'หลังผ่านรอยแยก กลุ่มนักผจญภัยพบป้อมปราการที่ไม่มีประวัติ บนหอคอยมีธงของโลกที่ไม่เคยมีอยู่จริง ศัตรูสามฝ่ายกำลังเฝ้าทางขึ้น',
   objective:'ทะลวงแนวป้องกัน',after:'เมื่อป้อมเงียบลง ทุกคนได้ยินเสียงการเต้นของหัวใจดังมาจากชั้นใต้ดิน',
   enemies:[{kind:'guardian',maxHP:2200,attack:150,speed:73},{kind:'scout',maxHP:1300,attack:145,speed:127},{kind:'wisp',maxHP:1400,attack:160,speed:114}],
   xp:115,gold:190},
  {id:'story-05',chapter:1,number:'01-02',title:'สี่เงาแห่งคำสาบาน',
   subtitle:'บททดสอบความร่วมมือ',
   story:'ห้องสี่ทิศเปิดออกพร้อมกัน ไม่มีทางผ่านหากโจมตีโดยไม่คิด วางลำดับ SPD และเลือกเป้าหมายให้ดี เพราะศัตรูทุกคนทำหน้าที่แตกต่างกัน',
   objective:'กำจัดศัตรูทั้งสี่',after:'เส้นทางรวมกันเป็นทางเดียว มุ่งสู่ห้องพิธีที่สั่นสะเทือนด้วยพลังมืด',
   enemies:[{kind:'sentinel',maxHP:1950,attack:130,speed:86},{kind:'scout',maxHP:1650,attack:155,speed:135},{kind:'guardian',maxHP:2300,attack:145,speed:70},{kind:'wisp',maxHP:1500,attack:165,speed:116}],
   xp:145,gold:240},
  {id:'story-06',chapter:1,number:'01-03',title:'ราชันแห่งขอบฟ้าแตกสลาย',
   subtitle:'BOSS · จุดสิ้นสุดบทที่หนึ่ง',
   story:'ผู้เฝ้าป้อมเผยร่างที่แท้จริง ราชันแห่งห้วงลึกบอกว่าพันธสัญญาไม่ใช่การได้รับพลัง แต่คือการเลือกว่าจะปกป้องใครในวันที่ทุกอย่างพังทลาย',
   objective:'ปราบ Abyss Overlord และสมุน',after:'เมื่อราชันล้มลง ประตูที่มืดมิดกลับสะท้อนท้องฟ้าใหม่ บันทึกการเดินทางบทแรกปิดลง—แต่ชื่อของผู้ทำพันธสัญญายังไม่ปรากฏ',
   enemies:[{kind:'wisp',maxHP:1700,attack:170,speed:118},{kind:'overlord',maxHP:5500,attack:230,speed:98,boss:true},{kind:'guardian',maxHP:2000,attack:165,speed:72}],
   xp:195,gold:350}
 ];
 const chapters=Object.freeze([
  Object.freeze({id:0,title:'บทนำ · พันธสัญญาจากรอยแยก',subtitle:'CHAPTER 00',description:'เสียงเรียกที่ไม่มีใครรู้จัก แผนที่ไร้เจ้าของ และการตัดสินใจครั้งแรก'}),
  Object.freeze({id:1,title:'บทที่ 1 · ป้อมปราการไร้ชื่อ',subtitle:'CHAPTER 01',description:'ฝ่าป้อมลึกลับ ค้นหาคำสาบาน และปราบผู้เฝ้าหัวใจแห่งรอยแยก'})
 ]);
 const stages=Object.freeze(missions.map((s,index)=>Object.freeze({
  ...s,index,enemies:Object.freeze(s.enemies.map(e=>Object.freeze({...e})))
 })));
 const lookup=Object.freeze(Object.fromEntries(stages.map(s=>[s.id,s])));
 const items=Object.freeze({
  potion:Object.freeze({id:'potion',name:'ยาฟื้นพลัง',emoji:'🧪',price:60,desc:'ฟื้น HP 40% ให้เพื่อนที่บาดเจ็บมากที่สุด · ใช้ 1 เทิร์น'}),
  feather:Object.freeze({id:'feather',name:'ขนนกคืนชีพ',emoji:'🪶',price:170,desc:'ชุบสมาชิกที่ KO 1 คนด้วย HP 40% · ใช้ 1 เทิร์น'})
 });
 const base=()=>({version:1,cleared:{},stars:{},gold:0,xp:0,inventory:{potion:1,feather:0},wins:0});
 const cleanInt=(v,hi)=>Number.isInteger(v)&&v>=0&&v<=hi?v:0;
 function safe(raw){
  const d=base();if(!raw||typeof raw!=='object')return d;
  for(const stage of stages){
   if(raw.cleared?.[stage.id]===true)d.cleared[stage.id]=true;
   const score=raw.stars?.[stage.id];
   if(d.cleared[stage.id]&&Number.isInteger(score)&&score>=1&&score<=3)d.stars[stage.id]=score;
  }
  d.gold=cleanInt(raw.gold,100000000);d.xp=cleanInt(raw.xp,100000000);
  d.wins=cleanInt(raw.wins,10000000);
  for(const id of Object.keys(items))d.inventory[id]=cleanInt(raw.inventory?.[id],999);
  return d;
 }
 function read(){
  try{return safe(JSON.parse(g.localStorage?.getItem(KEY)||'null'))}
  catch(e){return base()}
 }
 function persist(data){
  g.localStorage?.setItem(KEY,JSON.stringify(safe(data)));
  return safe(data);
 }
 function stage(id){return lookup[id]||null}
 function level(xp){
  let count=1,left=Math.max(0,Math.round(xp||0));
  while(count<30&&left>=60+35*(count-1)){
   left-=60+35*(count-1);count++;
  }
  return {level:count,progress:left,needed:count===30?0:60+35*(count-1)};
 }
 function stats(){
  const x=read();return {...x,
   level:level(x.xp),attackBonus:Math.min(.6,(level(x.xp).level-1)*.04),
   unlocked:stages.filter(s=>unlocked(s.id,x)).length,
   completed:stages.filter(s=>x.cleared[s.id]).length};
 }
 function unlocked(id,progress=read()){
  const s=stage(id);
  if(!s)return false;
  return s.index===0||progress.cleared[stages[s.index-1].id]===true;
 }
 function firstAvailable(progress=read()){
  return stages.find(s=>!progress.cleared[s.id]&&unlocked(s.id,progress))||stages.at(-1);
 }
 function complete(id,survivors=4,round=1){
  const s=stage(id),data=read();
  if(!s||!unlocked(id,data))throw Error('ยังไม่ปลดล็อกภารกิจ');
  const first=!data.cleared[id];
  const stars=survivors===4?3:survivors>=2?2:1;
  const previous=data.stars[id]||0;
  if(first){
   data.gold+=s.gold;data.xp+=s.xp;
   data.cleared[id]=true;
  }
  data.stars[id]=Math.max(previous,stars);
  data.wins++;
  const saved=persist(data);
  return {id,first,stars,improved:stars>previous,
   gold:first?s.gold:0,xp:first?s.xp:0,round,
   totalGold:saved.gold,level:level(saved.xp).level,
   next:stages[s.index+1]?.id||null,
   finished:stages.every(stage=>saved.cleared[stage.id])};
 }
 function buy(id){
  if(!items[id])throw Error('ไม่รู้จักไอเทม');
  const data=read(),item=items[id];
  if(data.gold<item.price)throw Error('เหรียญทองไม่พอ');
  if(data.inventory[id]>=999)throw Error('ช่องเก็บไอเทมเต็ม');
  data.gold-=item.price;data.inventory[id]++;
  return persist(data);
 }
 function consume(id){
  if(!items[id])return false;
  const data=read();
  if(data.inventory[id]<1)return false;
  data.inventory[id]--;persist(data);return true;
 }
 g.AdvengerCampaign=Object.freeze({
  version:1,storageKey:KEY,chapters,stages,items,stage,read,stats,level,
  unlocked,firstAvailable,complete,buy,consume,attackBonus:()=>stats().attackBonus
 });
})(window);
