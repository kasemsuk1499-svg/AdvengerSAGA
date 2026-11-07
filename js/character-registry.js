/* AdvengerSAGA character registry: independent character folders may inherit
   approved class animations and override any of the three actions individually. */
(function(g){
 'use strict';
 const table=new Map();
 const api={
  register(character){
   if(!character||!/^[a-z0-9-]+$/.test(character.id)||table.has(character.id))
    throw new Error('Invalid or duplicate character id');
   if(character.classId&&!g.AdvengerClasses?.[character.classId])
    throw new Error('Unrecognized profession '+character.classId+' for character '+character.id);
   const classMoves=g.AdvengerClassAnimations?.get(character.classId);
   if(typeof character.perform!=='function'&&!classMoves)
    throw new Error('Missing class attack preset or custom perform for '+character.id);
   // A character can supply standalone Basic/Skill/Ultimate scripts in its own
   // folder. Missing move overrides fall back to the selected class animations.
   const ownMoves=g.AdvengerCharacterSkills?.[character.id]||{};
   const explicit=character.attacks||{};
   for(const kind of ['basic','skill','ultimate']){
    const defined=explicit[kind]??ownMoves[kind];
    if(defined!==undefined&&typeof defined!=='function')
     throw new Error('Invalid '+kind+' override for '+character.id);
   }
   const original=character.perform;
   const perform=typeof original==='function'?original:
    async function(api,kind){
     if(!['basic','skill','ultimate'].includes(kind))throw new Error('Invalid action '+kind);
     const move=explicit[kind]??ownMoves[kind]??classMoves[kind];
     if(typeof move!=='function')throw new Error('Missing '+kind+' on '+character.id);
     return move(api);
    };
   if(typeof character.art!=='string'||!character.art.startsWith('characters/'+character.id+'/'))
    throw new Error('Character art must be inside its own folder: '+character.id);
   const stats=g.AdvengerStatDB?.create(character)||character.stats||null;
   const u=Object.freeze({...character,stats,perform});
   table.set(u.id,u);return u;
  },
  get(id){return table.get(id)||null},
  all(){return Array.from(table.values())}
 };
 g.AdvengerCharacters=Object.freeze(api);
})(window);