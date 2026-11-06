/* AdvengerSAGA v0.5 — 4 visible heroes, 1-row formation and sequential turn system.
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
const RULES=AdvengerTurnRules;
const $=id=>document.getElementById(id);
const fresh=()=>{
 const party=['saber','mage','tank','gunner'];
 return {
  ...RULES.initial(party),party,assist:['focus','battery'],active:party[0],enemyPct:1,
  energy:Object.fromEntries(UNITS.map(id=>[id,100])),
  used:[false,false],boost:false,
  elements:Object.fromEntries(UNITS.map(id=>[id,AdvengerCharacters.get(id).defaultElement])),
  logs:['AdvengerSAGA · Turn-Based · ROUND 1'],screen:'formation'
 };
};
function read(){
 try{
  const d=JSON.parse(localStorage.getItem(KEY));
  if(!d||!Array.isArray(d.party)||d.party.length!==4||
     new Set(d.party).size!==4||!d.party.every(id=>UNIT[id]))return fresh();
  if(!Array.isArray(d.assist)||d.assist.length!==2||
     new Set(d.assist).size!==2||!d.assist.every(id=>SUPPORT[id]))return fresh();
  const state=fresh();
  state.party=d.party.slice();state.assist=d.assist.slice();
  for(const id of UNITS){
   if(ELEMENTS[id].some(([v])=>v===d.elements?.[id]))state.elements[id]=d.elements[id];
  }
  if(d.battleVersion!==2){
   // Preserve formation and colors from the old free-attack prototype,
   // but start a clean turn-based encounter to avoid inconsistent old saves.
   state.active=state.party[0];
   state.logs=['🔄 อัปเกรดเป็น Turn-Based: เริ่มไฟต์ใหม่โดยคงทีมและธาตุเดิม'];
   return state;
  }
  state.round=Number.isInteger(d.round)?Math.min(999,Math.max(1,d.round)):1;
  state.enemyPct=Number.isFinite(d.enemyPct)?Math.max(0,Math.min(1,d.enemyPct)):1;
  state.phase=['player','enemy','victory','defeat'].includes(d.phase)?d.phase:'player';
  for(const id of UNITS){
   const max=RULES.hpMax(id);
   state.hp[id]=Number.isFinite(d.hp?.[id])?
      Math.min(max,Math.max(0,Math.round(d.hp[id]))):max;
   state.energy[id]=Number.isFinite(d.energy?.[id])?
      Math.min(100,Math.max(0,Math.round(d.energy[id]))):100;
   state.acted[id]=!!d.acted?.[id];
   state.guarded[id]=!!d.guarded?.[id];
  }
  state.used=[!!d.used?.[0],!!d.used?.[1]];state.boost=!!d.boost;
  state.logs=Array.isArray(d.logs)?d.logs.filter(v=>typeof v==='string').slice(-20):[];
  if(state.enemyPct<=0)state.phase='victory';
  else if(!RULES.alive(state.party,state.hp).length)state.phase='defeat';
  else if(state.phase==='enemy'){
   // An interrupted enemy animation resolves as a fresh player round.
   state.round=Math.min(999,state.round+1);state.phase='player';
   state.acted=RULES.counters(state.party);state.guarded=RULES.counters(state.party);
  }else if(state.phase==='player'&&!RULES.available(state.party,state.hp,state.acted).length){
   state.round=Math.min(999,state.round+1);
   state.acted=RULES.counters(state.party);state.guarded=RULES.counters(state.party);
  }
  const available=RULES.available(state.party,state.hp,state.acted);
  state.active=available.includes(d.active)?d.active:
   (available[0]||RULES.alive(state.party,state.hp)[0]||state.party[0]);
  return state;
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
 const id=state.active,u=UNIT[id],inAction=actionBusy,player=state.phase==='player';
 const canAct=frameReady&&!inAction&&player&&state.enemyPct>0&&
   state.hp[id]>0&&!state.acted[id];
 $('battle').style.setProperty('--active-char-color',u.accent);
 $('battleRoster').innerHTML=state.party.map((unitId,i)=>{
  const unit=UNIT[unitId],c=AdvengerCharacters.get(unitId),selected=id===unitId;
  const ex=Math.round(state.energy[unitId]);
  const hp=state.hp[unitId],max=RULES.hpMax(unitId),percent=Math.round(hp/max*100);
  const fallen=hp<=0,used=!!state.acted[unitId];
  const status=fallen?'✖ KO':used?'✓ DONE':selected?'✦ NEXT':'พร้อมออกท่า';
  const disabled=fallen||used||!player||inAction;
  return '<button type="button" class="battle-member'+(selected?' active':'')+
   (fallen?' fallen':'')+(used?' acted':'')+'" data-deploy="'+unitId+
   '" aria-pressed="'+selected+'" aria-label="'+esc(unit.name)+' HP '+hp+'/'+max+' '+status+
   '" style="--char-color:'+unit.accent+'" '+(disabled?'disabled':'')+'>'+
   '<span class="roster-top"><img src="'+esc(c.portrait||c.art)+'" alt="" loading="lazy" decoding="async">'+
   '<span class="roster-copy"><strong>'+esc(unit.name)+'</strong><small>MAIN 0'+(i+1)+'</small></span></span>'+
   '<span class="roster-hp"><b class="roster-hp-label">HP</b><span class="roster-meter"><i style="width:'+percent+'%"></i></span><small>'+hp+'/'+max+'</small></span>'+
   '<span class="roster-ex"><span class="roster-ex-label">EX</span><span class="roster-meter"><i style="width:'+ex+'%"></i></span><small>'+ex+'%</small></span>'+
   '<span class="roster-select">'+status+'</span></button>';
 }).join('');
 $('activeName').textContent=u.emoji+' '+u.name;
 $('activeSubtitle').textContent=u.th;
 $('activeEnergy').textContent=Math.round(state.energy[id])+'/100';
 const enemyHP=Math.round(state.enemyPct*100);
 $('enemyHealth').textContent=enemyHP+'%';
 $('targetHpBar').style.width=state.enemyPct*100+'%';
 $('targetHpTrack').setAttribute('aria-valuenow',String(enemyHP));
 $('roundLabel').textContent='ROUND '+state.round+' · TURN ORDER';
 const phaseEl=$('turnPhase');
 phaseEl.classList.toggle('enemy',state.phase==='enemy');
 phaseEl.classList.toggle('victory',state.phase==='victory'||state.phase==='defeat');
 phaseEl.textContent=state.phase==='enemy'?'🔴 เทิร์นศัตรู':state.phase==='victory'?'🏆 ชนะ':
  state.phase==='defeat'?'💀 แพ้':'🔵 เทิร์นฝ่ายเรา';
 $('turnOrder').innerHTML=state.party.map((unitId,i)=>{
  const fallen=state.hp[unitId]<=0,done=!!state.acted[unitId];
  const selected=id===unitId&&canAct;
  const status=fallen?'KO':done?'DONE':selected?'NEXT':'READY';
  return '<div class="turn-token'+(selected?' current':'')+(done?' done':'')+(fallen?' ko':'')+
   '"><strong>'+UNIT[unitId].emoji+' '+esc(UNIT[unitId].name)+'</strong><span>'+status+'</span></div>';
 }).join('')+'<div class="turn-token enemy'+(state.phase==='enemy'?' current':'')+'"><strong>◆ ENEMY</strong><span>COUNTER</span></div>';
 $('turnInfo').textContent=state.phase==='player'?'ฝ่ายเรา: '+
  RULES.available(state.party,state.hp,state.acted).length+' คนยังไม่ออกท่าในรอบนี้ · แต่ละคนใช้ได้ 1 คำสั่ง':
  state.phase==='enemy'?'ศัตรูกำลังเลือกเป้าหมายและโจมตีกลับ':
  state.phase==='victory'?'กำจัดเป้าหมายสำเร็จ · เริ่มไฟต์ใหม่เพื่อเล่นอีกครั้ง':
  'ทีมหลัก HP หมดทุกคน · เริ่มไฟต์ใหม่เพื่อเล่นอีกครั้ง';
 $('assistActions').innerHTML=state.assist.map((supportId,i)=>{
  const v=SUPPORT[supportId],used=state.used[i];
  return '<button type="button" class="support-button'+(used?' used':'')+
   '" data-assist="'+i+'" '+(used||!canAct?'disabled':'')+'>'+v.icon+' '+v.name+
   '<small>'+(used?'ใช้แล้วในไฟต์นี้':v.desc)+'</small></button>';
 }).join('');
 const hint=state.phase==='victory'?'🏆 VICTORY! ศัตรูถูกโค่นแล้ว':
  state.phase==='defeat'?'💀 DEFEAT! ทีมหลักไม่เหลือผู้รอดชีวิต':
  state.phase==='enemy'?'🔴 ENEMY PHASE · ศัตรูกำลังโจมตีกลับ':
  !frameReady?'⌛ กำลังโหลดสนาม...':
  inAction?'⚔️ กำลังดำเนินท่าโจมตี โปรดรอให้จบ':
  state.boost?'✦ BOOST +25% พร้อมใช้ · '+u.name+' ออกคำสั่ง':
  '🔵 '+u.name+' · เลือก Basic / Skill / Ultimate หรือป้องกัน';
 $('combatStatus').textContent=hint;
 const indicator=$('commandIndicator');
 indicator.textContent=state.phase==='player'?(!frameReady?'LOADING':inAction?'ACTION':'YOUR TURN'):
  state.phase==='enemy'?'ENEMY TURN':state.phase.toUpperCase();
 indicator.classList.toggle('busy',!canAct);
 indicator.classList.toggle('enemy',state.phase==='enemy');
 for(const command of document.querySelectorAll('[data-command]')){
  const kind=command.dataset.command;
  command.disabled=!canAct||(kind==='ultimate'&&state.energy[id]<100);
  command.title=kind==='ultimate'&&state.energy[id]<100?'EX 100 จึงใช้ท่าไม้ตายได้':'';
 }
 $('basicLabel').textContent=MOVES[id].basic;
 $('skillLabel').textContent=MOVES[id].skill;
 $('ultimateLabel').textContent=state.energy[id]<100?'EX '+state.energy[id]+'/100':MOVES[id].ultimate;
 $('elementChoices').innerHTML=ELEMENTS[id].map(([key,label,color])=>{
  const selected=state.elements[id]===key;
  return '<button type="button" class="element-choice'+(selected?' active':'')+'" data-element-choice="'+key+
   '" aria-pressed="'+selected+'" style="--swatch:'+color+'" '+(!canAct?'disabled':'')+
   '><i aria-hidden="true"></i>'+label+'</button>';
 }).join('');
 $('battleLog').innerHTML=state.logs.slice().reverse().map(line=>'<div class="logline">'+esc(line)+'</div>').join('');
 $('fullDemo').href='characters/'+id+'/lab.html';
 if(frameReady)arena?.status(state.hp,RULES.maxHP(state.party),state.acted,state.guarded,state.phase,state.active);
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
async function enemyPhase(){
 state.phase='enemy';renderBattle();store();
 const targets=RULES.alive(state.party,state.hp);
 if(!targets.length){state.phase='defeat';return}
 const victim=RULES.target(state.party,state.hp,state.round);
 const guarded=!!state.guarded[victim];
 const damage=Math.min(state.hp[victim],RULES.enemyDamage(state.round,guarded));
 await arena.enemyAttack(victim,damage,guarded);
 state.hp[victim]=Math.max(0,state.hp[victim]-damage);
 log('🔴 Training Sentinel → '+UNIT[victim].name+' −'+damage+' HP'+(guarded?' [GUARD]':''));
 state.guarded=RULES.counters(state.party);
 if(!RULES.alive(state.party,state.hp).length){
  state.phase='defeat';log('💀 DEFEAT · ทีมหลักทั้งหมด HP เป็นศูนย์');
  arena.announce('DEFEAT','เริ่มไฟต์ใหม่เพื่อท้าทายอีกครั้ง');
  return;
 }
 state.round=Math.min(999,state.round+1);
 state.phase='player';
 state.acted=RULES.counters(state.party);
 state.active=RULES.available(state.party,state.hp,state.acted)[0];
 arena.focus(state.active);
 log('🔵 ROUND '+state.round+' · ฝ่ายเราเริ่มออกคำสั่ง');
 arena.announce('ROUND '+state.round,'YOUR TURN');
}
async function finishHeroTurn(){
 if(state.enemyPct<=0){
  state.phase='victory';log('🏆 VICTORY · ชนะใน ROUND '+state.round);
  arena.announce('VICTORY','TRAINING SENTINEL DEFEATED');
  return;
 }
 const remaining=RULES.available(state.party,state.hp,state.acted);
 if(remaining.length){
  state.active=remaining[0];arena.focus(state.active);
  return;
 }
 await enemyPhase();
}
function sendCommand(kind){
 if(view!=='battle'||!['basic','skill','ultimate','guard'].includes(kind))return;
 if(!frameReady)return notice('สนามยังไม่พร้อม');
 if(actionBusy||state.phase!=='player')return;
 const id=state.active,c=AdvengerCharacters.get(id);
 if(!c||state.hp[id]<=0||state.acted[id]||state.enemyPct<=0)return;
 if(kind==='ultimate'&&state.energy[id]<100)return notice('EX ไม่ถึง 100');
 actionBusy=true;
 const oldEnergy=state.energy[id],bonus=state.boost?1.25:1;
 let hits=0,damageDone=0;
 if(kind==='ultimate')state.energy[id]=0;
 renderBattle();arena.energy(state.energy);store();
 const takeDamage=raw=>{
  const old=Math.round(state.enemyPct*MAX_DUMMY_HP);
  const dealt=Math.min(old,Math.max(0,Math.round(raw*bonus)));
  state.enemyPct=(old-dealt)/MAX_DUMMY_HP;hits++;damageDone+=dealt;
  $('enemyHealth').textContent=Math.round(state.enemyPct*100)+'%';
  $('targetHpBar').style.width=state.enemyPct*100+'%';
  $('targetHpTrack').setAttribute('aria-valuenow',String(Math.round(state.enemyPct*100)));
  return dealt;
 };
 (async()=>{
  try{
   if(kind==='guard'){
    await arena.guard(id);
    state.guarded[id]=true;
    state.energy[id]=Math.min(100,state.energy[id]+15);
    log('🛡️ '+c.name+' ป้องกัน · รับดาเมจลด 50% ใน Enemy Phase · EX +15');
   }else{
    const success=await arena.play(id,kind,state.elements[id],takeDamage);
    if(!success){
     if(kind==='ultimate')state.energy[id]=oldEnergy;
     log('⚠️ '+c.name+' ไม่สามารถใช้ '+kind+' ได้ โปรดลองใหม่');
     return;
    }
    if(kind!=='ultimate')state.energy[id]=Math.min(100,state.energy[id]+(kind==='skill'?30:20));
    if(state.boost&&hits)state.boost=false;
    log(c.icon+' '+c.name+' · '+kind.toUpperCase()+' · '+hits+' HIT · '+damageDone+
      ' DMG'+(bonus>1?' [BOOST]':''));
   }
   state.acted[id]=true;
   await finishHeroTurn();
  }catch(err){
   console.error(err);
   log('⚠️ เกิดข้อผิดพลาดระหว่างเทิร์น: '+String(err.message||err));
   // Recover from interrupted enemy animation without locking the player.
   if(state.phase==='enemy'){
    state.round=Math.min(999,state.round+1);
    state.acted=RULES.counters(state.party);state.guarded=RULES.counters(state.party);
    state.phase='player';
    state.active=RULES.available(state.party,state.hp,state.acted)[0]||id;
    arena.focus(state.active);
   }
  }finally{
   actionBusy=false;arena.energy(state.energy);render();
  }
 })();
}
function setElement(element){
 if(actionBusy||state.phase!=='player'||!frameReady||!ELEMENTS[state.active].some(([key])=>key===element))return;
 state.elements[state.active]=element;renderBattle();store();
}
function deploy(id){
 if(actionBusy||state.phase!=='player')return;
 if(!state.party.includes(id)||state.active===id)return;
 if(state.hp[id]<=0)return notice(UNIT[id].name+' HP หมดแล้ว');
 if(state.acted[id])return notice(UNIT[id].name+' ออกคำสั่งในรอบนี้ไปแล้ว');
 state.active=id;arena?.focus(id);
 render();
}
function useSupport(index){
 if(actionBusy||state.phase!=='player')return notice('ใช้ผู้ช่วยได้เฉพาะเทิร์นฝ่ายเรา');
 if(state.hp[state.active]<=0||state.acted[state.active])return notice('ต้องเลือกตัวที่ยังออกคำสั่งได้');
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
 if(actionBusy)return notice('รอให้แอนิเมชันจบก่อน');
 const newRound=RULES.initial(state.party);
 Object.assign(state,newRound);
 state.active=state.party[0];
 state.enemyPct=1;state.used=[false,false];state.boost=false;
 state.energy=Object.fromEntries(UNITS.map(id=>[id,100]));
 arena?.reset();arena?.focus(state.active);arena?.energy(state.energy);
 log('↻ เริ่มต่อสู้ใหม่ · ROUND 1 · ฟื้น HP/EX และผู้ช่วยทั้งหมด');
 render();
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