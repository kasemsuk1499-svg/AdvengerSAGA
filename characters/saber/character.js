/* Individual character: Saber. All future skill-code updates belong in this folder. */
AdvengerCharacters.register({
 id:'saber',classId:'saber',maxHP:1000,name:'Saber',nameTh:'นักดาบ',role:'Saber',icon:'⚔️',
 accent:'#79d8ff',art:'characters/saber/art.svg',fallback:'characters/saber/art.svg',
 // When a transparent PNG is ready, put it in this folder and change art to:
 // art:'characters/saber/sprite.png'
 skills:{basic:'Quick Slash',skill:'Elemental Triple',ultimate:'Astral Rend'},
 colors:[['water','น้ำ','#64c8ff'],['fire','ไฟ','#ff9866'],['wind','ลม','#7bf1c3'],['lightning','สายฟ้า','#fce58b'],['void','มืด','#bf92ff']],
 defaultElement:'water',maxEnergy:100
});
