/* AdvengerSAGA v1.0 — shared, DOM-free skill runtime.
 * Re:BIRTH metadata remains in skill-db.js; damage, turns and effects here
 * are adapted for AdvengerSAGA's 4+2 turn system, NOT game-exact formulas.
 */
(function(g){
 'use strict';
 const DB=g.AdvengerSkillDB;
 const negative=new Set(['burn','poison','bleed','attackDown','defenseDown',
   'physicalVulnerability','damageReductionDown','stun','shock','silence','death']);
 const labels={burn:'เผาไหม้',poison:'พิษ',bleed:'เลือดไหล',attackDown:'ATK↓',
  defenseDown:'DEF↓',physicalVulnerability:'รับกายภาพ↑',damageReductionDown:'ลดต้านทาน',
  defenseUp:'DEF↑',physicalDamageUp:'PHY↑',weaknessBoost:'Weakness↑',
  poisonImmunity:'กันพิษ',magicImmunity:'กันเวท',stun:'มึนงง',shock:'ช็อก',
  silence:'ปิดสกิล',death:'นับถอยหลัง'};
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const key=(side,id)=>side+'/'+id;
 const list=(s,side,id)=>(s.skillStatuses[key(side,id)]||=[]);
 const find=(s,side,id,type)=>list(s,side,id).find(x=>x.key===type);
 const value=(s,side,id,type)=>find(s,side,id,type)?.power||0;
 const heroStats=(id)=>{
  const char=g.AdvengerCharacters?.get(id);
  const hp=char?.maxHP||1000;
  return {attack:Math.round(char?.attack||hp*.23),defense:Math.round(char?.defense||hp*.15)};
 };
 function ensure(s){
  if(!s.skillKits)s.skillKits={saber:'rachel',mage:'lucy',tank:null,gunner:'ellen'};
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
  if(saved?.skillStatuses&&typeof saved.skillStatuses==='object')
   for(const [unit,arr] of Object.entries(saved.skillStatuses)){
    const p=unit.indexOf('/');if(p<0||!Array.isArray(arr))continue;
    const side=unit.slice(0,p),id=unit.slice(p+1);
    if(!validId(side,id))continue;
    s.skillStatuses[unit]=arr.filter(st=>st&&labels[st.key]&&
      Number.isFinite(st.power)&&Number.isFinite(st.turns))
      .slice(0,12).map(st=>({key:st.key,power:clamp(st.power,0,3),
      turns:clamp(Math.round(st.turns),0,999),sourceAttack:clamp(Number(st.sourceAttack)||0,0,200000)}))
      .filter(st=>st.turns>0);
   }
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
  ensure(s);
  if(!fx||!labels[fx.key])return false;
  if(fx.key==='poison'&&find(s,side,id,'poisonImmunity'))return false;
  if(rand(s)>clamp(fx.chance??1,0,1))return false;
  const statuses=list(s,side,id);
  const prev=statuses.find(x=>x.key===fx.key);
  const obj={key:fx.key,power:clamp(Number(fx.power)||0,0,3),
   turns:clamp(Math.round(fx.turns||1),1,999),
   sourceAttack:heroStats(sourceId).attack};
  if(prev)Object.assign(prev,obj);else statuses.push(obj);
  return true;
 }
 function cleanse(s,side,id,count=1){
  const a=list(s,side,id);let removed=0;
  for(let i=0;i<a.length&&removed<count;){
   if(negative.has(a[i].key)){a.splice(i,1);removed++}else i++;
  }return removed;
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
  if(!skill||s.hp[actorId]<=0)return false;
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
  for(const fx of skill.effects){
   for(const t of targets){
    const foe=t.side==='enemy'?s.enemies.find(e=>e.id===t.id):null;
    const current=t.side==='ally'?s.hp[t.id]:foe?.hp;
    if(!Number.isFinite(current)||current<=0)continue;
    if(fx.type==='damage'){
     for(let i=0;i<Math.max(1,Math.min(12,fx.hits||1));i++){
      const raw=Math.max(0,Math.round(stats.attack*(fx.attackPct||0)+stats.defense*(fx.defensePct||0)));
      const amount=adjustDamage(s,'ally',actorId,t.side,t.id,raw,skill.damageType||'physical');
      if(t.side==='enemy'){
       const hit=g.AdvengerBattleCore.hitEnemy(s,t.id,amount);
       events.push({kind:'damage',id:t.id,side:t.side,amount:hit,hitIndex:i+1});
      }else{
       const damage=Math.min(s.hp[t.id],amount);s.hp[t.id]-=damage;
       events.push({kind:'damage',id:t.id,side:t.side,amount:damage,hitIndex:i+1});
      }
     }
    }else if(fx.type==='heal'&&t.side==='ally'){
     const heal=Math.max(0,Math.round(stats.defense*(fx.defensePct||0)+stats.attack*(fx.attackPct||0)));
     const max=g.AdvengerTurnRules.hpMax(t.id),done=Math.min(heal,max-s.hp[t.id]);
     s.hp[t.id]+=done;events.push({kind:'heal',id:t.id,side:t.side,amount:done});
    }else if(fx.type==='status'){
     if(addStatus(s,t.side,t.id,fx,actorId))
      events.push({kind:'status',id:t.id,side:t.side,key:fx.key});
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
  (s.skillTimers[actorId]||=(Object.create(null)))[kind]=s.round+DB.rounds(skill.cooldownSeconds||0);
  return {ok:true,skill,hero:DB.get(s.skillKits[actorId]),targets,events,
   cooldownRounds:DB.rounds(skill.cooldownSeconds||0)};
 }
 function onLethal(s,id){
  if(s.hp[id]>0||s.skillUsed[id])return false;
  const triggers=DB.get(s.skillKits[id])?.skills.passive?.triggers||[];
  const revive=triggers.find(t=>t.event==='lethal'&&t.effect?.type==='revive');
  if(!revive)return false;
  s.hp[id]=Math.max(1,Math.round(g.AdvengerTurnRules.hpMax(id)*(revive.effect.hpPct||.5)));
  s.skillUsed[id]=true;return true;
 }
 function advanceRound(s){
  ensure(s);
  const logs=[];
  for(const [unit,arr] of Object.entries(s.skillStatuses)){
   const p=unit.indexOf('/'),side=unit.slice(0,p),id=unit.slice(p+1);
   const foe=side==='enemy'?s.enemies.find(e=>e.id===id):null;
   if(side==='enemy'&&(!foe||foe.hp<=0))continue;
   if(side==='ally'&&(!s.party.includes(id)||s.hp[id]<=0))continue;
   for(const st of arr){
    if(['burn','bleed','poison'].includes(st.key)){
     const damage=Math.max(1,Math.round(st.sourceAttack*st.power));
     const actual=side==='enemy'?g.AdvengerBattleCore.hitEnemy(s,id,damage):
      Math.min(s.hp[id],damage);
     if(side==='ally'){s.hp[id]-=actual;if(s.hp[id]<=0)onLethal(s,id);}
     logs.push({kind:'damageOverTime',side,id,key:st.key,amount:actual});
    }
    st.turns--;
   }
   s.skillStatuses[unit]=arr.filter(st=>st.turns>0);
  }
  return logs;
 }
 function statusText(s,side,id){
  return list(s,side,id).filter(x=>x.turns>0)
   .map(x=>(labels[x.key]||x.key)+' '+(x.turns>100?'∞':x.turns)).join(' · ');
 }
 g.AdvengerSkillEngine=Object.freeze({
  ensure,clear,restore,heroStats,ready,remaining,selectTargets,cast,
  addStatus,cleanse,adjustDamage,onLethal,advanceRound,statusText,
  negative:Object.freeze(Array.from(negative))
 });
})(window);
