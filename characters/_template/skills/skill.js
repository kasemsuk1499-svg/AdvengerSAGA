/* SKILL: inherited from the character's class by default.
   To customize only this move, uncomment the kit.skill assignment below.
   Leave it unset to reuse the class attack animation and damage. */
(function(){
 'use strict';
 const id='new-hero';
 const all=window.AdvengerCharacterSkills ||= {};
 const kit=all[id] ||= {};
 // kit.skill=async function(a){
 //  a.announce('SPECIAL SKILL','ท่าสกิลเฉพาะตัว');
 //    await a.charge(420);
 //    const dash=a.rush(930,'slash');
 //    await a.wait(460);a.hit(90,'slash');
 //    await a.wait(220);a.hit(120,'slash',true);await dash;
 // };
})();
