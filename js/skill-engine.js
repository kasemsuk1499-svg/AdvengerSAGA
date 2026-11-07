/* AdvengerSAGA v1.3 — shared, DOM-free skill runtime.
 * Re:BIRTH metadata remains in skill-db.js; damage, turns and effects here
 * are adapted for AdvengerSAGA's 4+2 turn system, NOT game-exact formulas.
 */
(function(g){
 'use strict';
 const DB=g.AdvengerSkillDB;
 const STATUS=g.AdvengerStatusEngine;
 const LIFE=g.AdvengerLifeEngine;
 const negative=new Set(g.AdvengerStatusDB.negative);
 const labels=g.AdvengerStatusDB.labels;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const key=(side,id)=>side+'/'+id;
 const list=(s,side,id)=>(s.skillStatuses[key(side,id)]||=[]);
 const find=(s,side,id,type)=>list(s,side,id).find(x=>x.key===type);
 const value=(s,side,id,type)=>find(s,side,id,type)?.power||0;
 const heroStats=(id)=>{
  const char=g.AdvengerCharacters?.get(id);
  const stats=g.AdvengerStatDB?.forCharacter(id);
  const hp=stats?.MAX_HP??char?.maxHP??1000;
  return {maxHP:hp,attack:stats?.P_ATK??Math.round(char?.attack??hp*.23),
   magicAttack:stats?.M_ATK??Math.round(char?.magicAttack??char?.attack??hp*.23),
   defense:stats?.DEF??Math.round(char?.defense??hp*.15)};
 };
 function ensure(s){
  if(!s.skillKits)s.skillKits={}; // Opt in per character; old approved combat stays unchanged.
  if(!s.skillTimers)s.skillTimers={};
  if(!s.skillStatuses)s.skillStatuses={};
  if(!s.skillUsed)s.skillUsed={};
  if(!s.createdSkillTimers)s.createdSkillTimers={};
  if(!Number.isInteger(s.skillRng)||s.skillRng<=0)s.skillRng=7831701;
  return s;
 }
 function clear(s){
  ensure(s);s.skillTimers={};s.skillStatuses={};s.skillUsed={};s.createdSkillTimers={};s.skillRng=7831701;
  // Kit selection is persistent. Effects are local to each encounter.
  for(const id of s.party){
   const passive=DB.get(s.skillKits[id])?.skills.passive;
   if(!passive)continue;
   for(const trigger of passive.triggers||[]){
    if(trigger.event!=='battleStart')continue;
    const allies=trigger.target==='allAllies'?s.party:
      trigger.target==='self'?[id]:[];
    for(const targetId of allies){
     if(s.hp[targetId]<=0)continue;
     const e=trigger.effect;
     if(e.type==='status')addStatus(s,'ally',targetId,e,id);
    }
   }
  }
  return s;
 }
 function restore(s,saved){
  ensure(s);
  if(!saved)return s;
  s.skillTimers={};s.skillStatuses={};s.skillUsed={};s.createdSkillTimers={};
  if(saved?.createdSkillTimers&&typeof saved.createdSkillTimers==='object')
   for(const id of s.party){
    const slots=saved.createdSkillTimers[id];if(!slots||typeof slots!=='object')continue;
    s.createdSkillTimers[id]={};
    for(const [skillId,expiry] of Object.entries(slots)){
     if(/^created-[1-9]\d{0,8}$/.test(skillId)&&Number.isFinite(expiry))
      s.createdSkillTimers[id][skillId]=clamp(Math.round(expiry),0,999);
    }
   }
  if(saved?.skillKits&&typeof saved.skillKits==='object'){
   for(const id of Object.keys(saved.skillKits)){
    if(g.AdvengerCharacters?.get(id))
     s.skillKits[id]=DB.get(saved.skillKits[id])?saved.skillKits[id]:null;
   }
  }
  const validId=(side,id)=>side==='ally'?s.party.includes(id):s.enemies.some(e=>e.id===id);
  if(saved?.skillTimers&&typeof saved.skillTimers==='object')
   for(const id of s.party){
    const old=saved.skillTimers[id];
    if(!old||typeof old!=='object')continue;
    s.skillTimers[id]={};
    for(const kind of ['skill1','skill2','awakening']){
     if(Number.isFinite(old[kind]))s.skillTimers[id][kind]=clamp(Math.round(old[kind]),0,999);
    }
   }
  STATUS.restore(s,saved?.skillStatuses);
  if(saved?.skillUsed&&typeof saved.skillUsed==='object')
   for(const id of s.party)s.skillUsed[id]=!!saved.skillUsed[id];
  if(Number.isInteger(saved?.skillRng)&&saved.skillRng>0)
   s.skillRng=saved.skillRng>>>0;
  return s;
 }
 function rand(s){
  let x=s.skillRng>>>0;x^=(x<<13);x^=(x>>>17);x^=(x<<5);
  s.skillRng=x>>>0;return (s.skillRng>>>0)/4294967296;
 }
 function addStatus(s,side,id,fx,sourceId){
  return STATUS.apply(s,side,id,fx,sourceId);
 }
 function cleanse(s,side,id,count=1){
  return STATUS.cleanse(s,side,id,count);
 }
 function selectTargets(s,actorId,skill,selectedId){
  const living=s.enemies.filter(e=>e.hp>0);
  const allies=s.party.filter(id=>s.hp[id]>0);
  const fallen=s.party.filter(id=>s.hp[id]<=0);
  const canRevive=skill.effects?.some(fx=>fx.type==='revive');
  switch(skill.target){
   case 'self':return [{side:'ally',id:actorId}];
   case 'allAllies':return (canRevive?[...fallen,...allies]:allies)
    .map(id=>({side:'ally',id}));
   case 'twoAllies':return (canRevive?[...fallen,...allies]:allies)
    .slice(0,2).map(id=>({side:'ally',id}));
   case 'singleAlly':return [{side:'ally',id:
    (canRevive&&fallen.includes(selectedId))?selectedId:
    allies.includes(selectedId)?selectedId:
    canRevive&&fallen.length?fallen[0]:actorId}];
   case 'allEnemies':return living.map(e=>({side:'enemy',id:e.id}));
   case 'twoEnemies':return living.slice(0,2).map(e=>({side:'enemy',id:e.id}));
   case 'threeEnemies':return living.slice(0,3).map(e=>({side:'enemy',id:e.id}));
   case 'fourEnemies':return living.slice(0,4).map(e=>({side:'enemy',id:e.id}));
   case 'singleEnemy':{
    const foe=living.find(e=>e.id===selectedId)||living[0];
    return foe?[{side:'enemy',id:foe.id}]:[];
   }
   default:return [];
  }
 }
 function ready(s,actorId,kind){
  ensure(s);
  const kit=DB.get(s.skillKits[actorId]);
  const skill=kit?.skills?.[kind];
  if(!skill||s.hp[actorId]<=0||!STATUS.canUse(s,'ally',actorId,kind))return false;
  if((s.skillTimers[actorId]?.[kind]||0)>s.round)return false;
  if(skill.requiresDebuff&&!s.party.some(id=>s.hp[id]>0&&list(s,'ally',id).some(t=>negative.has(t.key))))return false;
  return true;
 }
 function remaining(s,id,kind){
  return Math.max(0,(s.skillTimers?.[id]?.[kind]||0)-s.round);
 }
 function createdRemaining(s,id,skillId){
  return Math.max(0,(s.createdSkillTimers?.[id]?.[skillId]||0)-s.round);
 }
 function readyCreated(s,id,skill,slot='skill1'){
  ensure(s);
  if(!skill||s.hp?.[id]<=0||
    !STATUS.canUse(s,'ally',id,slot==='basic'?'basic':'skill1')||
    (skill.sourceKind&&!STATUS.canUse(s,'ally',id,skill.sourceKind))||
    createdRemaining(s,id,skill.id)!==0)return false;
  if(skill.requiresDebuff&&!s.party.some(hero=>s.hp[hero]>0&&
     list(s,'ally',hero).some(fx=>negative.has(fx.key))))return false;
  return true;
 }
 function adjustDamage(s,fromSide,fromId,toSide,toId,amount,damageType='physical'){
  ensure(s);
  let x=Math.max(0,Number(amount)||0);
  if(value(s,toSide,toId,'magicImmunity')&&damageType==='magic')return 0;
  x*=1-value(s,fromSide,fromId,'attackDown');
  x*=1+value(s,fromSide,fromId,'attackUp');
  const weakness=value(s,fromSide,fromId,'weaknessBoost');
  if(weakness>0&&rand(s)<weakness)x*=1.30;
  if(damageType==='physical')x*=1+value(s,fromSide,fromId,'physicalDamageUp');
  if(damageType==='physical')x*=1+value(s,toSide,toId,'physicalVulnerability');
  x*=1+value(s,toSide,toId,'defenseDown')*.6;
  x*=1+value(s,toSide,toId,'damageReductionDown');
  x*=1-value(s,toSide,toId,'defenseUp')*.5;
  // Campaign level progression grants ATK power only in story battles;
  // training/lab damage remains identical to the original validated rules.
  if(fromSide==='ally'&&s.mode==='campaign'&&g.AdvengerCampaign?.stage(s.campaignStage))
   x*=1+g.AdvengerCampaign.attackBonus();
  // Uses innate character / authored enemy affinity, NOT mutable FX colors.
  x*=g.AdvengerElements?.damageMultiplier(s,fromSide,fromId,toSide,toId)??1;
  return Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.round(x)));
 }
 // Overlimit follows the same underlying damage/life rules, but stores only
 // one visual damage event per target for huge hit counts.
 const SAFE_MAX=Number.MAX_SAFE_INTEGER;
 const safeAmount=n=>Number.isFinite(n)?Math.max(0,Math.min(SAFE_MAX,Math.round(n))):SAFE_MAX;
 function burstStatus(s,fx,actorId,side,id,totalHits){
  if(totalHits<1)return 0;
  const p=STATUS.probability(s,side,id,fx,'ally',actorId);
  if(!(p>0))return 0;
  // Most statuses refresh (not infinitely stack). Bleed stacks up to 5;
  // death triggers on its 2nd application. Use inverse-geometric sampling
  // to implement arbitrarily large counts in at most five successful rolls.
  const max=fx.key==='bleed'?5:fx.key==='death'?2:1;
  let count=0,attempted=0;
  const certain={...fx,chance:1,ignoreResistance:true};
  while(count<max&&attempted<totalHits){
   const gap=p>=1?0:Math.floor(Math.log1p(-rand(s))/Math.log1p(-p));
   if(!Number.isFinite(gap)||gap>=totalHits-attempted)break;
   attempted+=gap+1;
   if(!STATUS.apply(s,side,id,certain,actorId))break;
   count++;
  }
  return count;
 }
 function cast(s,actorId,kind,selectedId,createdSkill=null){
  if(createdSkill?!readyCreated(s,actorId,createdSkill,kind):!ready(s,actorId,kind))
   return {ok:false,reason:'cooldown / condition'};
  const skill=createdSkill||DB.skill(s.skillKits[actorId],kind);
  const targets=selectTargets(s,actorId,skill,selectedId);
  if(!targets.length)return {ok:false,reason:'no valid target'};
  const stats=heroStats(actorId);
  const events=[];
  let previousDamage=[];
  const fumble=STATUS.isFumble(s,'ally',actorId,kind);
  for(const fx of skill.effects){
   if(fx.type==='damage')previousDamage=[];
   // Each sequential effect may override the skill's main target scope.
   // e.g. hit 4 enemies, roll Paralysis per hit, then buff the caster.
   const effectTargets=fx.target?
    selectTargets(s,actorId,{target:fx.target,effects:[fx]},selectedId):targets;
   for(const t of effectTargets){
    const foe=t.side==='enemy'?s.enemies.find(e=>e.id===t.id):null;
    const current=t.side==='ally'?s.hp[t.id]:foe?.hp;
    if(!Number.isFinite(current)||(current<=0&&fx.type!=='revive'))continue;
    if(fx.type==='damage'){
     const hits=createdSkill?.overlimit?
      Math.max(1,Math.min(1000000,Math.round(fx.hits||1))):
      Math.max(1,Math.min(12,fx.hits||1));
     const damageType=skill.damageType||
      (DB.get(s.skillKits[actorId])?.role==='Support'?'magic':'physical');
     const attackStat=damageType==='magic'?stats.magicAttack:stats.attack;
     const raw=safeAmount(attackStat*(fx.attackPct||0)+
      stats.defense*(fx.defensePct||0)+stats.maxHP*(fx.hpPct||0));
     const doDamage=(amount)=>{
      if(t.side==='enemy')return g.AdvengerBattleCore.hitEnemy(s,t.id,amount);
      const dealt=LIFE?LIFE.hit(s,'ally',t.id,amount):
       Math.min(s.hp[t.id],amount);
      if(!LIFE)s.hp[t.id]-=dealt;
      return dealt;
     };
     if(hits<=32){
      // Existing skill and normal 4x4 per-hit rules stay unchanged.
      for(let i=0;i<hits;i++){
       const amount=adjustDamage(s,'ally',actorId,t.side,t.id,
        raw*(s.boost?1.25:1)*(fumble?.8:1),damageType);
       const dealt=doDamage(amount);
       events.push({kind:'damage',id:t.id,side:t.side,amount:dealt,hitIndex:i+1});
       if(dealt>0){
        previousDamage.push({id:t.id,side:t.side,amount:dealt,hitIndex:i+1});
        events.push(...STATUS.onHit(s,t.side,t.id,dealt));
       }
      }
     }else{
      // Huge hits: resolve to lethal boundaries, never execute a million
      // DOM events or per-hit JS loops. A Guts/Auto-Revive can still
      // consume multiple protection charges across lethal boundaries.
      const summary={kind:'damage',id:t.id,side:t.side,amount:0,
       hits,compact:true,hitIndex:1,packets:[]};
      events.push(summary);
      const previous={id:t.id,side:t.side,amount:0,hitIndex:1,hitCount:0};
      let left=hits;
      while(left>0){
       const hpNow=t.side==='enemy'?
        (s.enemies.find(e=>e.id===t.id)?.hp||0):(s.hp[t.id]||0);
       if(hpNow<=0)break;
       const unit=adjustDamage(s,'ally',actorId,t.side,t.id,
        raw*(s.boost?1.25:1)*(fumble?.8:1),damageType);
       if(!unit)break;
       const amountPerHit=safeAmount(unit);
       if(!amountPerHit)break;
       const toLethal=Math.max(1,Math.ceil(hpNow/amountPerHit));
       const packet=Math.min(left,toLethal);
       const dealt=doDamage(safeAmount(amountPerHit*packet));
       if(dealt<=0)break; // immunity/immortality: no hit landed
       summary.amount+=dealt;
       // A packet represents landed real damage at the current HP /
       // Guts boundary. Store its per-hit distribution compactly so the
       // renderer can show REAL individual damage values, not total sums.
       // Max packets are bounded by the existing finite life protection
       // charges (and the configured hit count), not DOM sprite count.
       summary.packets.push({hits:packet,perHit:amountPerHit,damage:dealt});
       previous.amount+=dealt;previous.hitCount+=packet;
       if(events.length<512)events.push(...STATUS.onHit(s,t.side,t.id,dealt));
       else STATUS.onHit(s,t.side,t.id,dealt);
       left-=packet;
      }
      if(previous.hitCount)previousDamage.push(previous);
      summary.landedHits=previous.hitCount;
     }
    }else if(fx.type==='heal'&&t.side==='ally'&&STATUS.canHeal(s,t.side,t.id)){
     const heal=Math.max(0,Math.round(stats.defense*(fx.defensePct||0)+stats.attack*(fx.attackPct||0)));
     const done=LIFE?LIFE.heal(s,'ally',t.id,heal):
      Math.min(heal,g.AdvengerTurnRules.hpMax(t.id)-s.hp[t.id]);
     if(!LIFE)s.hp[t.id]+=done;
     events.push({kind:'heal',id:t.id,side:t.side,amount:done});
    }else if(fx.type==='revive'){
     const success=LIFE?.revive(s,t.side,t.id,fx)||false;
     if(success)events.push({kind:'revive',side:t.side,id:t.id,
      hp:LIFE.hp(s,t.side,t.id)});
    }else if(['guts','autoRevive','immortality'].includes(fx.type)){
     const success=LIFE?.grant(s,t.side,t.id,fx)||false;
     if(success)events.push({kind:'grant',side:t.side,id:t.id,effect:fx.type});
    }else if(fx.type==='execute'){
     const currentHp=LIFE?.hp(s,t.side,t.id)??current;
     const limit=(fx.hpThresholdPct??.24)*(LIFE?.maxHP(s,t.side,t.id)||1000);
     const cap=(fx.attackLimitPct??1.2)*stats.attack;
     if(currentHp>0&&currentHp<=limit&&currentHp<=cap){
      const success=LIFE?.execute(s,t.side,t.id,fx)||false;
      events.push({kind:'execute',side:t.side,id:t.id,success});
     }
    }else if(fx.type==='status'){
     if(fumble&&kind==='basic')continue;
     // Sequential rule: when perHit is true, only previous landed hits
     // can roll the subsequent status effect (one independent roll each).
     const rolls=fx.eachHit?previousDamage.filter(hit=>hit.side===t.side&&hit.id===t.id):[null];
     for(const hit of rolls){
      if(hit?.hitCount>32){
       const successes=burstStatus(s,fx,actorId,t.side,t.id,hit.hitCount);
       if(successes)events.push({kind:'status',id:t.id,side:t.side,
        key:fx.key,hitIndex:1,procs:successes,compact:true});
      }else{
       const attempts=hit?.hitCount||1;
       for(let n=0;n<attempts;n++){
        if(addStatus(s,t.side,t.id,fx,actorId))
         events.push({kind:'status',id:t.id,side:t.side,key:fx.key,
          hitIndex:hit?.hitIndex?hit.hitIndex+n:null});
       }
      }
     }
    }else if(fx.type==='cleanse'){
     const count=cleanse(s,t.side,t.id,fx.count||1);
     events.push({kind:'cleanse',id:t.id,side:t.side,amount:count});
    }else if(fx.type==='reduceBuffDuration'){
     for(const effect of list(s,t.side,t.id)){
      if(!negative.has(effect.key))effect.turns-=Math.max(0,Math.round(fx.turns||1));
     }
     s.skillStatuses[key(t.side,t.id)]=list(s,t.side,t.id).filter(x=>x.turns>0);
     events.push({kind:'reduceBuffDuration',id:t.id,side:t.side});
    }
   }
  }
  if(kind==='basic'&&!fumble&&!createdSkill){
   for(const trigger of DB.get(s.skillKits[actorId])?.skills.passive?.triggers||[]){
    if(trigger.event!=='basicUsed'||trigger.effect?.type!=='status')continue;
    const affected=trigger.target==='allAllies'?s.party:[actorId];
    for(const id of affected){
     if(s.hp[id]>0&&addStatus(s,'ally',id,trigger.effect,actorId))
      events.push({kind:'status',id,side:'ally',key:trigger.effect.key});
    }
   }
  }
  if(createdSkill){
   (s.createdSkillTimers[actorId]||=(Object.create(null)))[skill.id]=
    s.round+Math.max(0,Math.round(skill.cooldownRounds||0));
  }else{
   (s.skillTimers[actorId]||=(Object.create(null)))[kind]=
    s.round+DB.rounds(skill.cooldownSeconds||0);
  }
  return {ok:true,skill,hero:createdSkill?
   {id:'created',name:'SKILL LAB',role:'Custom'}:DB.get(s.skillKits[actorId]),
   targets,events,
   cooldownRounds:createdSkill?skill.cooldownRounds:DB.rounds(skill.cooldownSeconds||0)};
 }
 function onLethal(s,id){
  ensure(s);
  if(LIFE)return LIFE.onLethal(s,'ally',id);
  if(s.hp[id]>0||s.skillUsed[id]||!STATUS.canRevive(s,'ally',id))return false;
  const triggers=DB.get(s.skillKits[id])?.skills.passive?.triggers||[];
  const revive=triggers.find(t=>t.event==='lethal'&&t.effect?.type==='revive');
  if(!revive)return false;
  s.hp[id]=Math.max(1,Math.round(g.AdvengerTurnRules.hpMax(id)*(revive.effect.hpPct||.5)));
  s.skillUsed[id]=true;return true;
 }
 function advanceRound(s){return STATUS.tick(s)}
 function statusText(s,side,id){return STATUS.statusText(s,side,id)}
 g.AdvengerSkillEngine=Object.freeze({
  ensure,clear,restore,heroStats,ready,remaining,readyCreated,createdRemaining,selectTargets,cast,
  addStatus,cleanse,adjustDamage,onLethal,advanceRound,statusText,
  negative:Object.freeze(Array.from(negative))
 });
})(window);
