/* Tanjiro exclusive Saber Ultimate — Fire / Hinokami Kagura.
   Cinematic + rush + four fire strikes, 90 + 110 + 140 + 260 = 600 damage.
   Uses the shared, performance-optimized battle effects. */
(function(){
 'use strict';
 const kit=(window.AdvengerCharacterSkills ||= {})['tanjiro'] ||= {};
 kit.ultimate=async function(a){
  a.announce('HINOKAMI KAGURA','ระบำเทพเพลิง · ต่อเนื่อง 4 จังหวะ');
  await a.cinematic('HINOKAMI KAGURA','ULTIMATE · DANCE OF FLAMES',950);
  await a.charge(390);
  a.rune(1420);
  const dash=a.rush(1850,'slash');
  await a.wait(570);a.hit(90,'slash');
  await a.wait(250);a.hit(110,'slash');
  await a.wait(260);a.hit(140,'slash');
  await a.wait(310);a.hit(260,'slash',true);
  await dash;
 };
})();