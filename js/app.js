/* AdvengerSAGA v0.3 — 4 visible main-party characters + 2 support slots.
   Each character owns its skills, element colors, artwork and attack code.
   The approved standalone labs remain in character-owned folders for reference. */
(function(){
'use strict';
const KEY='AdvengerSAGA_FORMATION_V1';
const UNIT=Object.fromEntries(AdvengerCharacters.all().map(u=>[u.id,{name:u.name,th:u.nameTh,emoji:u.icon,accent:u.accent,back:'#233657',desc:[u.skills.basic,u.skills.skill,u.skills.ultimate].join(' · ')}]));
const SUPPORT={
 focus:{name:'Attack Booster',label:'เสริมพลัง',icon:'✦',desc:'เพิ่มความเสียหายท่าถัดไป 25%'},
 battery:{name:'Energy Charge',label:'เติมพลัง',icon:'⚡',desc:'เติม EX ให้ตัวลงสนาม 30 หน่วย'}
};
const UNITS=Object.keys(UNIT),SUPPORTS=Object.keys(SUPPORT);
const MOVES=Object.fromEntries(UNITS.map(id=>[id,AdvengerCharacters.get(id).skills]));
const ELEMENTS=Object.fromEntries(UNITS.map(id=>[id,AdvengerCharacters.get(id).colors]));
const MAX_DUMMY_HP=4200;
const $=id=>document.getElementById(id);
const fresh=()=>({
 party:['saber','mage','tank','gunner'],assist:['focus','battery'],active:'saber',enemyPct:1,
 energy:Object.fromEntries(UNITS.map(id=>[id,100])),used:[false,false],boost:false,
 elements:Object.fromEntries(UNITS.map(id=>[id,AdvengerCharacters.get(id).defaultElement])),
 logs:['AdvengerSAGA · ทีม 4 คนยืนในสนามพร้อมกัน'],screen:'formation'
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
let state=read(),picker=null,frameReady=false,actionBusy=false,view='formation';
let arena=null,partyMounted='';
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
 const battlePanel=$('battle');
 if(battlePanel)battlePanel.style.setProperty('--active-char-color',u.accent);
 const canAct=frameReady&&!inAction&&state.enemyPct>0;
 $('battleRoster').innerHTML=state.party.map((id,i)=>{
  const u=UNIT[id],c=AdvengerCharacters.get(id),selected=active===id;
  const ex=Math.max(0,Math.min(100,Math.round(state.energy[id])));
  return '<button type="button" class="battle-member'+(selected?' active':'')+'" data-deploy="'+id+'" aria-pressed="'+selected+'" aria-label="เลือก '+esc(u.name)+' เป็นผู้โจมตี" style="--char-color:'+u.accent+'" '+(inAction?'disabled':'')+'>'+
   '<span class="roster-top"><img src="'+esc(c.art)+'" alt="" loading="lazy" decoding="async">'+
   '<span class="roster-copy"><strong>'+esc(u.name)+'</strong><small>MAIN 0'+(i+1)+' · '+esc(c.role)+'</small></span></span>'+
   '<span class="roster-ex"><span class="roster-ex-label">EX</span><span class="roster-meter"><i style="width:'+ex+'%"></i></span><small>'+ex+'%</small></span>'+
   '<span class="roster-select">'+(selected?'✦ SELECTED':'แตะเพื่อเลือก')+'</span></button>';
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
 $('fullDemo').href='characters/'+active+'/lab.html';
}
function render(){renderFormation();renderBattle();if(frameReady)arena?.energy(state.energy);store()}
function show(tab){
 if(actionBusy&&tab!=='battle'){notice('รอให้แอนิเมชันจบก่อนออกจากสนาม');return}
 view=tab;
 document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===tab));
 document.querySelectorAll('[data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===tab));
 if(tab==='battle')ensureArena();
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
function ensureArena(force=false){
 if(view!=='battle')return;
 try{
  if(!arena)arena=new AdvengerSharedArena($('teamArena'));
  const p=state.party.join(',');
  if(force||!frameReady||partyMounted!==p){arena.mount(state.party,state.active);partyMounted=p}
  else arena.focus(state.active);
  arena.energy(state.energy);frameReady=true;
 }catch(e){console.error(e);frameReady=false;notice('โหลดสนามไม่ได้: '+e.message)}
}
function sendCommand(kind){
 if(view!=='battle'||!['basic','skill','ultimate'].includes(kind))return;
 if(!frameReady)return notice('สนามยังไม่พร้อม');
 if(actionBusy)return;
 if(state.enemyPct<=0)return notice('ศัตรูหมด HP แล้ว กดเริ่มไฟต์ใหม่');
 const id=state.active,c=AdvengerCharacters.get(id);
 if(kind==='ultimate'&&state.energy[id]<100)return notice('EX ไม่ถึง 100');
 if(!c)return notice('ไม่พบโมดูลตัวละคร');
 actionBusy=true;const bonus=state.boost?1.25:1;
 let hits=0,damageDone=0;
 if(kind==='ultimate')state.energy[id]=0;
 renderBattle();arena.energy(state.energy);
 const takeDamage=raw=>{
  const old=Math.round(state.enemyPct*MAX_DUMMY_HP);
  const dealt=Math.min(old,Math.max(0,Math.round(raw*bonus)));
  state.enemyPct=(old-dealt)/MAX_DUMMY_HP;hits++;damageDone+=dealt;
  $('enemyHealth').textContent=Math.round(state.enemyPct*100)+'%';
  $('targetHpBar').style.width=state.enemyPct*100+'%';
  $('targetHpTrack').setAttribute('aria-valuenow',String(Math.round(state.enemyPct*100)));
  return dealt;
 };
 arena.play(id,kind,state.elements[id],takeDamage).then(success=>{
  if(success){
   if(kind!=='ultimate')state.energy[id]=Math.min(100,state.energy[id]+(kind==='skill'?30:20));
   if(state.boost&&hits)state.boost=false;
   log(c.icon+' '+c.name+' · '+kind.toUpperCase()+' · '+hits+' HIT · '+damageDone+' DMG'+(bonus>1?' [BOOST]':''));
  }else log('⚠️ ท่าโจมตีไม่สำเร็จ: '+c.name);
 }).catch(err=>{console.error(err);log('⚠️ เกิดข้อผิดพลาด: '+String(err.message||err))})
 .finally(()=>{actionBusy=false;arena.energy(state.energy);render()});
}
function setElement(element){
 if(actionBusy||!frameReady||!ELEMENTS[state.active].some(([key])=>key===element))return;
 state.elements[state.active]=element;renderBattle();store();
}
function deploy(id){
 if(actionBusy)return notice('รอแอนิเมชันจบก่อนสลับตัว');
 if(!state.party.includes(id)||id===state.active)return;
 state.active=id;arena?.focus(id);
 log('🔁 เลือก '+UNIT[id].name+' ออกโจมตี · ทีมยังยืนครบ 4 คน');render();
}
function useSupport(index){
 if(actionBusy)return notice('รอแอนิเมชันก่อนใช้ผู้ช่วย');
 if(state.used[index]||state.enemyPct<=0)return;
 const id=state.assist[index];
 if(id==='battery'){
  if(state.energy[state.active]>=100)return notice('EX เต็มแล้ว');
  state.energy[state.active]=Math.min(100,state.energy[state.active]+30);
  log('⚡ เติม EX ให้ '+UNIT[state.active].name+' +30');
 }else if(id==='focus'){
  if(state.boost)return notice('โบนัสโจมตีพร้อมใช้อยู่แล้ว');
  state.boost=true;log('✦ บัฟดาเมจท่าถัดไป 25%');
 }
 state.used[index]=true;arena?.energy(state.energy);render();
}
function resetEncounter(){
 if(actionBusy)return notice('รอจบแอนิเมชันก่อน');
 state.enemyPct=1;state.used=[false,false];state.boost=false;
 state.energy=Object.fromEntries(UNITS.map(id=>[id,100]));
 arena?.reset();arena?.energy(state.energy);log('↻ รีเซ็ตไฟต์ใหม่');render();
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn)return;
 if(btn.dataset.screen){show(btn.dataset.screen);return}
 if(btn.dataset.mainSlot!==undefined){picker={type:'main',index:Number(btn.dataset.mainSlot)};renderPicker();return}
 if(btn.dataset.supportSlot!==undefined){picker={type:'support',index:Number(btn.dataset.supportSlot)};renderPicker();return}
 if(btn.dataset.pick&&picker){choose(picker.type,picker.index,btn.dataset.pick);return}
 if(btn.dataset.deploy){deploy(btn.dataset.deploy);return}
 if(btn.dataset.fieldUnit){deploy(btn.dataset.fieldUnit);return}
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
 state=fresh();picker=null;partyMounted='';frameReady=false;
 if(view==='battle')ensureArena(true);
 log('↻ จัดทีมใหม่เป็น 4 อาชีพต้นแบบ');render();notice('คืนค่าการจัดทีมเรียบร้อย');
});
$('labLinks').innerHTML=UNITS.map(id=>'<a class="button ghost" target="_blank" rel="noopener" href="characters/'+id+'/lab.html">'+UNIT[id].emoji+' '+UNIT[id].name+'</a>').join('');
render();
})();