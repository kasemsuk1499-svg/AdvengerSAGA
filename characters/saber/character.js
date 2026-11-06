/* Individual character: Saber. All future skill-code updates belong in this folder. */
AdvengerCharacters.register({
 id:'saber',maxHP:1000,name:'Saber',nameTh:'นักดาบ',role:'Saber',icon:'⚔️',
 accent:'#79d8ff',art:'characters/saber/art.svg',fallback:'characters/saber/art.svg',
 // When a transparent PNG is ready, put it in this folder and change art to:
 // art:'characters/saber/sprite.png'
 skills:{basic:'Quick Slash',skill:'Elemental Triple',ultimate:'Astral Rend'},
 colors:[['water','น้ำ','#64c8ff'],['fire','ไฟ','#ff9866'],['wind','ลม','#7bf1c3'],['lightning','สายฟ้า','#fce58b'],['void','มืด','#bf92ff']],
 defaultElement:'water',maxEnergy:100,
 async perform(a,kind){
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
 }
});