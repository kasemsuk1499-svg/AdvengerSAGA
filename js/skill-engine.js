/* AdvengerSAGA v1.3 — shared, DOM-free skill runtime.
 * Re:BIRTH metadata remains in skill-db.js; damage, turns and effects here
 * are adapted for AdvengerSAGA's 4+2 turn system, NOT game-exact formulas.
 */
(function(g){
 'use strict';
 const DB=g.AdvengerSkillDB;
 const STATUS=g.AdvengerStatusEngine;
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
  return {attack:stats?.P_ATK??Math.round(char?.attack??hp*.23),
   magicAttack:stats?.M_ATK??Math.round(char?.magicAttack??char?.attack??hp*.23),
   defense:stats?.DEF??Math.round(char?.defense??hp*.15)};
 };
 function ensure(s){
  if(!s.skillKits)s.skillKits={}; // Opt in per character; old approved combat stays unchanged.
  if(!s.skillTimers)s.skillTimers={};
  if(!s.skillStatuses)s.skillStatuses={};
  if(!s.skillUsed)s.skillUsed={};
  if(!Number.isInteger(s.skillRng)||s.skillRng<=0)s.skillRng=7831701;
  return s;
 }
 function clear(s){
  ensure(s);s.skillTimers={};s.skillStatuses={};s.skillUsed={};s.skillRng=7831701;
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
  s.skillTimers={};s.skillStatuses={};s.skillUsed={};
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
  switch(skill.target){
   case 'self':return [{side:'ally',id:actorId}];
   case 'allAllies':return allies.map(id=>({side:'ally',id}));
   case 'singleAlly':return [{side:'ally',id:allies.includes(selectedId)?selectedId:actorId}];
   case 'allEnemies':return living.map(e=>({side:'enemy',id:e.id}));
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
  return Math.max(0,Math.round(x));
 }
 function cast(s,actorId,kind,selectedId){
  if(!ready(s,actorId,kind))return {ok:false,reason:'cooldown / condition'};
  const skill=DB.skill(s.skillKits[actorId],kind);
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
    selectTargets(s,actorId,{target:fx.target},selectedId):targets;
   for(const t of effectTargets){
    const foe=t.side==='enemy'?s.enemies.find(e=>e.id===t.id):null;
    const current=t.side==='ally'?s.hp[t.id]:foe?.hp;
    if(!Number.isFinite(current)||current<=0)continue;
    if(fx.type==='damage'){
     for(let i=0;i<Math.max(1,Math.min(12,fx.hits||1));i++){
      const damageType=skill.damageType||(DB.get(s.skillKits[actorId])?.role==='Support'?'magic':'physical');
      const attackStat=damageType==='magic'?stats.magicAttack:stats.attack;
      const raw=Math.max(0,Math.round(attackStat*(fx.attackPct||0)+stats.defense*(fx.defensePct||0)));
      const amount=adjustDamage(s,'ally',actorId,t.side,t.id,raw*(s.boost?1.25:1)*(fumble?.8:1),damageType);
      if(t.side==='enemy'){
       const hit=g.AdvengerBattleCore.hitEnemy(s,t.id,amount);
       events.push({kind:'damage',id:t.id,side:t.side,amount:hit,hitIndex:i+1});
       if(hit>0){
        previousDamage.push({id:t.id,side:t.side,amount:hit,hitIndex:i+1});
        events.push(...STATUS.onHit(s,t.side,t.id,hit));
       }
      }else{
       const damage=Math.min(s.hp[t.id],amount);s.hp[t.id]-=damage;
       events.push({kind:'damage',id:t.id,side:t.side,amount:damage,hitIndex:i+1});
       if(damage>0){
        previousDamage.push({id:t.id,side:t.side,amount:damage,hitIndex:i+1});
        events.push(...STATUS.onHit(s,t.side,t.id,damage));
       }
      }
     }
    }else if(fx.type==='heal'&&t.side==='ally'&&STATUS.canHeal(s,t.side,t.id)){
     const heal=Math.max(0,Math.round(stats.defense*(fx.defensePct||0)+stats.attack*(fx.attackPct||0)));
     const max=g.AdvengerTurnRules.hpMax(t.id),done=Math.min(heal,max-s.hp[t.id]);
     s.hp[t.id]+=done;events.push({kind:'heal',id:t.id,side:t.side,amount:done});
    }else if(fx.type==='status'){
     if(fumble&&kind==='basic')continue;
     // Sequential rule: when perHit is true, only previous landed hits
     // can roll the subsequent status effect (one independent roll each).
     const rolls=fx.eachHit?previousDamage.filter(hit=>hit.side===t.side&&hit.id===t.id):[null];
     for(const hit of rolls){
      if(addStatus(s,t.side,t.id,fx,actorId))
       events.push({kind:'status',id:t.id,side:t.side,key:fx.key,
        hitIndex:hit?.hitIndex||null});
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
  if(kind==='basic'&&!fumble){
   for(const trigger of DB.get(s.skillKits[actorId])?.skills.passive?.triggers||[]){
    if(trigger.event!=='basicUsed'||trigger.effect?.type!=='status')continue;
    const affected=trigger.target==='allAllies'?s.party:[actorId];
    for(const id of affected){
     if(s.hp[id]>0&&addStatus(s,'ally',id,trigger.effect,actorId))
      events.push({kind:'status',id,side:'ally',key:trigger.effect.key});
    }
   }
  }
  (s.skillTimers[actorId]||=(Object.create(null)))[kind]=s.round+DB.rounds(skill.cooldownSeconds||0);
  return {ok:true,skill,hero:DB.get(s.skillKits[actorId]),targets,events,
   cooldownRounds:DB.rounds(skill.cooldownSeconds||0)};
 }
 function onLethal(s,id){
  ensure(s);
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
  ensure,clear,restore,heroStats,ready,remaining,selectTargets,cast,
  addStatus,cleanse,adjustDamage,onLethal,advanceRound,statusText,
  negative:Object.freeze(Array.from(negative))
 });
})(window);
