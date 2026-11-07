/* AdvengerSAGA v2.4 — truthful, bounded damage-number timeline.
 * The combat engine owns damage. This module only translates its report
 * into per-landed-hit visual frames with exact small-hit and sampled giant
 * hit presentation. Never replays damage or fabricates additional hits.
 */
(function(g){
 'use strict';
 const MAX_FRAMES=120;
 const MAX_OTHER=16;
 const safeCount=n=>Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(n))):0;
 const safeAmount=n=>Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.round(n))):0;
 const clampSum=(a,b)=>Math.min(Number.MAX_SAFE_INTEGER,a+b);
 function count(evt){
  if(evt.kind!=='damage')return 0;
  if(evt.compact)return Math.min(safeCount(evt.landedHits??(evt.amount>0?evt.hits:0)),
   safeCount(evt.hits));
  return evt.amount>0?1:0;
 }
 function configured(evt){
  return evt.kind==='damage'?evt.compact?safeCount(evt.hits):1:0;
 }
 function perHit(evt,index){
  if(!evt.compact)return safeAmount(evt.amount);
  let i=index;
  for(const part of (Array.isArray(evt.packets)?evt.packets:[])){
   const hits=safeCount(part.hits);
   if(i>hits){i-=hits;continue}
   const unit=safeAmount(part.perHit);
   return i===hits?safeAmount(part.damage-(hits-1)*unit):unit;
  }
  // Compatible with reports saved before the packet breakdown existed.
  return safeAmount(evt.amount/Math.max(1,count(evt)));
 }
 function plan(report,options={}){
  const source=Array.isArray(report?.events)?report.events:[];
  const maxVisible=Math.max(1,Math.min(MAX_FRAMES,
   safeCount(options.maxVisible??MAX_FRAMES)||MAX_FRAMES));
  let configuredHits=0,landedHits=0;
  for(const evt of source){
   configuredHits=clampSum(configuredHits,configured(evt));
   landedHits=clampSum(landedHits,count(evt));
  }
  // Always sample first and last landed hit. For normal combos every hit
  // is rendered separately with its own actual damage number.
  const chosen=[];
  const n=Math.min(maxVisible,landedHits);
  for(let i=0;i<n;i++){
   const index=n===1?0:Math.floor(i*(landedHits-1)/(n-1));
   if(chosen.at(-1)!==index)chosen.push(index);
  }
  const frames=[];
  let offset=0,cursor=0,otherCount=0;
  for(const evt of source){
   if(evt.kind==='damage'){
    const hits=count(evt);
    while(cursor<chosen.length&&chosen[cursor]<offset+hits){
     const position=chosen[cursor]-offset+1;
     frames.push({
      kind:'damage',side:evt.side,id:evt.id,
      amount:perHit(evt,position),hitNumber:chosen[cursor]+1,
      sampled:landedHits>maxVisible,configuredHits,landedHits,
      hitIndex:position
     });
     cursor++;
    }
    offset+=hits;
   }else if(otherCount<MAX_OTHER){
    frames.push({kind:evt.kind,side:evt.side,id:evt.id,
     amount:safeAmount(evt.amount),key:evt.key});
    otherCount++;
   }
  }
  return Object.freeze({
   configuredHits,landedHits,shownHits:chosen.length,
   sampled:landedHits>maxVisible,frames
  });
 }
 g.AdvengerHitDisplay=Object.freeze({
  version:1,maxFrames:MAX_FRAMES,plan
 });
})(window);
