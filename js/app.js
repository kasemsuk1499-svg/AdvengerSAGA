/* AdvengerSAGA foundation — 4 main party + 2 support slots.
   The approved class labs remain self-contained; the bridge synchronizes demo
   target HP and per-character EX without replacing their original animations. */
(function(){
'use strict';
const KEY='AdvengerSAGA_FORMATION_V1';
const UNIT={
 saber:{name:'Saber',th:'นักดาบ',emoji:'⚔️',accent:'#82d7ff',back:'#254268',desc:'Quick Slash · Combo · Limit Break'},
 mage:{name:'Mage',th:'นักเวท',emoji:'🪄',accent:'#bba0ff',back:'#3e3267',desc:'Arcane Bolt · Rune Cascade · Astral Collapse'},
 tank:{name:'Tank',th:'ผู้พิทักษ์',emoji:'🛡️',accent:'#f4c98a',back:'#625139',desc:'Shield Bash · Reversal · Aegis Fall'},
 gunner:{name:'Gunner',th:'มือปืน',emoji:'🔫',accent:'#8bedcc',back:'#254b4c',desc:'Precision Shot · Crossfire · Zero Horizon'}
};
const SUPPORT={
 focus:{name:'Attack Booster',label:'เสริมพลัง',icon:'✦',desc:'เพิ่มความเสียหายท่าถัดไป 25%'},
 battery:{name:'Energy Charge',label:'เติมพลัง',icon:'⚡',desc:'เติม EX ให้ตัวลงสนาม 30 หน่วย'}
};
const UNITS=Object.keys(UNIT),SUPPORTS=Object.keys(SUPPORT);
const $=id=>document.getElementById(id);
const fresh=()=>({
 party:['saber','mage','tank','gunner'],assist:['focus','battery'],
 active:'saber',enemyPct:1,energy:{saber:100,mage:100,tank:100,gunner:100},
 used:[false,false],boost:false,logs:['AdvengerSAGA — พร้อมเริ่มทดสอบทีม 4+2'],
 screen:'formation'
});
function read(){
 try{
  const d=JSON.parse(localStorage.getItem(KEY));
  if(!d||!Array.isArray(d.party)||d.party.length!==4||new Set(d.party).size!==4||!d.party.every(x=>UNIT[x]))return fresh();
  if(!Array.isArray(d.assist)||d.assist.length!==2||new Set(d.assist).size!==2||!d.assist.every(x=>SUPPORT[x]))return fresh();
  const x=fresh();
  x.party=d.party.slice();x.assist=d.assist.slice();
  x.active=d.party.includes(d.active)?d.active:d.party[0];
  x.enemyPct=Number.isFinite(d.enemyPct)?Math.min(1,Math.max(0,d.enemyPct)):1;
  for(const id of UNITS)x.energy[id]=Number.isFinite(d.energy?.[id])?Math.min(100,Math.max(0,d.energy[id])):100;
  x.used=[!!d.used?.[0],!!d.used?.[1]];
  x.boost=!!d.boost;
  x.logs=Array.isArray(d.logs)?d.logs.filter(x=>typeof x==='string').slice(-16):[];
  return x;
 }catch(e){return fresh()}
}
let state=read(),picker=null,loadedUnit=null,frameReady=false,view='formation';
const frame=$('battleFrame');
function store(){
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){/* private browsing quota */}
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function notice(msg){
 const old=document.querySelector('.toast');old?.remove();
 const el=document.createElement('div');el.className='toast';el.textContent=msg;
 document.body.append(el);setTimeout(()=>el.remove(),2600);
}
function log(text){state.logs.push(text);if(state.logs.length>20)state.logs.shift()}
function unitCard(id,i){
 const u=UNIT[id],active=state.active===id,pct=state.energy[id];
 return '<button class="unit-card'+(active?' selected':'')+'" style="--accent:'+u.accent+';--accent-back:'+u.back+'" data-main-slot="'+i+'" aria-label="เลือกตัวละครในช่องหลัก '+(i+1)+'">'+
 '<span class="unit-slot">MAIN '+String(i+1).padStart(2,'0')+(active?' · IN FOCUS':'')+'</span>'+
 '<span class="class-head"><span class="unit-icon">'+u.emoji+'</span><span><span class="unit-name">'+u.name+'</span><span class="unit-meta">'+u.th+'</span></span></span>'+
 '<span class="unit-meta">'+esc(u.desc)+'</span>'+
 '<span class="mini-meters">EX <span class="meter"><i style="width:'+pct+'%"></i></span>'+Math.round(pct)+'</span></button>';
}
function supportCard(id,i){
 const v=SUPPORT[id];
 return '<button class="support-card" data-support-slot="'+i+'" aria-label="เปลี่ยนผู้ช่วยช่อง '+(i+1)+'">'+
 '<span class="unit-slot">SUPPORT 0'+(i+1)+'</span><div class="support-avatar">'+v.icon+'</div>'+
 '<b>'+esc(v.name)+'</b><small>'+esc(v.desc)+'</small></button>';
}
function renderPicker(){
 const root=$('picker');
 root.hidden=!picker;
 if(!picker)return;
 const main=picker.type==='main';
 $('pickerTitle').textContent=main?'เปลี่ยนตำแหน่งตัวหลัก '+(picker.index+1):'เลือกผู้ช่วย '+(picker.index+1);
 $('pickerOptions').innerHTML=(main?UNITS:SUPPORTS).map(id=>{
  const u=main?UNIT[id]:SUPPORT[id];
  return '<button class="picker-opt" data-pick="'+id+'"><span style="font-size:20px">'+(main?u.emoji:u.icon)+'</span>'+
    '<span><span class="pick-title">'+esc(u.name)+'</span><br><span class="small">'+esc(main?u.th:u.label)+'</span></span></button>';
 }).join('');
}
function renderFormation(){
 $('mainSlots').innerHTML=state.party.map(unitCard).join('');
 $('supportSlots').innerHTML=state.assist.map(supportCard).join('');
 renderPicker();
}
function renderBattle(){
 $('battleRoster').innerHTML=state.party.map((id,i)=>{
  const u=UNIT[id];
  return '<button class="battle-member'+(state.active===id?' active':'')+'" data-deploy="'+id+'">'+
   '<b>'+u.emoji+' '+u.name+'</b><span>MAIN 0'+(i+1)+' · EX '+Math.round(state.energy[id])+'/100</span>'+
   '<span>'+(state.active===id?'● กำลังลงสนาม':'แตะเพื่อสลับตัว')+'</span></button>';
 }).join('');
 $('activeName').textContent=UNIT[state.active].name;
 $('activeEnergy').textContent=Math.round(state.energy[state.active])+'/100';
 $('enemyHealth').textContent=Math.round(state.enemyPct*100)+'%';
 $('assistActions').innerHTML=state.assist.map((id,i)=>{
  const v=SUPPORT[id],used=state.used[i];
  return '<button class="support-button'+(used?' used':'')+'" data-assist="'+i+'" '+(used?'disabled':'')+'>'+
   v.icon+' '+v.name+'<small>'+(used?'ใช้แล้วในการต่อสู้ครั้งนี้':v.desc)+'</small></button>';
 }).join('');
 $('combatStatus').textContent=state.enemyPct<=0?'🏆 เป้าหมายหมด HP — รีเซ็ตสนามเพื่อเริ่มใหม่':(state.boost?'✨ โบนัสโจมตี +25% พร้อมใช้ในการโจมตีครั้งถัดไป':'พร้อมโจมตี · เลือกสมาชิกแล้วกดปุ่มท่าภายในสนาม');
 $('battleLog').innerHTML=state.logs.slice().reverse().map(s=>'<div class="logline">'+esc(s)+'</div>').join('');
 $('fullDemo').href='labs/'+state.active+'.html';
}
function render(){renderFormation();renderBattle();store()}
function show(tab){
 view=tab;
 document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===tab));
 document.querySelectorAll('[data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===tab));
 if(tab==='battle')ensureFrame();
 render();
}
function choose(type,index,id){
 if(type==='main'){
  const other=state.party.indexOf(id),current=state.party[index];
  if(current!==id){
   state.party[index]=id;
   if(other>=0)state.party[other]=current;
  }
 }else{
  const other=state.assist.indexOf(id),current=state.assist[index];
  if(current!==id){
   state.assist[index]=id;
   if(other>=0)state.assist[other]=current;
  }
 }
 picker=null;render();
}
function ensureFrame(force){
 if(view!=='battle')return;
 const target=state.active;
 if(loadedUnit===target&&!force)return;
 loadedUnit=target;frameReady=false;
 frame.src='labs/'+target+'.html?v=1';
 $('fullDemo').href=frame.src;
}
function sendSync(){
 if(!frameReady||!frame.contentWindow)return;
 const packet={app:'AdvengerSAGA',type:'SYNC',unit:state.active,
   enemyPercent:state.enemyPct,energy:state.energy[state.active]};
 frame.contentWindow.postMessage(packet,location.origin==='null'?'*':location.origin);
}
function deploy(id){
 if(state.active===id)return;
 if(!state.party.includes(id))return;
 state.active=id;ensureFrame(true);
 log('🔁 สลับตัวลงสนาม → '+UNIT[id].name);
 render();
}
function useSupport(index){
 if(state.used[index])return;
 if(state.enemyPct<=0)return notice('รีเซ็ตสนามก่อนใช้งานอีกครั้ง');
 const id=state.assist[index],v=SUPPORT[id];
 if(id==='battery'){
  if(state.energy[state.active]>=100)return notice('EX เต็มอยู่แล้ว ลองใช้ Ultimate ก่อนนะจ๊ะ');
  state.energy[state.active]=Math.min(100,state.energy[state.active]+30);
  sendSync();
  log('⚡ ผู้ช่วยเติม EX ให้ '+UNIT[state.active].name+' +30');
 }else if(id==='focus'){
  if(state.boost)return notice('โบนัสโจมตีพร้อมใช้อยู่แล้ว');
  state.boost=true;
  log('✦ ผู้ช่วยเตรียมบัฟโจมตี +25% ให้ท่าถัดไป');
 }
 state.used[index]=true;render();
}
function resetEncounter(){
 state.enemyPct=1;
 state.used=[false,false];state.boost=false;
 state.energy={saber:100,mage:100,tank:100,gunner:100};
 log('↻ รีเซ็ตเป้าหมาย EX และสิทธิ์ผู้ช่วยทั้งหมด');
 ensureFrame(true);render();
}
window.addEventListener('message',e=>{
 if(e.source!==frame.contentWindow)return;
 if(location.origin!=='null'&&e.origin!==location.origin)return;
 const d=e.data;
 if(!d||d.app!=='AdvengerSAGA'||d.unit!==state.active)return;
 if(d.type==='READY'){
  frameReady=true;sendSync();return;
 }
 if(d.type==='RESET'){resetEncounter();return}
 if(d.type==='ACTION'){
  if(!Number.isFinite(d.max)||d.max<=0||!Number.isFinite(d.before)||!Number.isFinite(d.after))return;
  const plain=Math.max(0,(d.before-d.after)/d.max);
  const bonus=state.boost&&plain>0?1.25:1;
  const applied=Math.min(state.enemyPct,plain*bonus);
  state.enemyPct=Math.max(0,state.enemyPct-applied);
  state.energy[d.unit]=Math.min(100,Math.max(0,Number(d.energy)||0));
  if(state.boost&&plain>0)state.boost=false;
  log(UNIT[d.unit].emoji+' '+UNIT[d.unit].name+' · '+d.kind.toUpperCase()+' −'+Math.round(applied*1000)+' HP'+(bonus>1?' (BOOST)':''));
  // When a support's boost changes damage, resync the training dummy.
  sendSync();render();
 }
});
document.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn)return;
 if(btn.dataset.screen){show(btn.dataset.screen);return}
 if(btn.dataset.mainSlot!==undefined){picker={type:'main',index:Number(btn.dataset.mainSlot)};renderPicker();return}
 if(btn.dataset.supportSlot!==undefined){picker={type:'support',index:Number(btn.dataset.supportSlot)};renderPicker();return}
 if(btn.dataset.pick&&picker){choose(picker.type,picker.index,btn.dataset.pick);return}
 if(btn.dataset.deploy){deploy(btn.dataset.deploy);return}
 if(btn.dataset.assist!==undefined){useSupport(Number(btn.dataset.assist));return}
});
$('cancelPicker').addEventListener('click',()=>{picker=null;renderPicker()});
$('startBattle').addEventListener('click',()=>show('battle'));
$('battleReset').addEventListener('click',resetEncounter);
$('resetTeam').addEventListener('click',()=>{
 state=fresh();picker=null;loadedUnit=null;frameReady=false;
 log('↻ จัดทีมใหม่เป็น 4 อาชีพต้นแบบ');render();notice('คืนค่าการจัดทีมเรียบร้อย');
});
$('labLinks').innerHTML=UNITS.map(id=>'<a class="button ghost" target="_blank" rel="noopener" href="labs/'+id+'.html">'+UNIT[id].emoji+' '+UNIT[id].name+'</a>').join('');
render();
})();