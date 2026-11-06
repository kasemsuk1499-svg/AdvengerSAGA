/* Individual character: Gunner — ranged dual-pistol shooting, never melee. */
AdvengerCharacters.register({
 id:'gunner',maxHP:900,name:'Gunner',nameTh:'มือปืน',role:'Gunner',icon:'🔫',
 accent:'#7ddfeb',art:'characters/gunner/art.svg',fallback:'characters/gunner/art.svg',
 skills:{basic:'Precision Shot',skill:'Rapid Crossfire',ultimate:'Zero Horizon'},
 colors:[['kinetic','พลังงาน','#7ceaff'],['fire','ไฟ','#ff9e70'],['lightning','สายฟ้า','#fae68d'],['ice','น้ำแข็ง','#a6e6ff'],['void','มืด','#c6a0ff']],
 defaultElement:'kinetic',maxEnergy:100,
 async perform(a,kind){
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
 }
});