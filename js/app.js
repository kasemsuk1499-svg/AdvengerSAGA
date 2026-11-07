/* AdvengerSAGA v0.9 — shared encounters, multiple enemies and resumable turn system.
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
const CORE=AdvengerBattleCore,ENCOUNTERS=AdvengerEncounters;
const SKILLS=AdvengerSkillEngine,SKILL_DB=AdvengerSkillDB;
const RULES=AdvengerTurnRules,STATS=AdvengerStatDB,INIT=AdvengerInitiative;
const AILMENTS=AdvengerStatusDB,STATUS=AdvengerStatusEngine,LIFE=AdvengerLifeEngine,LIFE_TYPES=AdvengerLifeDB;
const CREATOR=AdvengerSkillCreator;
CREATOR.load();
const $=id=>document.getElementById(id);
const fresh=()=>{
 const party=['saber','mage','tank','gunner'];
 const initial={
  ...RULES.initial(party),battleVersion:CORE.version,party,assist:['focus','battery'],active:party[0],
   encounterId:'training',enemies:CORE.spawn('training'),targetId:'foe-0',enemyCursor:0,
  energy:Object.fromEntries(UNITS.map(id=>[id,100])),
  used:[false,false],boost:false,
  elements:Object.fromEntries(UNITS.map(id=>[id,AdvengerCharacters.get(id).defaultElement])),
  logs:['AdvengerSAGA · Turn-Based · ROUND 1'],screen:'formation'
 };
 STATS.resetRuntime(initial);
 SKILLS.clear(initial);
 LIFE.reset(initial);
 INIT.begin(initial);
 return initial;
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
  if(![2,3,4].includes(d.battleVersion)){
   state.active=state.party[0];
   state.logs=['🔄 อัปเกรดเกม: คงทีมและธาตุเดิม เริ่มไฟต์ใหม่ด้วยระบบกลาง'];
   return state;
  }
  const legacy=d.battleVersion===2;
  state.encounterId=!legacy&&ENCOUNTERS.get(d.encounterId)?d.encounterId:'training';
  state.enemies=CORE.restore(legacy?null:d.enemies,state.encounterId);
  if(legacy&&Number.isFinite(d.enemyPct))
   state.enemies[0].hp=Math.round(Math.max(0,Math.min(1,d.enemyPct))*state.enemies[0].maxHP);
  CORE.select(state,legacy?'foe-0':d.targetId);
  state.round=Number.isInteger(d.round)?Math.min(999,Math.max(1,d.round)):1;
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
  state.enemyCursor=!legacy&&Number.isInteger(d.enemyCursor)?
   Math.max(0,Math.min(state.enemies.length,d.enemyCursor)):0;
  if(CORE.outcome(state))state.phase=CORE.outcome(state);
  else if(state.phase==='enemy'&&legacy){
   // v0.8 had no enemy cursor; preserve its safe migration behavior.
   state.round=Math.min(999,state.round+1);state.phase='player';
   state.acted=RULES.counters(state.party);state.guarded=RULES.counters(state.party);
  }else if(state.phase==='player'&&!RULES.available(state.party,state.hp,state.acted).length){
   state.round=Math.min(999,state.round+1);
   state.acted=RULES.counters(state.party);state.guarded=RULES.counters(state.party);
  }
  if(!legacy&&d.skillKits)SKILLS.restore(state,d);
  STATS.restoreRuntime(state,!legacy?d.statRuntime:null);
  LIFE.restore(state,!legacy?d.lifeRuntime:null);
  state.active=state.party.includes(d.active)?d.active:state.party[0];
  INIT.restore(state,d);
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
 const u=UNIT[id],c=AdvengerCharacters.get(id),active=state.active===id,pct=state.energy[id];
 return '<button class="unit-card'+(active?' selected':'')+'" style="--accent:'+u.accent+';--accent-back:'+u.back+'" data-main-slot="'+i+'" aria-label="เลือกตัวละครในช่องหลัก '+(i+1)+'">'+
 '<span class="unit-slot">MAIN '+String(i+1).padStart(2,'0')+(active?' · IN FOCUS':'')+'</span>'+
 '<span class="class-head"><span class="unit-icon"><img class="unit-portrait" src="'+esc(c.portrait||c.art)+'" data-char-fallback="'+esc(c.fallback||c.art)+'" alt="" loading="lazy"></span><span><span class="unit-name">'+esc(u.name)+'</span><span class="unit-meta">'+esc(u.th)+'</span></span></span>'+
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
  const c=main?AdvengerCharacters.get(id):null;
  const image=main?'<img class="picker-portrait" src="'+esc(c.portrait||c.art)+'" data-char-fallback="'+esc(c.fallback||c.art)+'" alt="" loading="lazy" decoding="async">':
    '<span style="font-size:20px">'+u.icon+'</span>';
  return '<button class="picker-opt" data-pick="'+id+'">'+image+
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
 const enemies=CORE.living(state),foe=CORE.target(state),foePct=foe?foe.hp/foe.maxHP:0;
 const current=INIT.current(state);
 const canAct=frameReady&&!inAction&&player&&enemies.length>0&&
   current?.side==='ally'&&current.id===id&&state.hp[id]>0&&!state.acted[id];
 $('battle').style.setProperty('--active-char-color',u.accent);
 $('battleRoster').innerHTML=state.party.map((unitId,i)=>{
  const unit=UNIT[unitId],c=AdvengerCharacters.get(unitId),selected=id===unitId;
  const ex=Math.round(state.energy[unitId]);
  const hp=state.hp[unitId],max=RULES.hpMax(unitId),percent=Math.round(hp/max*100);
  const fallen=hp<=0,used=!!state.acted[unitId];
  const status=fallen?'✖ KO':used?'✓ DONE':selected&&canAct?'✦ SPD TURN':'รอคิว SPD';
  const disabled=fallen||used||!player||inAction||!selected;
  return '<button type="button" class="battle-member'+(selected?' active':'')+
   (fallen?' fallen':'')+(used?' acted':'')+'" data-deploy="'+unitId+
   '" aria-pressed="'+selected+'" aria-label="'+esc(unit.name)+' HP '+hp+'/'+max+' '+status+
   '" style="--char-color:'+unit.accent+'" '+(disabled?'disabled':'')+'>'+
   '<span class="roster-top"><img src="'+esc(c.portrait||c.art)+'" data-char-fallback="'+esc(c.fallback||c.art)+'" alt="" loading="lazy" decoding="async">'+
   '<span class="roster-copy"><strong>'+esc(unit.name)+'</strong><small>MAIN 0'+(i+1)+'</small></span></span>'+
   '<span class="roster-hp"><b class="roster-hp-label">HP</b><span class="roster-meter"><i style="width:'+percent+'%"></i></span><small>'+hp+'/'+max+'</small></span>'+
   '<span class="roster-ex"><span class="roster-ex-label">EX</span><span class="roster-meter"><i style="width:'+ex+'%"></i></span><small>'+ex+'%</small></span>'+
   '<span class="roster-select">'+status+'</span></button>';
 }).join('');
 $('activeName').textContent=u.emoji+' '+u.name;
 $('activeSubtitle').textContent=u.th;
 $('activeEnergy').textContent=Math.round(state.energy[id])+'/100';
 $('encounterSelect').value=state.encounterId;
 $('enemyName').textContent=foe?foe.name:'ALL ENEMIES DEFEATED';
 $('enemyHealth').textContent=foe?foe.hp+'/'+foe.maxHP:'0 HP';
 $('targetHpBar').style.width=(foePct*100)+'%';
 $('targetHpTrack').setAttribute('aria-valuenow',String(Math.round(foePct*100)));
 $('enemyTargets').innerHTML=state.enemies.map(e=>{
  const selected=e.id===state.targetId,dead=e.hp<=0;
  return '<button type="button" class="enemy-target-button'+(selected?' selected':'')+
   (e.boss?' boss':'')+'" data-target-pick="'+esc(e.id)+'" '+
   (dead||inAction||!player?'disabled':'')+' aria-pressed="'+selected+'">'+
   '<strong>'+esc(e.icon)+' '+esc(e.name)+(e.boss?' [BOSS]':'')+'</strong>'+
   '<small>'+e.hp+'/'+e.maxHP+' HP'+(dead?' · KO':'')+'</small></button>';
 }).join('');
 $('roundLabel').textContent='ROUND '+state.round+' · TURN ORDER';
 const phaseEl=$('turnPhase');
 phaseEl.classList.toggle('enemy',state.phase==='enemy');
 phaseEl.classList.toggle('victory',state.phase==='victory'||state.phase==='defeat');
 phaseEl.textContent=state.phase==='enemy'?'🔴 เทิร์นศัตรู':state.phase==='victory'?'🏆 ชนะ':
  state.phase==='defeat'?'💀 แพ้':'🔵 เทิร์นฝ่ายเรา';
 $('turnOrder').innerHTML=INIT.order(state).map(entry=>entry.side==='ally'?(()=>{
  const unitId=entry.id;

  const fallen=state.hp[unitId]<=0,done=!!state.acted[unitId];
  const selected=id===unitId&&canAct;
  const status=fallen?'KO':done?'DONE':selected?'NEXT':'READY';
  return '<div class="turn-token'+(selected?' current':'')+(done?' done':'')+(fallen?' ko':'')+
   '"><strong>'+UNIT[unitId].emoji+' '+esc(UNIT[unitId].name)+'</strong>'+
   '<small>SPD '+entry.spd+'</small><span>'+status+'</span></div>';
 })():(()=>{
  const foe=state.enemies.find(x=>x.id===entry.id);
  const fallen=!foe||foe.hp<=0,done=state.initiativeDone?.includes(INIT.token(entry));
  const active=current?.side==='enemy'&&current.id===entry.id&&state.phase==='enemy';
  return '<div class="turn-token enemy'+(active?' current':'')+(done?' done':'')+(fallen?' ko':'')+
   '"><strong>'+esc(foe?.icon||'◆')+' '+esc(foe?.name||'Enemy')+'</strong>'+
   '<small>SPD '+entry.spd+'</small><span>'+(fallen?'KO':done?'DONE':active?'NEXT':'WAIT')+'</span></div>';
 })()).join('');
 $('turnInfo').textContent=state.phase==='player'?
  'คิว '+UNIT[current?.id]?.name+' · SPD '+(current?.spd??'-')+' · ตัวเร็วออกก่อน ทุกตัวใช้ได้หนึ่งคำสั่งต่อรอบ':
  state.phase==='enemy'?'คิว '+(state.enemies.find(e=>e.id===current?.id)?.name||'Enemy')+
  ' · SPD '+(current?.spd??'-')+' · ศัตรูกำลังออกคำสั่ง':
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
  '🔵 '+u.name+' (SPD '+(current?.spd??'-')+') · เลือก Basic / Skill / Ultimate หรือป้องกัน';
 $('combatStatus').textContent=hint;
 const indicator=$('commandIndicator');
 indicator.textContent=state.phase==='player'?(!frameReady?'LOADING':inAction?'ACTION':'YOUR TURN'):
  state.phase==='enemy'?'ENEMY TURN':state.phase.toUpperCase();
 indicator.classList.toggle('busy',!canAct);
 indicator.classList.toggle('enemy',state.phase==='enemy');
 for(const command of document.querySelectorAll('[data-command]')){
  const kind=command.dataset.command;
  command.disabled=!canAct||(kind==='ultimate'&&state.energy[id]<100)||
   !STATUS.canUse(state,'ally',id,kind);
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
 $('fullDemo').href='characters/'+(AdvengerCharacters.get(id)?.createdInLab?
   AdvengerCharacters.get(id).classId:id)+'/lab.html';
 if(frameReady){arena?.syncEnemies(state.enemies,state.targetId);
  arena?.status(state.hp,RULES.maxHP(state.party),state.acted,state.guarded,state.phase,state.active);}
 renderSkillDatabase(canAct);
 renderCreatedBattleSkills(canAct);
 renderStatLive();
 renderAilmentDemo();
 renderLifeLab();
}
function render(){renderFormation();renderBattle();if(frameReady)arena?.energy(state.energy);store()}
function show(tab){
 if(actionBusy&&tab!=='battle'){notice('รอให้แอนิเมชันจบก่อนออกจากสนาม');return}
 view=tab;
 document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===tab));
 document.querySelectorAll('[data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===tab));
 if(tab==='battle')ensureArena();
 render();
 if(tab==='battle')resumeEnemyTurn();
}
function choose(type,index,id){
 if(actionBusy)return notice('รอให้แอนิเมชันจบก่อนเปลี่ยนทีม');
 let changed=false;
 if(type==='main'){
  if(!UNIT[id])return;
  const other=state.party.indexOf(id),current=state.party[index];
  if(current!==id){
   state.party[index]=id;
   if(other>=0)state.party[other]=current;
   changed=true;
  }
  if(changed){
   // The reserve may not have an HP entry yet. A changed main formation
   // starts a clean encounter so every selected character has valid HP,
   // turn state and EX without retaining actions from the old party.
   Object.assign(state,RULES.initial(state.party));
   state.battleVersion=CORE.version;state.active=state.party[0];
   state.enemies=CORE.spawn(state.encounterId);CORE.select(state,null);state.enemyCursor=0;
   SKILLS.clear(state);
   STATS.resetRuntime(state);
   LIFE.reset(state);
   INIT.begin(state);
   state.energy=Object.fromEntries(UNITS.map(unitId=>[unitId,100]));
   state.used=[false,false];state.boost=false;
   partyMounted='';arena?.reset();
   log('🧩 เปลี่ยนทีมหลักแล้ว · เริ่มไฟต์ใหม่พร้อม '+state.party.map(unitId=>UNIT[unitId].name).join(', '));
  }
 }else{
  if(!SUPPORT[id])return;
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
  if(force||!frameReady||partyMounted!==p){arena.mount(state.party,state.active,state.enemies,state.targetId);partyMounted=p}
  else {arena.focus(state.active);arena.syncEnemies(state.enemies,state.targetId)}
  arena.energy(state.energy);frameReady=true;
 }catch(e){console.error(e);frameReady=false;notice('โหลดสนามไม่ได้: '+e.message)}
}


function reportLifeEvents(){
 for(const event of LIFE.drain(state)){
  const name=event.side==='ally'?(UNIT[event.id]?.name||event.id):
   (state.enemies.find(e=>e.id===event.id)?.name||event.id);
  const labels={
   guts:'GUTS · รอดชีวิตด้วย 1 HP',
   autoRevive:'AUTO REVIVE · ฟื้นคืนชีพอัตโนมัติ',
   revive:'REVIVE · ชุบชีวิต',
   immortality:'IMMORTALITY · ฟื้นด้วย 1 HP',
   immortalityExpired:'IMMORTALITY หมดเวลา · KO',
   soulDeath:'SOUL DEATH · ปิดกั้นการฟื้นคืนชีพ',
   ko:'KO',
   grant:'ได้รับพรชีวิต'
  };
  if(event.type!=='grant')
   log('💠 '+name+' · '+(labels[event.type]||event.type)+
    (event.hp?' · '+event.hp+' HP':''));
  if(['revive','autoRevive','immortality','guts'].includes(event.type))
   arena?.announce(event.type.toUpperCase(),name);
 }
}

function concludeBattle(result){
 if(!result)return false;
 state.phase=result;
 if(result==='victory'){
  log('🏆 VICTORY · ชนะใน ROUND '+state.round);
  arena?.announce('VICTORY','ALL ENEMIES DEFEATED');
 }else{
  log('💀 DEFEAT · ทีมหลักทั้งหมด HP เป็นศูนย์');
  arena?.announce('DEFEAT','เริ่มไฟต์ใหม่เพื่อท้าทายอีกครั้ง');
 }
 return true;
}
function finishRound(){
 // A full round ends only when every surviving unit has acted (or was KO).
 // Status durations and DoT tick exactly once here.
 const statuses=SKILLS.advanceRound(state);
 LIFE.finishRound(state);
 for(const effect of statuses){
  if(effect.amount)log('☄️ '+(effect.side==='enemy'?
    (state.enemies.find(e=>e.id===effect.id)?.name||'Enemy'):
    (UNIT[effect.id]?.name||'Ally'))+' · '+effect.key+' −'+effect.amount+' HP');
 }
 reportLifeEvents();
 if(concludeBattle(CORE.outcome(state)))return false;
 CORE.nextRound(state);
 INIT.begin(state);
 arena?.focus(state.active);
 log('⚡ ROUND '+state.round+' · จัดลำดับใหม่จาก SPD');
 arena?.announce('ROUND '+state.round,'SPD TURN ORDER');
 return true;
}
async function runInitiative(){
 // This loop automatically resolves consecutive enemy turns and pauses only
 // at the exact hero whose SPD slot is next. Every enemy action is saved once.
 for(let steps=0;steps<24;steps++){
  reportLifeEvents();
  if(concludeBattle(CORE.outcome(state)))return;
  let next=INIT.sync(state);
  if(!next){
   if(!finishRound())return;
   next=INIT.sync(state);
   if(!next)return;
  }
  const control=STATUS.consumeControl(state,next.side,next.id);
  if(control?.blocked){
   const label=next.side==='ally'?(UNIT[next.id]?.name||next.id):
    (state.enemies.find(x=>x.id===next.id)?.name||next.id);
   log('🚫 '+label+' · '+(AILMENTS.labels[control.key]||control.key)+' · เสียคิวตาม SPD');
   for(const event of control.expired||[])if(event.amount)
    log('✦ '+label+' · '+AILMENTS.labels[event.key]+' −'+event.amount+' HP');
   INIT.complete(state,next.side,next.id);
   CORE.select(state,state.targetId);
   renderBattle();store();
   continue;
  }
  if(next.side==='ally'){
   arena?.focus(next.id);
   CORE.select(state,state.targetId);
   arena?.syncEnemies(state.enemies,state.targetId);
   renderBattle();store();
   return;
  }
  const foe=state.enemies.find(e=>e.id===next.id);
  if(!foe||foe.hp<=0){INIT.complete(state,'enemy',next.id);continue;}
  state.phase='enemy';renderBattle();store();
  const move=CORE.strike(state,foe,next.slot);
  if(move){
   move.damage=SKILLS.adjustDamage(state,'enemy',foe.id,'ally',move.heroId,move.damage);
   arena?.selectTarget(foe.id);
   try{await arena.enemyAttack(move.heroId,move.damage,move.guarded,foe.name)}
   catch(err){console.error('Enemy animation failed; applying the turn result',err)}
   const dealt=CORE.applyStrike(state,move);
   const reactions=STATUS.onHit(state,'ally',move.heroId,dealt);
   for(const effect of reactions)if(effect.amount)
    log('✦ '+UNIT[move.heroId].name+' · '+AILMENTS.labels[effect.key]+' −'+effect.amount+' HP');
   // The central Life Engine handles the lethal hit and records its outcome.
   reportLifeEvents();
   if(state.hp[move.heroId]>0&&foe.statusOnHit&&
     SKILLS.addStatus(state,'ally',move.heroId,foe.statusOnHit,foe.id))
    log('🌀 '+foe.name+' ใส่สถานะ '+foe.statusOnHit.key+' ให้ '+UNIT[move.heroId].name);
   log('🔴 '+foe.name+' (SPD '+next.spd+') → '+UNIT[move.heroId].name+
    ' −'+dealt+' HP'+(move.guarded?' [GUARD]':''));
  }
  reportLifeEvents();
  INIT.complete(state,'enemy',next.id);
  CORE.select(state,state.targetId);
  renderBattle();store();
 }
 throw new Error('Initiative queue overflow');
}
async function finishHeroTurn(){
 const id=state.active;
 reportLifeEvents();
 if(!INIT.complete(state,'ally',id))throw new Error('Hero action does not match SPD turn');
 CORE.select(state,state.targetId);
 arena?.syncEnemies(state.enemies,state.targetId);
 await runInitiative();
}
function resumeEnemyTurn(){
 if(view!=='battle'||!frameReady||actionBusy)return;
 const next=INIT.current(state);
 // Also auto-resolve an allied turn that is blocked by Crowd Control.
 // Otherwise a user testing Stun/Paralysis on the current hero could lock
 // out every command without advancing the SPD queue.
 const blockedAlly=next?.side==='ally'&&
  !STATUS.canUse(state,'ally',next.id,'basic');
 if(state.phase!=='enemy'&&!blockedAlly&&next)return;
 if(['victory','defeat'].includes(state.phase))return;
 actionBusy=true;
 runInitiative().catch(err=>{
  console.error('SPD initiative resume failed',err);
  log('⚠️ คิวศัตรูขัดข้อง ลองเข้าสนามใหม่อีกครั้ง');
 }).finally(()=>{
  actionBusy=false;render();
 });
}

function sendCommand(kind){
 if(view!=='battle'||!['basic','skill','ultimate','guard'].includes(kind))return;
 if(!frameReady)return notice('สนามยังไม่พร้อม');
 if(actionBusy||state.phase!=='player')return;
 const id=state.active,c=AdvengerCharacters.get(id);
 if(!c||INIT.current(state)?.side!=='ally'||INIT.current(state)?.id!==id||
  state.hp[id]<=0||state.acted[id]||!CORE.living(state).length)return;
 if(kind==='ultimate'&&state.energy[id]<100)return notice('EX ไม่ถึง 100');
 if(!STATUS.canUse(state,'ally',id,kind))
  return notice('ติดสถานะ '+STATUS.statusText(state,'ally',id)+' · ใช้คำสั่งนี้ไม่ได้');
 actionBusy=true;
 const oldEnergy=state.energy[id],bonus=state.boost?1.25:1;
 const attackTarget=state.targetId;
 let hits=0,damageDone=0;
 if(kind==='ultimate')state.energy[id]=0;
 renderBattle();arena.energy(state.energy); // provisional EX is only persisted after the move completes
 const takeDamage=raw=>{
  const scaled=SKILLS.adjustDamage(state,'ally',id,'enemy',attackTarget,raw,'physical');
  const fromKind=kind==='basic'?'basic':'skill';
  const rawAmount=STATUS.isFumble(state,'ally',id,fromKind)?scaled*.8:scaled;
  const dealt=CORE.hitEnemy(state,attackTarget,rawAmount,bonus);
  if(dealt>0){
   for(const reaction of STATUS.onHit(state,'enemy',attackTarget,dealt))
    if(reaction.amount)log('✦ '+(state.enemies.find(e=>e.id===attackTarget)?.name||'Enemy')+
     ' · '+AILMENTS.labels[reaction.key]+' −'+reaction.amount+' HP');
  }
  reportLifeEvents();
  hits++;damageDone+=dealt;
  const foe=state.enemies.find(e=>e.id===attackTarget);
  if(foe){
   $('enemyHealth').textContent=foe.hp+'/'+foe.maxHP;
   $('targetHpBar').style.width=(foe.hp/foe.maxHP*100)+'%';
   $('targetHpTrack').setAttribute('aria-valuenow',String(Math.round(foe.hp/foe.maxHP*100)));
   const label=Array.from($('enemyTargets').querySelectorAll('[data-target-pick]')).find(b=>b.dataset.targetPick===attackTarget)?.querySelector('small');
   if(label)label.textContent=foe.hp+'/'+foe.maxHP+' HP';
  }
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
   // Keep unconsumed SPD slots and retry an interrupted enemy turn on return.
   INIT.sync(state);
  }finally{
   actionBusy=false;arena.energy(state.energy);render();resumeEnemyTurn();
  }
 })();
}
function setElement(element){
 if(actionBusy||state.phase!=='player'||!frameReady||INIT.current(state)?.id!==state.active||!ELEMENTS[state.active].some(([key])=>key===element))return;
 state.elements[state.active]=element;renderBattle();store();
}
function deploy(id){
 if(actionBusy||state.phase!=='player'||!state.party.includes(id))return;
 if(id!==INIT.current(state)?.id)
  return notice('ต้องรอคิว SPD ของ '+UNIT[id].name+' ก่อนนะ');
 arena?.focus(id);render();
}
function useSupport(index){
 if(actionBusy||state.phase!=='player')return notice('ใช้ผู้ช่วยได้เฉพาะเทิร์นฝ่ายเรา');
 if(INIT.current(state)?.side!=='ally'||INIT.current(state)?.id!==state.active||
   state.hp[state.active]<=0||state.acted[state.active])return notice('ต้องรอคิว SPD ของตัวละคร');
 if(state.used[index]||!CORE.living(state).length)return;
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
 state.battleVersion=CORE.version;state.active=state.party[0];
 state.enemies=CORE.spawn(state.encounterId);CORE.select(state,null);state.enemyCursor=0;
 SKILLS.clear(state);
 STATS.resetRuntime(state);
 LIFE.reset(state);
 INIT.begin(state);
 state.used=[false,false];state.boost=false;
 state.energy=Object.fromEntries(UNITS.map(id=>[id,100]));
 arena?.reset();arena?.syncEnemies(state.enemies,state.targetId);
 arena?.focus(state.active);arena?.energy(state.energy);
 log('↻ เริ่มต่อสู้ใหม่ · ROUND 1 · เรียงคิวด้วย SPD');
 render();resumeEnemyTurn();
}
function selectEnemy(id){
 if(actionBusy||state.phase!=='player')return;
 if(!CORE.living(state).some(e=>e.id===id))return;
 CORE.select(state,id);arena?.selectTarget(state.targetId);render();
}
function setEncounter(id){
 if(actionBusy||!ENCOUNTERS.get(id)){
  notice('รอให้แอนิเมชันจบก่อนเปลี่ยนสนาม');
  $('encounterSelect').value=state.encounterId;return;
 }
 if(state.encounterId===id)return;
 state.encounterId=id;resetEncounter();
 log('⚔️ เลือกสนาม '+ENCOUNTERS.get(id).nameTh);render();
}


function renderStatLive(){
 const root=$('statLive');if(!root)return;
 const data=STATS.battleView(state,'ally',state.active);if(!data)return;
 const names=['MAX_HP','P_ATK','M_ATK','DEF','SPD'];
 root.innerHTML='<div class="stat-core-list">'+names.map(id=>
  '<span><b>'+esc(STATS.get(id).nameTh)+'</b><strong>'+data.stats[id]+'</strong></span>'
 ).join('')+'</div>'+
 '<p class="stat-runtime-summary">HP '+data.hp.current+'/'+data.hp.max+
 ' · EX '+data.ex.current+'/'+data.ex.max+' · SHIELD '+data.shield+' · '+data.lifeState+'</p>'+
 '<p class="stat-runtime-summary">บัฟ '+data.buffs.length+' · ดีบัฟ '+data.debuffs.length+
 ' · คูลดาวน์ '+Object.values(data.cooldowns).filter(n=>n>0).length+
 ' · สแต็ก '+Object.values(data.stacks).reduce((v,n)=>v+n,0)+'</p>';
}
function renderStatCatalog(){
 const root=$('statCatalog');if(!root)return;
 root.innerHTML=Object.entries(STATS.groups).map(([group,label])=>{
  const entries=STATS.all().filter(x=>x.group===group);
  return '<section class="stat-group"><h3>'+esc(label)+' ('+entries.length+')</h3>'+
   '<div class="stat-rows">'+entries.map(x=>
    '<div class="stat-row"><span><b>'+esc(x.nameTh)+'</b><small>'+esc(x.name)+'</small></span>'+
    '<code>'+esc(x.id)+'</code><small>'+esc(x.description)+'</small></div>'
   ).join('')+'</div></section>';
 }).join('');
}



function renderLifeCodex(){
 const root=$('lifeCatalog');
 if(!root)return;
 root.innerHTML=Object.entries(LIFE_TYPES.groups).map(([group,label])=>{
  const effects=LIFE_TYPES.all().filter(x=>x.group===group);
  return '<section class="life-group"><h3>'+esc(label)+'</h3>'+
   '<div class="life-effect-grid">'+effects.map(effect=>
    '<article class="life-effect-card"><strong>'+esc(effect.nameTh)+
    ' <small>'+esc(effect.name)+'</small></strong>'+
    '<p>'+esc(effect.description)+'</p>'+
    '<code>'+esc(effect.effectType)+' / '+esc(effect.id)+'</code></article>'
   ).join('')+'</div></section>';
 }).join('');
}
function renderLifeLab(){
 const select=$('lifeDemoTarget');
 if(!select)return;
 const target=select.value;
 select.innerHTML=state.party.map(id=>{
  const hp=state.hp[id];
  return '<option value="'+esc(id)+'">'+esc(UNIT[id].name)+
   ' · '+(hp>0?hp+' HP':'KO')+'</option>';
 }).join('');
 select.value=state.party.includes(target)?target:state.active;
 const id=select.value;
 const snap=LIFE.inspect(state,'ally',id);
 $('lifeDemoInfo').textContent=snap?(
  UNIT[id].name+' · '+snap.hp+'/'+snap.maxHP+' HP · '+
  (snap.immaterial?'IMMORTALITY '+snap.immortalityTurns+' รอบ · ':'')+
  (snap.soulDeath?'SOUL DEATH · ':'')+
  (snap.pending.guts?.uses?'GUTS '+snap.pending.guts.uses+' ครั้ง · ':'')+
  (snap.pending.autoRevive?.uses?'REVIVE '+snap.pending.autoRevive.uses+' ครั้ง · ':'')
 ):'';
 for(const btn of document.querySelectorAll('[data-life-test]'))
  btn.disabled=actionBusy||['victory','defeat'].includes(state.phase);
}
function testLife(kind){
 if(actionBusy||['victory','defeat'].includes(state.phase))
  return notice('อยู่ระหว่างคิวหรือจบการต่อสู้แล้ว');
 const id=$('lifeDemoTarget').value;
 if(!state.party.includes(id))return;
 const living=state.hp[id]>0;
 let ok=false;
 if(kind==='damage'&&living){LIFE.hit(state,'ally',id,999999);ok=true;}
 else if(kind==='revive'&&!living){ok=LIFE.revive(state,'ally',id,{hpPct:.4});}
 else if(kind==='guts'&&living){ok=LIFE.grant(state,'ally',id,{type:'guts',uses:1});}
 else if(kind==='immortality'&&living){ok=LIFE.grant(state,'ally',id,{type:'immortality',turns:2,uses:1});}
 else if(kind==='autoRevive'&&living){ok=LIFE.grant(state,'ally',id,{type:'autoRevive',hpPct:.6,uses:1});}
 else if(kind==='soulDeath'&&living){
  ok=STATUS.apply(state,'ally',id,{key:'soulDeath',turns:3,chance:1,ignoreResistance:true},'foe-0');
 }
 else if(kind==='cleanse')ok=STATUS.cleanse(state,'ally',id,99)>0;
 if(!ok)return notice('เงื่อนไขไม่ตรง: ตรวจ HP / ภูมิคุ้มกัน / สถานะที่มีอยู่');
 log('🧪 LIFE LAB · '+kind+' → '+UNIT[id].name);
 reportLifeEvents();
 if(CORE.outcome(state))concludeBattle(CORE.outcome(state));
 else{
  INIT.sync(state);CORE.select(state,state.targetId);
  arena?.focus(state.active);
 }
 render();resumeEnemyTurn();
}

function renderAilmentCodex(){
 const root=$('ailmentCatalog');if(!root)return;
 root.innerHTML=Object.entries(AILMENTS.groups).map(([type,label])=>
  '<section class="ailment-group"><h3>'+esc(label)+'</h3>'+
  '<div class="ailment-grid">'+AILMENTS.all().filter(item=>item.category===type)
   .map(item=>'<div class="ailment-card"><strong>'+esc(item.nameTh)+
    ' <small>'+esc(item.name)+'</small></strong><p>'+esc(item.description)+'</p>'+
    '<code>'+esc(item.id)+'</code></div>').join('')+'</div></section>'
 ).join('');
}
function renderAilmentDemo(){
 const selector=$('ailmentDemoKind');
 if(!selector)return;
 if(!selector.options.length)
  selector.innerHTML=AILMENTS.all().map(x=>
   '<option value="'+esc(x.id)+'">'+esc(x.nameTh)+' · '+esc(x.name)+'</option>').join('');
 const enemy=CORE.target(state);
 $('ailmentDemoEnemy').disabled=actionBusy||!enemy||state.phase!=='player';
 $('ailmentDemoAlly').disabled=actionBusy||state.hp[state.active]<=0||state.phase!=='player';
}
function testAilment(side){
 if(actionBusy||state.phase!=='player')return notice('ทดลองสถานะได้เฉพาะช่วงเลือกคำสั่ง');
 const key=$('ailmentDemoKind').value;
 if(!AILMENTS.get(key))return;
 const turns=Number($('ailmentDemoTurns').value)||2;
 const enemy=CORE.target(state);
 const target=side==='enemy'?enemy?.id:state.active;
 if(!target)return notice('ไม่มีเป้าหมายที่มีชีวิต');
 const source=side==='enemy'?state.active:(enemy?.id||'foe-0');
 const ok=STATUS.apply(state,side,target,{key,turns,chance:1,ignoreResistance:true},source);
 if(!ok)return notice('เป้าหมายมีสถานะคุ้มกันหรือไม่สามารถติดสถานะนี้');
 const targetName=side==='enemy'?enemy.name:UNIT[target].name;
 log('🧪 ทดลอง · '+AILMENTS.labels[key]+' → '+targetName+' ('+turns+' รอบ)');
 render();resumeEnemyTurn();
}

function renderSkillDatabase(canAct){
 const id=state.active,kitId=state.skillKits[id]||'';
 const kit=SKILL_DB.get(kitId);
 const select=$('dbHeroKit');
 select.innerHTML='<option value="">ไม่ใช้ชุดสกิลอ้างอิง</option>'+
  SKILL_DB.all().map(x=>'<option value="'+esc(x.id)+'"'+(kitId===x.id?' selected':'')+
   '>'+esc(x.name)+' · '+esc(x.role)+'</option>').join('');
 select.value=kitId;
 select.disabled=actionBusy||state.phase==='enemy';
 $('dbPassiveInfo').textContent=kit?
  '✧ PASSIVE: '+kit.skills.passive.name+' · ใช้เมื่อเข้าไฟต์และเมื่อเข้าเงื่อนไข':
  'เลือกตัวละครอ้างอิงเพื่อเปิดใช้ Active Skill 1, Active Skill 2 และ Passive ในระบบกลาง';
 $('dbSkillButtons').innerHTML=kit?['basic','skill1','skill2'].map((kind,i)=>{
  const skill=kit.skills[kind],remaining=SKILLS.remaining(state,id,kind);
  const available=canAct&&SKILLS.ready(state,id,kind)&&STATUS.canUse(state,'ally',id,kind);
  const text=remaining>0?'CD '+remaining+' รอบ':skill.requiresDebuff&&!SKILLS.ready(state,id,kind)?
   'ต้องมีดีบัฟให้ล้าง':'พร้อมใช้ · CD '+SKILL_DB.rounds(skill.cooldownSeconds)+' รอบ';
  return '<button type="button" class="db-skill-button" data-db-skill="'+kind+'" '+
   (available?'':'disabled')+'>'+
   '<strong>'+(i+1)+' · '+esc(skill.name)+'</strong>'+
   '<small>'+esc(text)+' · '+esc(skill.target)+'</small></button>';
 }).join(''):'';
 const source=$('dbSource');
 source.hidden=!kit?.source;
 if(kit){source.href=kit.source;source.textContent='อ้างอิงชุดสกิล: '+kit.name;}
 const foe=CORE.target(state);
 const ally=SKILLS.statusText(state,'ally',id);
 const enemy=foe?SKILLS.statusText(state,'enemy',foe.id):'';
 $('dbStatusInfo').textContent='สถานะ '+UNIT[id].name+': '+(ally||'ปกติ')+
   ' | เป้าหมาย: '+(enemy||'ปกติ');
}

const CREATED_SLOT_LABELS={basic:'BASIC',skill1:'SKILL 1',skill2:'SKILL 2',ultimate:'ULTIMATE'};
function renderCreatedBattleSkills(canAct){
 const root=$('createdBattleSkills');if(!root)return;
 const id=state.active;
 const equipped=CREATOR.slots.map(slot=>({slot,skill:CREATOR.equipped(id,slot)}))
  .filter(x=>!!x.skill);
 root.innerHTML=equipped.length?equipped.map(({slot,skill})=>{
  const remaining=SKILLS.createdRemaining(state,id,skill.id);
  const enough=slot!=='ultimate'||state.energy[id]>=100;
  const ready=canAct&&enough&&SKILLS.readyCreated(state,id,skill,slot);
  const note=remaining>0?'CD '+remaining+' รอบ':
   !enough?'ต้องมี EX 100':'พร้อม · '+skill.effects.length+' ขั้น';
  return '<button type="button" data-created-skill="'+esc(slot)+'" '+
   (ready?'':'disabled')+'><strong>'+esc(CREATED_SLOT_LABELS[slot])+
   ' · '+esc(skill.name)+'</strong><small>'+esc(note)+'</small></button>';
 }).join(''):'<p class="created-battle-empty">ยังไม่ได้ติดตั้งสกิลที่สร้างเอง · ไปที่แท็บ สร้างสกิล เพื่อออกแบบและติดตั้งให้ตัวละครได้ค่ะ</p>';
}
function sendCreatedSkill(slot){
 if(view!=='battle'||actionBusy||!frameReady||state.phase!=='player'||
  !CREATOR.slots.includes(slot))return;
 const id=state.active,queued=INIT.current(state),skill=CREATOR.equipped(id,slot);
 if(!skill||queued?.side!=='ally'||queued.id!==id||state.hp[id]<=0||
  state.acted[id]||!CORE.living(state).length)return;
 if(slot==='ultimate'&&state.energy[id]<100)
  return notice('EX ไม่ถึง 100 สำหรับ Ultimate');
 if(!SKILLS.readyCreated(state,id,skill,slot))
  return notice('ยังใช้ไม่ได้: คูลดาวน์หรือสถานะจำกัดการใช้สกิล');
 actionBusy=true;
 const previousEX=state.energy[id];
 if(slot==='ultimate')state.energy[id]=0;
 const report=SKILLS.cast(state,id,slot,state.targetId,skill);
 if(!report.ok){
  if(slot==='ultimate')state.energy[id]=previousEX;
  actionBusy=false;
  render();return notice('ใช้สกิลไม่สำเร็จ: '+report.reason);
 }
 renderBattle();
 (async()=>{
  try{
   await arena.playDatabaseSkill(id,report.skill,report);
   const damage=report.events.filter(e=>e.kind==='damage')
    .reduce((v,e)=>v+(e.amount||0),0);
   const healing=report.events.filter(e=>e.kind==='heal')
    .reduce((v,e)=>v+(e.amount||0),0);
   log('🧪 '+UNIT[id].name+' · '+skill.name+' · '+damage+' DMG · '+healing+' HEAL');
   reportLifeEvents();
   if(damage>0&&state.boost)state.boost=false;
   if(slot!=='ultimate')state.energy[id]=Math.min(100,state.energy[id]+15);
   state.acted[id]=true;
   await finishHeroTurn();
  }catch(err){
   console.error('Created skill execution:',err);
   log('⚠️ การแสดงผลสกิลที่สร้างเองขัดข้อง · ตรวจสอบบันทึกการต่อสู้');
   reportLifeEvents();
   state.acted[id]=true;
   if(state.phase==='player')await finishHeroTurn();
  }finally{
   actionBusy=false;arena?.energy(state.energy);render();resumeEnemyTurn();
  }
 })();
}

function setSkillKit(kitId){
 if(actionBusy||state.phase==='enemy')return notice('เปลี่ยนชุดสกิลได้หลังแอนิเมชันจบ');
 if(kitId&&!SKILL_DB.get(kitId))return;
 const id=state.active;
 if(state.skillKits[id]===(kitId||null))return;
 state.skillKits[id]=kitId||null;
 resetEncounter();
 log('📚 '+UNIT[id].name+' ใช้ฐานข้อมูลสกิล '+(kitId||'ไม่ใช้'));render();
}
function sendDatabaseSkill(kind){
 if(view!=='battle'||actionBusy||!frameReady||state.phase!=='player')return;
 const id=state.active;
 if(INIT.current(state)?.side!=='ally'||INIT.current(state)?.id!==id||
   state.hp[id]<=0||state.acted[id]||!CORE.living(state).length)return;
 if(!SKILLS.ready(state,id,kind))return notice('สกิลติดคูลดาวน์หรือโดนสถานะห้ามใช้');
 actionBusy=true;
 // The engine is pure data-driven: effects resolve once, the shared field only animates results.
 const report=SKILLS.cast(state,id,kind,state.targetId);
 if(!report.ok){actionBusy=false;return notice('ใช้สกิลไม่ได้: '+report.reason)}
 // In-flight hits are only in memory until the actor's turn has committed.
 // Reloading mid-animation rolls back this provisional action cleanly.
 renderBattle();
 (async()=>{
  try{
   await arena.playDatabaseSkill(id,report.skill,report);
   const damage=report.events.filter(e=>e.kind==='damage').reduce((v,e)=>v+e.amount,0);
   const healing=report.events.filter(e=>e.kind==='heal').reduce((v,e)=>v+e.amount,0);
   log('📖 '+UNIT[id].name+' · '+report.skill.name+' · '+damage+' DMG · '+healing+' HEAL');
   reportLifeEvents();
   if(damage>0&&state.boost)state.boost=false;
   state.energy[id]=Math.min(100,state.energy[id]+15);
   state.acted[id]=true;
   await finishHeroTurn();
  }catch(err){
   console.error(err);
   log('⚠️ แอนิเมชันสกิลฐานข้อมูลขัดข้อง แต่ผลการใช้สกิลถูกบันทึกแล้ว');
   state.acted[id]=true;
   reportLifeEvents();
   if(state.phase==='player')await finishHeroTurn();
  }finally{actionBusy=false;arena?.energy(state.energy);render();resumeEnemyTurn()}
 })();
}
// Portraits and cut-ins may point to PNG files not uploaded yet.
// Use the unit's generic SVG placeholder instead of rendering a broken image.
document.addEventListener('error',event=>{
 const img=event.target;
 if(!img||img.tagName!=='IMG')return;
 const fallback=img.getAttribute('data-char-fallback');
 if(!fallback||img.getAttribute('src')===fallback)return;
 img.removeAttribute('data-char-fallback');
 img.src=fallback;
},true);
document.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn)return;
 if(btn.dataset.screen){show(btn.dataset.screen);return}
 if(btn.dataset.mainSlot!==undefined){picker={type:'main',index:Number(btn.dataset.mainSlot)};renderPicker();return}
 if(btn.dataset.supportSlot!==undefined){picker={type:'support',index:Number(btn.dataset.supportSlot)};renderPicker();return}
 if(btn.dataset.pick&&picker){choose(picker.type,picker.index,btn.dataset.pick);return}
 if(btn.dataset.deploy){deploy(btn.dataset.deploy);return}
 if(btn.dataset.fieldUnit){deploy(btn.dataset.fieldUnit);return}
 if(btn.dataset.targetPick){selectEnemy(btn.dataset.targetPick);return}
 if(btn.dataset.targetEnemy){selectEnemy(btn.dataset.targetEnemy);return}
 if(btn.dataset.command){sendCommand(btn.dataset.command);return}
 if(btn.dataset.dbSkill){sendDatabaseSkill(btn.dataset.dbSkill);return}
 if(btn.dataset.createdSkill){sendCreatedSkill(btn.dataset.createdSkill);return}
 if(btn.dataset.lifeTest){testLife(btn.dataset.lifeTest);return}
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
$('dbHeroKit').addEventListener('change',e=>setSkillKit(e.target.value));
$('ailmentDemoEnemy').addEventListener('click',()=>testAilment('enemy'));
$('ailmentDemoAlly').addEventListener('click',()=>testAilment('ally'));
$('lifeDemoTarget').addEventListener('change',renderLifeLab);
$('encounterSelect').addEventListener('change',e=>setEncounter(e.target.value));
$('startBattle').addEventListener('click',()=>show('battle'));
$('battleReset').addEventListener('click',resetEncounter);
$('resetTeam').addEventListener('click',()=>{
 state=fresh();picker=null;partyMounted='';frameReady=false;
 if(view==='battle')ensureArena(true);
 log('↻ จัดทีมใหม่เป็น 4 อาชีพต้นแบบ');render();notice('คืนค่าการจัดทีมเรียบร้อย');
});
renderStatCatalog();
renderAilmentCodex();
renderLifeCodex();
$('labLinks').innerHTML=UNITS.filter(id=>!AdvengerCharacters.get(id)?.createdInLab)
 .map(id=>'<a class="button ghost" target="_blank" rel="noopener" href="characters/'+id+'/lab.html">'+UNIT[id].emoji+' '+UNIT[id].name+'</a>').join('');
render();
})();