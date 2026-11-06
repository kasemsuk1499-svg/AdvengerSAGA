/* BASIC: inherited from the character's class by default.
   To customize only this move, uncomment the kit.basic assignment below.
   Leave it unset to reuse the class attack animation and damage. */
(function(){
 'use strict';
 const id='new-hero';
 const all=window.AdvengerCharacterSkills ||= {};
 const kit=all[id] ||= {};
 // kit.basic=async function(a){
 //  a.announce('BASIC ATTACK','ท่าพื้นฐานเฉพาะตัว');
 //    const dash=a.rush(650,'slash');await a.wait(380);a.hit(100,'slash');await dash;
 // };
})();
