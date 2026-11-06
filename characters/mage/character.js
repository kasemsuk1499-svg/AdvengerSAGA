/* Individual character: Mage — independent ranged and summoning animations. */
AdvengerCharacters.register({
 id:'mage',classId:'mage',maxHP:800,name:'Mage',nameTh:'นักเวท',role:'Mage',icon:'🪄',
 accent:'#c0a6ff',art:'characters/mage/art.svg',fallback:'characters/mage/art.svg',
 skills:{basic:'Arcane Bolt',skill:'Rune Cascade',ultimate:'Astral Collapse'},
 colors:[['arcane','เวท','#ba9cff'],['fire','ไฟ','#ff9e70'],['frost','น้ำแข็ง','#8de8ff'],['storm','พายุ','#f4da86'],['nature','ธรรมชาติ','#76e6b5']],
 defaultElement:'arcane',maxEnergy:100
});
