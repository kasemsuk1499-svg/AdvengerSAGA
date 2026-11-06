/* Individual character: Gunner — ranged dual-pistol shooting, never melee. */
AdvengerCharacters.register({
 id:'gunner',classId:'gunner',maxHP:900,name:'Gunner',nameTh:'มือปืน',role:'Gunner',icon:'🔫',
 accent:'#7ddfeb',art:'characters/gunner/art.svg',fallback:'characters/gunner/art.svg',
 skills:{basic:'Precision Shot',skill:'Rapid Crossfire',ultimate:'Zero Horizon'},
 colors:[['kinetic','พลังงาน','#7ceaff'],['fire','ไฟ','#ff9e70'],['lightning','สายฟ้า','#fae68d'],['ice','น้ำแข็ง','#a6e6ff'],['void','มืด','#c6a0ff']],
 defaultElement:'kinetic',maxEnergy:100
});
