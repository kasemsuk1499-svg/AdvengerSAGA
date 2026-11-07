/* AdvengerSAGA v2.2 — selectable lightweight animation presets.
 * Reuse ONLY existing original class animation scripts; choices determine
 * VFX choreography, never the skill's damage, cooldown, target or effects.
 */
(function(g){
 'use strict';
 const labels={
  saber:'⚔️ Saber',mage:'🔮 Mage',tank:'🛡️ Tank',gunner:'🔫 Gunner'
 };
 const moves={basic:'Basic',skill:'Skill',ultimate:'Ultimate'};
 const entries=Object.freeze(Object.keys(labels).flatMap(classId=>
  Object.keys(moves).map(kind=>Object.freeze({
   id:classId+':'+kind,classId,kind,
   name:labels[classId]+' · '+moves[kind]
  }))));
 const map=Object.freeze(Object.fromEntries(entries.map(x=>[x.id,x])));
 const get=id=>typeof id==='string'&&Object.hasOwn(map,id)?map[id]:null;
 const noOp=()=>{};
 const ready=()=>Promise.resolve();
 // This samples existing deterministic base damage from the real source
 // move script. No hit animation is run and no combat state is modified.
 async function capture(sourceHeroId,kind){
  if(!['basic','skill','ultimate'].includes(kind))return [];
  const source=g.AdvengerCharacters?.get(sourceHeroId);
  if(!source?.perform)return [];
  const hits=[];
  const api={
   announce:noOp,rune:noOp,lock:noOp,shield:noOp,beam:noOp,
   hit:(amount,style,critical)=>hits.push({amount,style,critical:!!critical}),
   wait:ready,rush:ready,strafe:ready,aim:ready,charge:ready,
   cinematic:ready,projectile:ready,meteor:ready
  };
  await source.perform(api,kind);
  return hits;
 }
 g.AdvengerAnimations=Object.freeze({
  version:1,all:()=>entries.slice(),get,has:id=>!!get(id),capture
 });
})(window);
