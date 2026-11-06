/* Individual character: Tank — shield protection, heavy bash and earthquake. */
AdvengerCharacters.register({
 id:'tank',classId:'tank',maxHP:1500,name:'Tank',nameTh:'ผู้พิทักษ์',role:'Tank',icon:'🛡️',
 accent:'#f1c68c',art:'characters/tank/art.svg',fallback:'characters/tank/art.svg',
 skills:{basic:'Shield Bash',skill:'Bulwark Reversal',ultimate:'Aegis Fall'},
 colors:[['earth','ดิน','#d9b68b'],['metal','โลหะ','#cedbef'],['wind','ลม','#86ebc3'],['lightning','สายฟ้า','#f7df8c'],['void','มืด','#bd95ff']],
 defaultElement:'earth',maxEnergy:100
});
