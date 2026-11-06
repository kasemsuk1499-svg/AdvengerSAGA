/* Tanjiro exclusive Saber Skill — Fire / Hinokami Flash.
   Three distinct strikes, with optimized shared effects (no second render loop).
   70 + 95 + 130 = 295 base damage. */
(function(){
 'use strict';
 const kit=(window.AdvengerCharacterSkills ||= {})['tanjiro'] ||= {};
 kit.skill=async function(a){
  a.announce('HINOKAMI FLASH','ชาร์จพลังเปลวเพลิงแล้วฟันคอมโบ 3 จังหวะ');
  await a.charge(350);
  a.rune(820);
  const dash=a.rush(1350,'slash');
  await a.wait(430);a.hit(70,'slash');
  await a.wait(240);a.hit(95,'slash');
  await a.wait(270);a.hit(130,'slash',true);
  await dash;
 };
})();