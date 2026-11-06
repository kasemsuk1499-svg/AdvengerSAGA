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
const MOVES={
 saber:{basic:'Quick Slash',skill:'Elemental Triple',ultimate:'Astral Rend'},
 mage:{basic:'Arcane Bolt',skill:'Rune Cascade',ultimate:'Astral Collapse'},
 tank:{basic:'Shield Bash',skill:'Bulwark Reversal',ultimate:'Aegis Fall'},
 gunner:{basic:'Precision Shot',skill:'Rapid Crossfire',ultimate:'Zero Horizon'}
};
const ELEMENTS={
 saber:[['water','น้ำ','#68caff'],['fire','ไฟ','#ff9a6b'],['wind','ลม','#79e9be'],['lightning','สายฟ้า','#f9e58b'],['void','มืด','#c39bff']],
 mage:[['arcane','เวท','#bba6ff'],['fire','ไฟ','#ff9867'],['frost','น้ำแข็ง','#90dfff'],['storm','พายุ','#f4dc85'],['nature','ธรรมชาติ','#80e3b6']],
 tank:[['earth','ดิน','#d7b38c'],['metal','โลหะ','#c9d8f6'],['wind','ลม','#75dabf'],['lightning','สายฟ้า','#fbe78f'],['void','มืด','#bb98ff']],
 gunner:[['kinetic','พลังงาน','#77e4ff'],['fire','ไฟ','#ff9b69'],['lightning','สายฟ้า','#ffe58a'],['ice','น้ำแข็ง','#a6eaff'],['void','มืด','#cc9aff']]
};
const $=id=>document.getElementById(id);
const fresh=()=>({
 party:['saber','mage','tank','gunner'],assist:['focus','battery'],
 active:'saber',enemyPct:1,energy:{saber:100,mage:100,tank:100,gunner:100},
 used:[false,false],boost:false,elements:{saber:'water',mage:'arcane',tank:'earth',gunner:'kinetic'},logs:['AdvengerSAGA — พร้อมเริ่มทดสอบทีม 4+2'],
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
  for(const id of UNITS){
   if(ELEMENTS[id].some(([v])=>v===d.elements?.[id]))x.elements[id]=d.elements[id];
  }
  x.logs=Array.isArray(d.logs)?d.logs.filter(x=>typeof x==='string').slice(-16):[];
  return x;
 }catch(e){return fresh()}
}
let state=read(),picker=null,loadedUnit=null,frameReady=false,actionBusy=false,view='formation';
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
 const active=state.active,u=UNIT[active],inAction=actionBusy;
 const canAct=frameReady&&!inAction&&state.enemyPct>0;
 $('battleRoster').innerHTML=state.party.map((id,i)=>{
  const u=UNIT[id],selected=active===id;
  return '<button type="button" class="battle-member'+(selected?' active':'')+'" data-deploy="'+id+'" aria-pressed="'+selected+'" '+(inAction?'disabled':'')+'>'+
   '<b>'+u.emoji+' '+u.name+'</b><span>MAIN 0'+(i+1)+' · EX '+Math.round(state.energy[id])+'/100</span>'+
   '<span>'+(selected?'● กำลังลงสนาม':'แตะเพื่อสลับตัว')+'</span></button>';
 }).join('');
 $('activeName').textContent=u.emoji+' '+u.name;
 $('activeSubtitle').textContent=u.th;
 $('activeEnergy').textContent=Math.round(state.energy[active])+'/100';
 const hp=Math.round(state.enemyPct*100);
 $('enemyHealth').textContent=hp+'%';
 $('targetHpBar').style.width=state.enemyPct*100+'%';
 $('targetHpTrack').setAttribute('aria-valuenow',String(hp));
 $('assistActions').innerHTML=state.assist.map((id,i)=>{
  const v=SUPPORT[id],used=state.used[i];
  return '<button type="button" class="support-button'+(used?' used':'')+'" data-assist="'+i+'" '+(used||inAction||!frameReady||state.enemyPct<=0?'disabled':'')+'>'+
   v.icon+' '+v.name+'<small>'+(used?'ใช้แล้วในไฟต์นี้':v.desc)+'</small></button>';
 }).join('');
 const hint=!frameReady?'⌛ กำลังโหลดสนามต่อสู้...':
   inAction?'⚡ กำลังใช้ท่าโจมตี — รอแอนิเมชันจบ':
   state.enemyPct<=0?'🏆 เป้าหมายถูกโค่นแล้ว! กด «เริ่มไฟต์ใหม่» เพื่อเล่นต่อ':
   state.boost?'✦ โบนัสพลังโจมตี 25% พร้อมใช้ในท่าถัดไป':
   'พร้อมโจมตี! เลือก Basic / Skill / Ultimate หรือเปลี่ยนตัวละครได้เลย';
 $('combatStatus').textContent=hint;
 const indicator=$('commandIndicator');
 indicator.textContent=!frameReady?'LOADING':inAction?'IN ACTION':state.enemyPct<=0?'VICTORY':'READY';
 indicator.classList.toggle('busy',!canAct);
 for(const cmd of document.querySelectorAll('[data-command]')){
  const kind=cmd.dataset.command;
  cmd.disabled=!canAct||(kind==='ultimate'&&state.energy[active]<100);
  cmd.title=kind==='ultimate'&&state.energy[active]<100?'ต้องมี EX 100 ก่อนใช้ท่าไม้ตาย':'';
 }
 $('basicLabel').textContent=MOVES[active].basic;
 $('skillLabel').textContent=MOVES[active].skill;
 $('ultimateLabel').textContent=state.energy[active]<100?'EX '+Math.round(state.energy[active])+'/100':MOVES[active].ultimate;
 $('elementChoices').innerHTML=ELEMENTS[active].map(([key,label,color])=>{
  const selected=state.elements[active]===key;
  return '<button type="button" class="element-choice'+(selected?' active':'')+'" data-element-choice="'+key+'" aria-pressed="'+selected+'" style="--swatch:'+color+'" '+(inAction||!frameReady?'disabled':'')+'>'+
   '<i aria-hidden="true"></i>'+label+'</button>';
 }).join('');
 $('battleLog').innerHTML=state.logs.slice().reverse().map(line=>'<div class="logline">'+esc(line)+'</div>').join('');
 $('fullDemo').href='labs/'+active+'.html';
}
function render(){renderFormation();renderBattle();store()}
function show(tab){
 if(actionBusy&&tab!=='battle'){notice('รอให้แอนิเมชันจบก่อนออกจากสนาม');return}
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
 actionBusy=false;
 loadedUnit=target;frameReady=false;
 frame.src='labs/'+target+'.html?embed=1&v=2';
 $('fullDemo').href=frame.src;
}
function sendSync(){
 if(!frameReady||!frame.contentWindow)return;
 const packet={app:'AdvengerSAGA',type:'SYNC',unit:state.active,
   enemyPercent:state.enemyPct,energy:state.energy[state.active],element:state.elements[state.active]};
 frame.contentWindow.postMessage(packet,location.origin==='null'?'*':location.origin);
}
function sendCommand(kind){
 if(view!=='battle'||!['basic','skill','ultimate'].includes(kind))return;
 if(!frameReady)return notice('กำลังโหลดสนามต่อสู้');
 if(actionBusy)return;
 if(state.enemyPct<=0)return notice('เป้าหมายหมด HP แล้ว กดเริ่มไฟต์ใหม่');
 if(kind==='ultimate'&&state.energy[state.active]<100)return notice('EX ไม่ถึง 100 ยังใช้อัลติเมทไม่ได้');
 actionBusy=true;renderBattle();
 try{frame.contentWindow.postMessage({app:'AdvengerSAGA',type:'COMMAND',unit:state.active,kind},location.origin==='null'?'*':location.origin)}
 catch(e){actionBusy=false;renderBattle();notice('ส่งคำสั่งไปยังสนามไม่สำเร็จ')}
}
function setElement(element){
 if(actionBusy||!frameReady)return;
 if(!ELEMENTS[state.active].some(([v])=>v===element))return;
 state.elements[state.active]=element;
 frame.contentWindow?.postMessage({app:'AdvengerSAGA',type:'ELEMENT',unit:state.active,element},location.origin==='null'?'*':location.origin);
 renderBattle();store();
}
function deploy(id){
 if(actionBusy)return notice('กรุณาให้ท่าปัจจุบันจบก่อนสลับตัว');
 if(state.active===id)return;
 if(!state.party.includes(id))return;
 state.active=id;ensureFrame(true);
 log('🔁 สลับตัวลงสนาม → '+UNIT[id].name);
 render();
}
function useSupport(index){
 if(actionBusy)return notice('ใช้ผู้ช่วยหลังจบแอนิเมชันโจมตีนะจ๊ะ');
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
 if(actionBusy)return notice('รอจบแอนิเมชันก่อนรีเซ็ต');
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
  frameReady=true;actionBusy=false;sendSync();renderBattle();return;
 }
 if(d.type==='REJECT'){
  actionBusy=false;renderBattle();notice('ยังโจมตีไม่ได้ ลองอีกครั้งหรือรีเซ็ตสนาม');return;
 }
 if(d.type==='START'){
  actionBusy=true;renderBattle();return;
 }
 if(d.type==='RESET'){resetEncounter();return}
 if(d.type==='ACTION'){
  actionBusy=false;
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
 if(btn.dataset.command){sendCommand(btn.dataset.command);return}
 if(btn.dataset.elementChoice){setElement(btn.dataset.elementChoice);return}
 if(btn.dataset.assist!==undefined){useSupport(Number(btn.dataset.assist));return}
});
document.addEventListener('keydown',e=>{
 if(view!=='battle'||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.target.closest('input,textarea,select,[contenteditable]'))return;
 const key=e.key.toLowerCase();
 if(key==='j'||key==='k'||key==='l'){
  e.preventDefault();sendCommand({j:'basic',k:'skill',l:'ultimate'}[key]);
 }else if(key==='r'){e.preventDefault();resetEncounter()}
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