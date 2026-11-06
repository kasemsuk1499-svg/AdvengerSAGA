/* Individual character: Mage — independent ranged and summoning animations. */
AdvengerCharacters.register({
 id:'mage',classId:'mage',maxHP:800,name:'Mage',nameTh:'นักเวท',role:'Mage',icon:'🪄',
 accent:'#c0a6ff',art:'characters/mage/art.svg',fallback:'characters/mage/art.svg',
 skills:{basic:'Arcane Bolt',skill:'Rune Cascade',ultimate:'Astral Collapse'},
 colors:[['arcane','เวท','#ba9cff'],['fire','ไฟ','#ff9e70'],['frost','น้ำแข็ง','#8de8ff'],['storm','พายุ','#f4da86'],['nature','ธรรมชาติ','#76e6b5']],
 defaultElement:'arcane',maxEnergy:100,
 async perform(a,kind){
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
 }
});