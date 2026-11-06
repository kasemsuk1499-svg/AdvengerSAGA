/* Approved TANK attack choreography, shared by ALL tank characters.
   Copied without changes from the v0.6 approved demo character.
   Character-specific overrides may replace individual actions. */
(function(){
 'use strict';
 const perform=async function(a,kind){
  if(kind==='basic'){
   a.announce('SHIELD BASH','ตั้งโล่แล้วพุ่งกระแทก');
   const running=a.rush(830,'heavy');await a.wait(520);
   a.hit(95,'heavy');await running;
  }else if(kind==='skill'){
   a.announce('BULWARK REVERSAL','ยกเกราะตั้งรับ → สวนกลับ 2 ฮิต');
   a.shield(620);await a.wait(570);
   const running=a.rush(1370,'heavy');
   await a.wait(610);a.hit(85,'heavy');
   await a.wait(300);a.hit(150,'heavy',true);await running;
  }else if(kind==='ultimate'){
   a.announce('AEGIS FALL','อัญเชิญโล่ยักษ์ทุบพื้น · 4 HIT');
   await a.cinematic('AEGIS FALL','ULTIMATE · THE FORTRESS',960);
   a.shield(800);await a.wait(350);
   const running=a.rush(2100,'heavy');
   for(const [delay,damage] of [[700,70],[265,95],[265,130],[340,285]]){
    await a.wait(delay);a.hit(damage,'heavy',damage===285);
   }
   await running;
  }
 };
 AdvengerClassAnimations.register('tank',{
  basic:a=>perform(a,'basic'),
  skill:a=>perform(a,'skill'),
  ultimate:a=>perform(a,'ultimate')
 });
})();
