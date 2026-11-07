/* AdvengerSAGA v1.2 — deterministic, speed-based initiative.
 * Highest SPD acts first in each round, ally + enemy turns interleaved.
 * Ties: allies before enemies, then formation slot / encounter slot.
 * SPD is sampled when a round begins. One action per alive unit per round.
 * No animation, DOM, cooldown or damage calculations live here.
 */
(function(g){
 'use strict';
 const stats=g.AdvengerStatDB;
 const token=entry=>entry.side+':'+entry.id;
 const speed=n=>Number.isFinite(n)?Math.max(0,n):0;
 function order(state){
  const party=(state.party||[]).map((id,slot)=>({
   side:'ally',id,slot,spd:speed(stats?.forCharacter(id)?.SPD),priority:0
  }));
  const enemies=(state.enemies||[]).map((foe,slot)=>({
   side:'enemy',id:foe.id,slot,spd:speed(stats?.forEnemy(foe)?.SPD),priority:1
  }));
  return [...party,...enemies].sort((a,b)=>
   b.spd-a.spd||a.priority-b.priority||a.slot-b.slot);
 }
 function alive(state,entry){
  return entry.side==='ally'?Number(state.hp?.[entry.id])>0:
   Number((state.enemies||[]).find(x=>x.id===entry.id)?.hp)>0;
 }
 function current(state){
  const done=new Set(state.initiativeDone||[]);
  return (state.initiativeOrder||[]).find(x=>!done.has(token(x))&&alive(state,x))||null;
 }
 function sync(state){
  const entry=current(state);
  if(!entry)return null;
  state.phase=entry.side==='ally'?'player':'enemy';
  if(entry.side==='ally')state.active=entry.id;
  return entry;
 }
 function begin(state){
  state.initiativeOrder=order(state);
  state.initiativeDone=[];
  return sync(state);
 }
 function complete(state,side,id){
  const entry=current(state);
  if(!entry||entry.side!==side||entry.id!==id)return false;
  state.initiativeDone.push(token(entry));
  if(side==='ally')state.acted[id]=true;
  return true;
 }
 function restore(state,saved){
  const entries=order(state);
  const allowed=new Set(entries.map(token));
  let done=[];
  if(saved?.battleVersion>=4&&Array.isArray(saved.initiativeDone)){
   done=saved.initiativeDone.filter(k=>typeof k==='string'&&allowed.has(k));
  }else{
   // Pre-SPD saves used a full player phase followed by an enemy phase.
   done=entries.filter(entry=>entry.side==='ally'&&
    (saved?.phase==='enemy'||!!state.acted?.[entry.id])).map(token);
   if(saved?.phase==='enemy'){
    const cursor=Number.isInteger(saved.enemyCursor)?Math.max(0,saved.enemyCursor):0;
    for(const entry of entries)
     if(entry.side==='enemy'&&entry.slot<cursor)done.push(token(entry));
   }
  }
  state.initiativeOrder=entries;
  state.initiativeDone=Array.from(new Set(done));
  for(const id of state.party||[])state.acted[id]=state.initiativeDone.includes('ally:'+id);
  if(!['victory','defeat'].includes(state.phase))sync(state);
  return current(state);
 }
 g.AdvengerInitiative=Object.freeze({
  version:1,order,begin,restore,complete,current,sync,alive,token
 });
})(window);
