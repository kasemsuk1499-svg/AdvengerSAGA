/* AdvengerSAGA turn-based battle rules v0.5.
   Data and damage rules live separately from the renderer. No RNG is required. */
(function(g){
 'use strict';
 const hpMax=id=>Math.max(1,Math.round(g.AdvengerCharacters.get(id)?.stats?.MAX_HP??g.AdvengerCharacters.get(id)?.maxHP??1000));
 const maxHP=party=>Object.fromEntries(party.map(id=>[id,hpMax(id)]));
 const counters=party=>Object.fromEntries(party.map(id=>[id,false]));
 const initial=party=>({
  battleVersion:2,round:1,phase:'player',hp:maxHP(party),
  acted:counters(party),guarded:counters(party)
 });
 const alive=(party,hp)=>party.filter(id=>Number(hp[id])>0);
 const available=(party,hp,acted)=>party.filter(id=>Number(hp[id])>0&&!acted[id]);
 const target=(party,hp,round)=>{
  const candidates=alive(party,hp);
  if(!candidates.length)return null;
  // Rotate targets fairly among survivors (deterministic for reproducible tests).
  return candidates[(Math.max(1,round)-1)%candidates.length];
 };
 const enemyDamage=(round,guarded=false)=>{
  const raw=215+Math.min(165,Math.max(0,round-1)*30);
  return guarded?Math.round(raw*.5):raw;
 };
 g.AdvengerTurnRules=Object.freeze({
  hpMax,maxHP,counters,initial,alive,available,target,enemyDamage
 });
})(window);
