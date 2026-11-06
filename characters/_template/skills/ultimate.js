/* ULTIMATE: inherited from the character's class by default.
   To customize only this move, uncomment the kit.ultimate assignment below.
   Leave it unset to reuse the class attack animation and damage. */
(function(){
 'use strict';
 const id='new-hero';
 const all=window.AdvengerCharacterSkills ||= {};
 const kit=all[id] ||= {};
 // kit.ultimate=async function(a){
 //  a.announce('ULTIMATE','ท่าไม้ตายเฉพาะตัว');
 //    await a.cinematic('ULTIMATE','CHARACTER EXCLUSIVE',900);
 //    await a.charge(300);
 //    const dash=a.rush(1100,'slash');
 //    await a.wait(620);a.hit(140,'slash');
 //    await a.wait(260);a.hit(260,'slash',true);await dash;
 // };
})();
