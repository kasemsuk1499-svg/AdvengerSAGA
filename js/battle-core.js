/* AdvengerSAGA v0.9 — shared deterministic battle rules.
   DOM-free: usable by any character, enemy, boss or future story encounter. */
(function(g){
 'use strict';
 const EC=g.AdvengerEncounters;
 const valid=n=>Number.isFinite(n);
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const living=state=>(state.enemies||[]).filter(e=>e.hp>0);
 const livingParty=state=>state.party.filter(id=>state.hp[id]>0);
 function spawn(id){return EC.spawn(EC.get(id)?id:'training')}
 function restore(saved,id){
  const fresh=spawn(id);
  if(!Array.isArray(saved))return fresh;
  for(const enemy of fresh){
   const old=saved.find(e=>e&&e.id===enemy.id&&e.kind===enemy.kind);
   if(old&&valid(old.hp))enemy.hp=clamp(Math.round(old.hp),0,enemy.maxHP);
  }
  return fresh;
 }
 function select(state,id){
  const alive=living(state);
  if(!alive.length){state.targetId=null;return null}
  state.targetId=alive.some(e=>e.id===id)?id:alive[0].id;
  return state.targetId;
 }
 function target(state){
  const current=state.enemies.find(e=>e.id===state.targetId&&e.hp>0);
  return current||living(state)[0]||null;
 }
 function hitEnemy(state,id,raw,multiplier=1){
  const foe=state.enemies.find(e=>e.id===id);
  if(!foe||foe.hp<=0||!valid(raw))return 0;
  const dealt=Math.min(foe.hp,Math.max(0,Math.round(raw*(valid(multiplier)?multiplier:1))));
  foe.hp-=dealt;
  return dealt;
 }
 function nextEnemy(state,enemyIndex){
  const surviving=livingParty(state);
  if(!surviving.length)return null;
  return surviving[(Math.max(1,state.round)-1+enemyIndex)%surviving.length];
 }
 function strike(state,foe,enemyIndex){
  if(!foe||foe.hp<=0)return null;
  const hero=nextEnemy(state,enemyIndex);
  if(!hero)return null;
  const guarded=!!state.guarded[hero];
  const power=Math.round(foe.attack+Math.min(165,Math.max(0,state.round-1)*20));
  const damage=Math.min(state.hp[hero],Math.round(power*(guarded?0.5:1)));
  return {enemyId:foe.id,enemyName:foe.name,heroId:hero,guarded,damage};
 }
 function applyStrike(state,move){
  if(!move||state.hp[move.heroId]<=0)return 0;
  const damage=Math.min(state.hp[move.heroId],Math.max(0,Math.round(move.damage)));
  state.hp[move.heroId]-=damage;
  return damage;
 }
 function outcome(state){
  if(!living(state).length)return 'victory';
  if(!livingParty(state).length)return 'defeat';
  return null;
 }
 function nextRound(state){
  state.round=Math.min(999,Math.max(1,Math.round(state.round||1))+1);
  state.phase='player';state.enemyCursor=0;
  state.acted=Object.fromEntries(state.party.map(id=>[id,false]));
  state.guarded=Object.fromEntries(state.party.map(id=>[id,false]));
  state.active=state.party.find(id=>state.hp[id]>0)||state.party[0];
  select(state,state.targetId);
 }
 g.AdvengerBattleCore=Object.freeze({
  version:4,spawn,restore,living,livingParty,select,target,hitEnemy,
  nextEnemy,strike,applyStrike,outcome,nextRound
 });
})(window);
