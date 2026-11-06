/* Approved GUNNER attack choreography, shared by ALL gunner characters.
   Copied without changes from the v0.6 approved demo character.
   Character-specific overrides may replace individual actions. */
(function(){
 'use strict';
 const perform=async function(a,kind){
  if(kind==='basic'){
   a.announce('PRECISION SHOT','ยืนเล็งเป้าหมาย ก่อนลั่นไก');
   await a.aim(260);await a.projectile(340,'bullet');a.hit(105,'bullet');
  }else if(kind==='skill'){
   a.announce('RAPID CROSSFIRE','เคลื่อนหลบและยิงสลับมือ 6 นัด');
   const running=a.strafe(1500);
   for(const damage of [45,50,50,55,60,70]){
    await a.projectile(120,'bullet');a.hit(damage,'bullet');await a.wait(80);
   }
   await running;
  }else if(kind==='ultimate'){
   a.announce('ZERO HORIZON','ล็อกเป้า → กระหน่ำยิง → RAIL SHOT');
   await a.cinematic('ZERO HORIZON','ULTIMATE · BALLISTIC OVERDRIVE',930);
   a.lock(1700);const running=a.strafe(2050);
   for(const damage of [60,65,65,70,75,85]){
    await a.projectile(130,'bullet');a.hit(damage,'bullet');await a.wait(85);
   }
   a.beam(750);await a.wait(400);a.hit(300,'bullet',true);
   await running;
  }
 };
 AdvengerClassAnimations.register('gunner',{
  basic:a=>perform(a,'basic'),
  skill:a=>perform(a,'skill'),
  ultimate:a=>perform(a,'ultimate')
 });
})();
