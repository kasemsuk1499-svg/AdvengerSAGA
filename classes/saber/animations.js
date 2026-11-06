/* Approved SABER attack choreography, shared by ALL saber characters.
   Copied without changes from the v0.6 approved demo character.
   Character-specific overrides may replace individual actions. */
(function(){
 'use strict';
 const perform=async function(a,kind){
  const name=kind==='basic'?'QUICK SLASH':kind==='skill'?'ELEMENTAL TRIPLE':'ASTRAL REND';
  if(kind==='basic'){
   a.announce(name,'พุ่งฟันรวดเดียว');
   const running=a.rush(690,'slash');await a.wait(385);
   a.hit(110,'slash');await running;
  }else if(kind==='skill'){
   a.announce(name,'ชาร์จพลังธาตุ แล้วฟัน 3 ครั้ง');
   await a.charge(420,'water');
   const running=a.rush(1380,'slash');
   for(const [delay,damage] of [[430,55],[235,70],[240,85]]){
    await a.wait(delay);a.hit(damage,'slash');
   }
   await running;
  }else if(kind==='ultimate'){
   a.announce(name,'ปลดปล่อยคมดาบ · 4 HIT');
   await a.cinematic('ASTRAL REND','LIMIT BREAK · SWORD ART',850);
   const running=a.rush(1740,'slash');
   for(const [delay,damage] of [[565,65],[220,70],[210,85],[245,240]]){
    await a.wait(delay);a.hit(damage,'slash',damage===240);
   }
   await running;
  }
 };
 AdvengerClassAnimations.register('saber',{
  basic:a=>perform(a,'basic'),
  skill:a=>perform(a,'skill'),
  ultimate:a=>perform(a,'ultimate')
 });
})();
