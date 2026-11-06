/* Shared class attack choreography. A character may inherit any of the three
   moves, and replace Basic / Skill / Ultimate independently in their folder.
   Only battle-animation API methods are used; the shared field still renders
   all characters and VFX with its optimized renderer. */
(function(g){
 'use strict';
 const kinds=['basic','skill','ultimate'];
 const presets=new Map();
 const api={
  register(classId,moves){
   if(!g.AdvengerClasses?.[classId]||presets.has(classId))
    throw new Error('Invalid or duplicate animation class '+classId);
   if(!moves||kinds.some(kind=>typeof moves[kind]!=='function'))
    throw new Error('Class '+classId+' must provide Basic, Skill and Ultimate');
   const copy=Object.freeze(Object.fromEntries(kinds.map(k=>[k,moves[k]])));
   presets.set(classId,copy);return copy;
  },
  get(classId){return presets.get(classId)||null},
  all(){return Array.from(presets.keys())},
  kinds:Object.freeze(kinds.slice())
 };
 g.AdvengerClassAnimations=Object.freeze(api);
})(window);