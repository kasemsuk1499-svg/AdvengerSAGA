/* Approved MAGE attack choreography, shared by ALL mage characters.
   Copied without changes from the v0.6 approved demo character.
   Character-specific overrides may replace individual actions. */
(function(){
 'use strict';
 const perform=async function(a,kind){
  if(kind==='basic'){
   a.announce('ARCANE BOLT','ยกไม้เท้ายิงลูกเวทเข้าหาเป้าหมาย');
   await a.charge(310);await a.projectile(530,'orb');
   a.hit(115,'magic');
  }else if(kind==='skill'){
   a.announce('RUNE CASCADE','เปิดวงเวทล้อมเป้าหมาย 3 ทิศทาง');
   await a.charge(630);a.rune(1050);
   for(const damage of [70,85,105]){
    await a.projectile(275,'rune');a.hit(damage,'magic');await a.wait(135);
   }
  }else if(kind==='ultimate'){
   a.announce('ASTRAL COLLAPSE','ดาราร่วงสู่สนาม · ปิดฉากด้วยลำแสง');
   await a.cinematic('ASTRAL COLLAPSE','ULTIMATE · ASTRAL MAGIC',940);
   a.rune(1750);await a.charge(360);
   for(const damage of [95,100,105]){
    await a.meteor(300);a.hit(damage,'magic');await a.wait(115);
   }
   a.beam(570);await a.wait(350);a.hit(290,'magic',true);
   await a.wait(250);
  }
 };
 AdvengerClassAnimations.register('mage',{
  basic:a=>perform(a,'basic'),
  skill:a=>perform(a,'skill'),
  ultimate:a=>perform(a,'ultimate')
 });
})();
