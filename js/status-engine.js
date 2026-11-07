/* AdvengerSAGA v1.3 — DOM-free status runtime.
 * Referenced ailment meanings: Seven Knights Re:BIRTH (GameWith/Netmarble).
 * Original code and turn-based adaptations: round ticks, control durations,
 * deterministic RNG; not game-exact damage or resistance formulas.
 */
(function(g){
 'use strict';
 const DB=g.AdvengerStatusDB;
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
 const safe=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
 const statusKey=(side,id)=>side+'/'+id;
 function ensure(s){
  if(!s.skillStatuses)s.skillStatuses={};
  if(!Number.isInteger(s.skillRng)||s.skillRng<=0)s.skillRng=7831701;
  return s;
 }
 function list(s,side,id){ensure(s);return s.skillStatuses[statusKey(side,id)]||=[]}
 function find(s,side,id,type){return list(s,side,id).find(x=>x.key===type&&x.turns>0)||null}
 function has(s,side,id,type){return !!find(s,side,id,type)}
 function value(s,side,id,type){return find(s,side,id,type)?.power||0}
 function stats(s,side,id){
  if(side==='ally')return g.AdvengerStatDB?.forCharacter(id)||{};
  const foe=(s.enemies||[]).find(x=>x.id===id);
  return g.AdvengerStatDB?.forEnemy(foe)||{};
 }
 function alive(s,side,id){
  return side==='ally'?(s.hp?.[id]||0)>0:
   ((s.enemies||[]).find(e=>e.id===id)?.hp||0)>0;
 }
 function maxHP(s,side,id){
  if(side==='ally')return Math.max(1,stats(s,side,id).MAX_HP||1000);
  return Math.max(1,(s.enemies||[]).find(e=>e.id===id)?.maxHP||1000);
 }
 function attack(s,side,id){
  const x=stats(s,side,id);
  const enemy=(s.enemies||[]).find(e=>e.id===id);
  return Math.max(0,Math.round(Math.max(safe(x.P_ATK,0),safe(x.M_ATK,0))||
   (side==='enemy'?enemy?.attack:undefined)||200));
 }
 function rand(s){
  ensure(s);let x=s.skillRng>>>0;
  x^=(x<<13);x^=(x>>>17);x^=(x<<5);
  s.skillRng=x>>>0;return (x>>>0)/4294967296;
 }
 function sourceSide(s,sourceId){
  return (s.party||[]).includes(sourceId)?'ally':
   (s.enemies||[]).some(e=>e.id===sourceId)?'enemy':'ally';
 }
 function immunity(s,side,id,key){
  if(!DB.isNegative(key))return false;
  if(has(s,side,id,'statusImmunity'))return true;
  if(DB.isControl(key)&&has(s,side,id,'ccImmunity'))return true;
  if(key==='death'&&(has(s,side,id,'deathImmunity')||has(s,side,id,'damageImmunity')))return true;
  if(key==='poison'&&has(s,side,id,'poisonImmunity'))return true;
  if((key==='burn'||key==='dragonFlame')&&has(s,side,id,'burnImmunity'))return true;
  if(key==='bleed'&&has(s,side,id,'bleedImmunity'))return true;
  return false;
 }
 function probability(s,toSide,toId,fx,srcSide,srcId){
  const base=clamp(safe(fx.chance,1),0,1);
  if(!DB.isNegative(fx.key))return base;
  if(fx.ignoreResistance)return base;
  const from=stats(s,srcSide,srcId),to=stats(s,toSide,toId);
  const effectResist=has(s,toSide,toId,'fear')?0:safe(to.EFFECT_RESIST);
  const rate=base+safe(from.EFFECT_HIT)+safe(from.STATUS_BOOST)-
    effectResist-(DB.isControl(fx.key)?safe(to.CC_RESIST):0);
  return clamp(rate,0,1);
 }
 function damage(s,side,id,raw){
  const n=Math.max(0,Math.round(raw||0));
  if(!alive(s,side,id)||n<=0)return 0;
  let actual=0;
  if(g.AdvengerLifeEngine){
   actual=g.AdvengerLifeEngine.hit(s,side,id,n);
  }else if(side==='enemy'){
   actual=g.AdvengerBattleCore.hitEnemy(s,id,n);
  }else{
   actual=Math.min(s.hp[id],n);s.hp[id]-=actual;
   if(s.hp[id]<=0&&g.AdvengerSkillEngine?.onLethal)
    g.AdvengerSkillEngine.onLethal(s,id);
  }
  return actual;
 }
 function expire(s,side,id,st,reason='expire'){
  // 7K reference: Freeze and Petrify deal bonus damage on removal/expiry.
  // Here damage is derived from the reference and applied directly, with
  // no secondary on-hit processing to avoid a recursive chain.
  let amount=0;
  if(st.key==='freeze'&&alive(s,side,id))
   amount=damage(s,side,id,Math.min(Math.round(maxHP(s,side,id)*.4),Math.round(st.sourceAttack*3)));
  if(st.key==='petrify'&&alive(s,side,id))
   amount=damage(s,side,id,Math.round(st.sourceAttack*1.2));
  return amount?{kind:'statusExpiry',side,id,key:st.key,amount,reason}:null;
 }
 function remove(s,side,id,type,reason='cleanse'){
  const a=list(s,side,id),index=a.findIndex(x=>x.key===type);
  if(index<0)return null;
  const [st]=a.splice(index,1);
  return expire(s,side,id,st,reason);
 }
 function apply(s,side,id,fx,sourceId,srcSide){
  ensure(s);
  if(!fx||!DB.has(fx.key)||!alive(s,side,id))return false;
  if(immunity(s,side,id,fx.key))return false;
  const from=srcSide||sourceSide(s,sourceId);
  if(rand(s)>=probability(s,side,id,fx,from,sourceId))return false;
  const a=list(s,side,id);
  const prior=a.find(x=>x.key===fx.key);
  const turns=clamp(Math.round(safe(fx.turns,1)),1,999);
  const attackPower=attack(s,from,sourceId);
  if(fx.key==='death'&&prior){
   if(g.AdvengerLifeEngine)g.AdvengerLifeEngine.execute(s,side,id);
   else damage(s,side,id,maxHP(s,side,id)*100);
   a.splice(a.indexOf(prior),1);
   return true;
  }
  const power=clamp(safe(fx.power,({burn:.8,dragonFlame:1.2,bleed:.6,poison:.06,death:.2}[fx.key]??0)),0,3);
  const st={key:fx.key,power,turns,sourceAttack:attackPower,
   sourceSide:from,sourceId:String(sourceId||''),stacks:1};
  if(prior){
   if(fx.key==='bleed')prior.stacks=Math.min(5,(prior.stacks||1)+1);
   prior.turns=Math.max(prior.turns,turns);
   prior.power=power;prior.sourceAttack=attackPower;
   prior.sourceSide=from;prior.sourceId=st.sourceId;
  }else a.push(st);
  return true;
 }
 function cleanse(s,side,id,count=1){
  let removed=0;
  const statuses=list(s,side,id);
  for(let i=0;i<statuses.length&&removed<Math.max(0,Math.round(count));){
   if(DB.isNegative(statuses[i].key)){
    const key=statuses[i].key;
    remove(s,side,id,key,'cleanse');removed++;
   }else i++;
  }
  return removed;
 }
 function canUse(s,side,id,kind){
  if(!alive(s,side,id))return false;
  if(DB.controls.some(k=>has(s,side,id,k)))return false;
  if(has(s,side,id,'silence')&&['skill','skill1','skill2','ultimate','awakening'].includes(kind))
   return false;
  return true;
 }
 function effectiveBlockRate(s,side,id){
  return has(s,side,id,'paralysis')?0:safe(stats(s,side,id).BLOCK_RATE);
 }
 function isFumble(s,side,id,kind){
  return ['basic','counter','followup'].includes(kind)&&
   (has(s,side,id,'blind')||has(s,side,id,'confusion'));
 }
 function canHeal(s,side,id){return !has(s,side,id,'healBlock')}
 function canRevive(s,side,id){return !has(s,side,id,'soulDeath')}
 function consumeControl(s,side,id){
  const locks=DB.controls.filter(k=>has(s,side,id,k));
  if(!locks.length)return null;
  const expired=[];
  for(const key of locks){
   const st=find(s,side,id,key);if(!st)continue;
   st.turns--;
   if(st.turns<=0){
    const result=remove(s,side,id,key,'action');
    if(result)expired.push(result);
   }
  }
  return {blocked:true,key:locks[0],expired};
 }
 function onHit(s,side,id,amount){
  const events=[];
  if(!Number.isFinite(amount)||amount<=0||!alive(s,side,id))return events;
  const shock=find(s,side,id,'shock');
  if(shock){
   const n=damage(s,side,id,Math.round(shock.sourceAttack*.4));
   if(n)events.push({kind:'shockBonus',side,id,key:'shock',amount:n});
  }
  if(has(s,side,id,'freeze')){
   const event=remove(s,side,id,'freeze','hit');if(event)events.push(event);
  }
  if(has(s,side,id,'sleep')&&amount>=maxHP(s,side,id)*.07){
   remove(s,side,id,'sleep','wake');
   events.push({kind:'wake',side,id,key:'sleep',amount:0});
  }
  return events;
 }
 function tick(s){
  ensure(s);
  const events=[];
  for(const [unit,a] of Object.entries(s.skillStatuses)){
   const p=unit.indexOf('/');if(p<0||!Array.isArray(a))continue;
   const side=unit.slice(0,p),id=unit.slice(p+1);
   if(!['ally','enemy'].includes(side)||!alive(s,side,id))continue;
   for(const st of [...a]){
    if(!list(s,side,id).includes(st))continue;
    if(DB.isDot(st.key)){
     let raw=0;
     if(st.key==='burn'||st.key==='dragonFlame')raw=st.sourceAttack*st.power;
     if(st.key==='bleed')raw=st.sourceAttack*st.power*Math.min(5,st.stacks||1);
     if(st.key==='poison')raw=Math.min(maxHP(s,side,id)*st.power,st.sourceAttack*1.5);
     if(st.key==='death')raw=Math.max(1,Math.round((side==='enemy'?
      s.enemies.find(e=>e.id===id).hp:s.hp[id])*st.power));
     const actual=damage(s,side,id,raw);
     if(actual)events.push({kind:'damageOverTime',side,id,key:st.key,amount:actual});
    }
    if(!alive(s,side,id))break;
    // Crowd control counts the next N missed actions; other durations count
    // full rounds. Prevent a newly applied CC from disappearing before a turn.
    if(DB.isControl(st.key))continue;
    st.turns--;
    if(st.turns<=0){
     if(st.key==='death'){
      const actual=g.AdvengerLifeEngine?
       (g.AdvengerLifeEngine.execute(s,side,id)?maxHP(s,side,id):0):
       damage(s,side,id,maxHP(s,side,id)*100);
      if(actual)events.push({kind:'deathExpiry',side,id,key:'death',amount:actual});
     }
     const result=remove(s,side,id,st.key,'expire');
     if(result)events.push(result);
    }
   }
  }
  return events;
 }
 function restore(s,raw){
  ensure(s);s.skillStatuses={};
  if(!raw||typeof raw!=='object')return s;
  for(const [unit,arr] of Object.entries(raw)){
   const n=unit.indexOf('/');if(n<1||!Array.isArray(arr))continue;
   const side=unit.slice(0,n),id=unit.slice(n+1);
   if(side==='ally'?!(s.party||[]).includes(id):
     side==='enemy'?!(s.enemies||[]).some(e=>e.id===id):true)continue;
   const selected=[];
   for(const st of arr.slice(0,32)){
    if(!st||!DB.has(st.key)||!Number.isFinite(st.turns)||st.turns<=0||
      !Number.isFinite(st.power)||selected.some(x=>x.key===st.key))continue;
    selected.push({key:st.key,turns:clamp(Math.round(st.turns),1,999),
     power:clamp(st.power,0,3),sourceAttack:clamp(safe(st.sourceAttack),0,200000),
     sourceSide:['enemy','ally'].includes(st.sourceSide)?st.sourceSide:'ally',
     sourceId:typeof st.sourceId==='string'?st.sourceId.slice(0,64):'',
     stacks:clamp(Math.round(safe(st.stacks,1)),1,st.key==='bleed'?5:1)});
   }
   s.skillStatuses[unit]=selected;
  }
  return s;
 }
 function statusText(s,side,id){
  return list(s,side,id).filter(st=>st.turns>0)
   .map(st=>DB.labels[st.key]+' '+(st.turns>100?'∞':st.turns)+(st.stacks>1?' ×'+st.stacks:''))
   .join(' · ');
 }
 g.AdvengerStatusEngine=Object.freeze({
  version:1,ensure,list,find,has,value,stats,maxHP,probability,apply,
  cleanse,remove,canUse,isFumble,effectiveBlockRate,canHeal,canRevive,consumeControl,
  onHit,tick,restore,statusText
 });
})(window);
