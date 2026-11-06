/* Individual character: Tank — shield protection, heavy bash and earthquake. */
AdvengerCharacters.register({
 id:'tank',maxHP:1500,name:'Tank',nameTh:'ผู้พิทักษ์',role:'Tank',icon:'🛡️',
 accent:'#f1c68c',art:'characters/tank/art.svg',fallback:'characters/tank/art.svg',
 skills:{basic:'Shield Bash',skill:'Bulwark Reversal',ultimate:'Aegis Fall'},
 colors:[['earth','ดิน','#d9b68b'],['metal','โลหะ','#cedbef'],['wind','ลม','#86ebc3'],['lightning','สายฟ้า','#f7df8c'],['void','มืด','#bd95ff']],
 defaultElement:'earth',maxEnergy:100,
 async perform(a,kind){
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
 }
});