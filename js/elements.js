/* AdvengerSAGA v2.2 — character element / matchup reference.
 * Conservative, explicitly game-original affinities (not 7K official rules).
 * The actor's innate element is fixed in Character Creator; existing battle
 * color selection stays cosmetic and cannot switch combat affinity for free.
 */
(function(g){
 'use strict';
 const data=[
  ['water','น้ำ','💧','#64c8ff',['fire']],
  ['fire','ไฟ','🔥','#ff9866',['nature','ice']],
  ['wind','ลม','🌪️','#7bf1c3',['earth']],
  ['lightning','สายฟ้า','⚡','#fce58b',['water']],
  ['void','ความมืด','🌑','#bf92ff',['kinetic']],
  ['arcane','เวทมนตร์','🔮','#ba9cff',['void']],
  ['ice','น้ำแข็ง','❄️','#8de8ff',['wind']],
  ['storm','พายุ','⛈️','#f4da86',['water']],
  ['nature','ธรรมชาติ','🌿','#76e6b5',['earth']],
  ['earth','ดิน','🪨','#d9b68b',['lightning']],
  ['metal','โลหะ','⚙️','#cedbef',['kinetic']],
  ['kinetic','พลังงาน','💠','#7ceaff',['ice']]
 ];
 const entries=Object.freeze(data.map(([id,name,icon,color,strongAgainst])=>
  Object.freeze({id,name,icon,color,strongAgainst:Object.freeze(strongAgainst)})));
 const index=Object.freeze(Object.fromEntries(entries.map(x=>[x.id,x])));
 const get=id=>Object.hasOwn(index,id)?index[id]:null;
 const choices=()=>entries.map(x=>({...x,strongAgainst:x.strongAgainst.slice()}));
 const defaultForClass=id=>({
  saber:'water',mage:'arcane',tank:'earth',gunner:'kinetic'
 }[id]||'arcane');
 function multiplier(from,to){
  const source=get(from),target=get(to);
  if(!source||!target||from===to)return 1;
  if(source.strongAgainst.includes(to))return 1.15;
  if(target.strongAgainst.includes(from))return .90;
  return 1;
 }
 function affinityForActor(state,side,id){
  if(side==='ally'){
   const actor=g.AdvengerCharacters?.get(id);
   return actor?.element||actor?.defaultElement||null;
  }
  const actor=state.enemies?.find(x=>x.id===id);
  return actor?.element||null;
 }
 function damageMultiplier(state,fromSide,fromId,toSide,toId){
  return multiplier(affinityForActor(state,fromSide,fromId),
   affinityForActor(state,toSide,toId));
 }
 g.AdvengerElements=Object.freeze({
  version:1,all:choices,get,has:id=>!!get(id),defaultForClass,
  multiplier,affinityForActor,damageMultiplier
 });
})(window);
