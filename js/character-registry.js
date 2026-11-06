/* AdvengerSAGA modular character registry.
   Each character owns its identity and full basic/skill/ultimate choreography. */
(function(g){
 'use strict';
 const table=new Map();
 const api={
  register(character){
   if(!character||!/^[a-z0-9-]+$/.test(character.id)||table.has(character.id))
    throw new Error('Invalid or duplicate character id');
   if(typeof character.perform!=='function')throw new Error('Missing attack code: '+character.id);
   const u=Object.freeze({...character});
   table.set(u.id,u);return u;
  },
  get(id){return table.get(id)||null},
  all(){return Array.from(table.values())}
 };
 g.AdvengerCharacters=Object.freeze(api);
})(window);