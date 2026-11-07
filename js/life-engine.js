/* AdvengerSAGA v1.4 — Death, revival & last-stand engine.
 * Original, DOM-free turn-based adaptation of Seven Knights Re:BIRTH concepts.
 * Centralized lethal damage so allies, enemies, bosses and DoT obey the same
 * rules. One living actor still gets at most one SPD action each round.
 */
(function(g){
 'use strict';
 const rate=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
 const maxTurns=n=>Math.max(1,Math.min(999,Math.floor(Number.isFinite(n)?n:2)));
 const token=(side,id)=>side+'/'+id;
 const isValidSide=s=>s==='ally'||s==='enemy';
 const active=(s,side,id)=>side==='ally'?(s.party||[]).includes(id):
  (s.enemies||[]).some(e=>e.id===id);
 const target=(s,side,id)=>side==='enemy'?(s.enemies||[]).find(e=>e.id===id):null;
 const hp=(s,side,id)=>side==='ally'?s.hp?.[id]:target(s,side,id)?.hp;
 const maxHP=(s,side,id)=>side==='ally'?
  Math.max(1,g.AdvengerStatDB?.forCharacter(id)?.MAX_HP||1000):
  Math.max(1,target(s,side,id)?.maxHP||1000);
 function setHP(s,side,id,value){
  const v=Math.max(0,Math.min(maxHP(s,side,id),Math.round(value)));
  if(side==='ally')s.hp[id]=v;
  else {const foe=target(s,side,id);if(foe)foe.hp=v;}
  return v;
 }
 const blank=()=>({pending:{},used:{},immortality:null});
 function init(s){
  s.skillUsed||={};
  if(!s.lifeRuntime||typeof s.lifeRuntime!=='object')
   s.lifeRuntime={version:1,ally:{},enemy:{}};
  for(const side of ['ally','enemy']){
   s.lifeRuntime[side]||={};
   const ids=side==='ally'?(s.party||[]):(s.enemies||[]).map(x=>x.id);
   for(const id of ids)s.lifeRuntime[side][id]||=blank();
  }
  s.lifeEvents||=[];
  return s.lifeRuntime;
 }
 function stateOf(s,side,id){init(s);return s.lifeRuntime[side]?.[id]||null}
 function emit(s,type,side,id,details={}){
  (s.lifeEvents||=[]).push({type,side,id,...details});
  if(s.lifeEvents.length>40)s.lifeEvents.splice(0,s.lifeEvents.length-40);
 }
 function reset(s){
  s.lifeRuntime={version:1,ally:{},enemy:{}};s.lifeEvents=[];
  init(s);return s.lifeRuntime;
 }
 function restore(s,saved){
  reset(s);
  if(!saved||typeof saved!=='object')return s.lifeRuntime;
  for(const side of ['ally','enemy'])
   for(const [id,entry] of Object.entries(s.lifeRuntime[side])){
    const raw=saved[side]?.[id];
    if(!raw||typeof raw!=='object')continue;
    entry.used={};
    if(raw.used&&typeof raw.used==='object')
     for(const [key,used] of Object.entries(raw.used))
      if(/^[a-z][a-z0-9_-]{0,63}$/.test(key))entry.used[key]=!!used;
    entry.pending={};
    if(raw.pending&&typeof raw.pending==='object')
     for(const type of ['guts','autoRevive','immortality']){
      const fx=raw.pending[type];
      if(!fx||typeof fx!=='object')continue;
      entry.pending[type]={
       hpPct:rate(fx.hpPct??.5),healPct:rate(fx.healPct),
       turns:maxTurns(fx.turns),uses:Math.max(0,Math.min(9,Math.floor(fx.uses||0)))
      };
     }
    const v=raw.immortality;
    if(v&&Number.isFinite(v.turns)&&v.turns>0&&hp(s,side,id)>0)
     entry.immortality={
      turns:maxTurns(v.turns),
      startedRound:Math.max(1,Math.floor(v.startedRound||s.round||1))
     };
   }
  return s.lifeRuntime;
 }
 function grant(s,side,id,effect){
  if(!isValidSide(side)||!active(s,side,id)||!effect)return false;
  const st=stateOf(s,side,id),type=effect.type;
  if(!['guts','autoRevive','immortality'].includes(type)||hp(s,side,id)<=0)return false;
  st.pending[type]={
   hpPct:rate(effect.hpPct??.5),healPct:rate(effect.healPct),
   turns:maxTurns(effect.turns),
   uses:Math.max(1,Math.min(9,Math.floor(effect.uses||1)))
  };
  emit(s,'grant',side,id,{effect:type});
  return true;
 }
 function activeImmortality(s,side,id){
  return !!stateOf(s,side,id)?.immortality;
 }
 function engage(s,side,id,effect,type){
  const st=stateOf(s,side,id);
  if(type==='immortality'){
   setHP(s,side,id,1);
   st.immortality={turns:maxTurns(effect.turns),startedRound:s.round||1};
  }else if(type==='guts'){
   setHP(s,side,id,Math.max(1,Math.round(maxHP(s,side,id)*rate(effect.healPct))));
  }else{
   setHP(s,side,id,Math.max(1,Math.round(maxHP(s,side,id)*rate(effect.hpPct??.5))));
  }
  emit(s,type,side,id,{hp:hp(s,side,id),turns:type==='immortality'?st.immortality.turns:0});
  return true;
 }
 function passive(s,side,id){
  if(side==='enemy'){
   const cfg=target(s,side,id)?.life;
   return cfg?.passive||cfg||null;
  }
  const kit=g.AdvengerSkillDB?.get(s.skillKits?.[id]);
  return (kit?.skills?.passive?.triggers||[]).find(t=>
   t.event==='lethal'&&['revive','guts','immortality'].includes(t.effect?.type))?.effect||null;
 }
 function resolve(s,side,id,{ignorePrevention=false}={}){
  if(!isValidSide(side)||!active(s,side,id)||hp(s,side,id)>0)return false;
  const st=stateOf(s,side,id);
  if(ignorePrevention)return false;
  // Souldeath disables revival/immortality, but Guts is prevention of
  // KO rather than revival and therefore resolves first.
  const sealed=g.AdvengerStatusEngine?.has(s,side,id,'soulDeath');
  const priorities=sealed?['guts']:['guts','immortality','autoRevive'];
  for(const type of priorities){
   const pending=st.pending[type];
   if(!pending||pending.uses<1)continue;
   pending.uses--;
   return engage(s,side,id,pending,type);
  }
  const p=passive(s,side,id);
  const used=side==='ally'?!!s.skillUsed?.[id]:!!st.used.passive;
  if(p&&!used&&(!sealed||p.type==='guts')){
   if(side==='ally')s.skillUsed[id]=true;else st.used.passive=true;
   const mode=p.type==='revive'?'autoRevive':p.type;
   return engage(s,side,id,p,mode);
  }
  if(sealed)emit(s,'soulDeath',side,id);
  emit(s,'ko',side,id);return false;
 }
 function hit(s,side,id,raw,options={}){
  if(!isValidSide(side)||!active(s,side,id)||!(hp(s,side,id)>0))return 0;
  const n=Math.max(0,Math.round(Number.isFinite(raw)?raw:0));
  if(n===0)return 0;
  const st=stateOf(s,side,id);
  if(st.immortality&&!options.bypassImmortality){
   setHP(s,side,id,1);return 0;
  }
  const has=g.AdvengerStatusEngine?.has;
  if(!options.pierce&&has?.(s,side,id,'damageImmunity'))return 0;
  const before=hp(s,side,id);
  const damage=Math.min(before,n);
  setHP(s,side,id,before-damage);
  if(hp(s,side,id)<=0)resolve(s,side,id,options);
  return damage;
 }
 function heal(s,side,id,raw){
  if(!isValidSide(side)||!active(s,side,id)||hp(s,side,id)<=0)return 0;
  if(activeImmortality(s,side,id))return 0;
  if(g.AdvengerStatusEngine?.canHeal&&!g.AdvengerStatusEngine.canHeal(s,side,id))return 0;
  const before=hp(s,side,id);
  setHP(s,side,id,before+Math.max(0,Math.round(Number.isFinite(raw)?raw:0)));
  return hp(s,side,id)-before;
 }
 function execute(s,side,id,options={}){
  if(!isValidSide(side)||!active(s,side,id)||hp(s,side,id)<=0)return false;
  // Execution ignores raw damage reduction, but not the last-stand rules;
  // the caster must provide eligibility (e.g. <= 24% max HP).
  hit(s,side,id,hp(s,side,id),{pierce:!!options.pierce});
  return hp(s,side,id)<=0;
 }
 function revive(s,side,id,effect={}){
  if(!isValidSide(side)||!active(s,side,id)||hp(s,side,id)>0)return false;
  if(g.AdvengerStatusEngine?.has(s,side,id,'soulDeath'))return false;
  const frac=rate(effect.hpPct??.4);
  setHP(s,side,id,Math.max(1,Math.round(maxHP(s,side,id)*frac)));
  if(effect.cleanseOnRevive!==false){
   const a=g.AdvengerStatusEngine?.list(s,side,id)||[];
   s.skillStatuses[token(side,id)]=a.filter(t=>!g.AdvengerStatusDB.isNegative(t.key));
  }
  emit(s,'revive',side,id,{hp:hp(s,side,id)});
  return true;
 }
 function finishRound(s){
  init(s);const events=[];
  for(const side of ['ally','enemy'])for(const [id,st] of Object.entries(s.lifeRuntime[side])){
   const effect=st.immortality;
   if(!effect)continue;
   if(hp(s,side,id)<=0){st.immortality=null;continue;}
   if((s.round||1)<=effect.startedRound)continue;
   effect.turns--;
   if(effect.turns<=0){
    st.immortality=null;
    setHP(s,side,id,0);
    emit(s,'immortalityExpired',side,id);
    events.push({type:'immortalityExpired',side,id});
   }
  }
  return events;
 }
 function drain(s){
  const x=Array.isArray(s.lifeEvents)?s.lifeEvents.slice():[];
  s.lifeEvents=[];return x;
 }
 function inspect(s,side,id){
  if(!active(s,side,id))return null;
  const st=stateOf(s,side,id);
  return {hp:hp(s,side,id),maxHP:maxHP(s,side,id),
   immaterial:!!st.immortality,
   immortalityTurns:st.immortality?.turns||0,
   pending:{...st.pending},used:{...st.used},
   soulDeath:!!g.AdvengerStatusEngine?.has(s,side,id,'soulDeath')};
 }
 g.AdvengerLifeEngine=Object.freeze({
  version:1,init,reset,restore,stateOf,grant,hit,execute,revive,
  onLethal:resolve,activeImmortality,finishRound,drain,inspect,heal,
  maxHP,hp,setHP
 });
})(window);
