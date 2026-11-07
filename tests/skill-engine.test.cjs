/* node --test tests/skill-engine.test.cjs */
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const g={};g.window=g;
g.AdvengerCharacters={get:id=>{
 const d={saber:[1000,200,100],mage:[800,150,200],tank:[1500,130,250],
  gunner:[900,230,120],tanjiro:[1100,240,130]}[id];
 return d?{maxHP:d[0],attack:d[1],defense:d[2]}:null;
}};
vm.createContext(g);
const load=file=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(g);
['js/encounter-catalog.js','js/battle-core.js','js/turn-rules.js','js/skill-db.js',
 'js/status-db.js','js/status-engine.js','js/skill-engine.js'].forEach(load);
const DB=g.AdvengerSkillDB,S=g.AdvengerSkillEngine,C=g.AdvengerBattleCore;
function fresh(){const s={party:['saber','mage','tank','gunner'],round:1,
 enemies:C.spawn('skirmish'),hp:{saber:1000,mage:800,tank:1500,gunner:900},
 skillKits:{saber:'rachel',mage:'lucy',tank:null,gunner:'ellen'}};return S.clear(s)}
test('sourced starter catalog and seconds conversion',()=>{
 a.equal(DB.all().length,5);a.equal(DB.get('rachel').skills.skill1.cooldownSeconds,84);
 a.equal(DB.rounds(84),3);a.equal(DB.rounds(95),4);
 a.ok(DB.get('lucy').source.includes('gamewith.net'));a.throws(()=>DB.register(DB.get('rachel')));
});
test('Rachel hits twice and observes cooldown',()=>{
 const s=fresh(),r=S.cast(s,'saber','skill1','foe-0');
 a.equal(r.ok,true);a.equal(r.events.filter(e=>e.kind==='damage').length,2);
 const damage=r.events.filter(e=>e.kind==='damage').reduce((n,e)=>n+e.amount,0);
 a.equal(s.enemies[0].hp,1300-damage);a.ok(damage>=408);
 a.equal(S.remaining(s,'saber','skill1'),3);
 s.round=4;a.equal(S.ready(s,'saber','skill1'),true);
});
test('Phoenix Strike applies 3-enemy damage and physical vulnerabilities',()=>{
 const s=fresh(),r=S.cast(s,'saber','skill2','foe-0');
 a.equal(r.targets.length,3);
 for(const foe of s.enemies){a.ok(foe.hp<foe.maxHP);a.match(S.statusText(s,'enemy',foe.id),/DEF↓/)}
 a.ok(S.adjustDamage(s,'ally','tank','enemy','foe-0',100)>100);
});
test('Lucy heals, removes debuffs and grants defense',()=>{
 const s=fresh();s.hp.saber=650;s.hp.gunner=880;
 a.equal(S.cast(s,'mage','skill1','foe-0').ok,true);
 a.equal(s.hp.saber,850);a.equal(s.hp.gunner,900);
 a.equal(S.ready(s,'mage','skill2'),false);
 S.addStatus(s,'ally','saber',{key:'attackDown',power:.2,turns:3},'gunner');
 a.equal(S.cast(s,'mage','skill2','foe-0').ok,true);
 a.ok(!S.statusText(s,'ally','saber').includes('ATK↓'));
 a.match(S.statusText(s,'ally','saber'),/DEF↑/);
});
test('Rachel passive revives once, Ellen blocks magic damage',()=>{
 const s=fresh();a.match(S.statusText(s,'ally','saber'),/โจมตีจุดอ่อน/);
 a.equal(S.adjustDamage(s,'enemy','foe-0','ally','gunner',200,'magic'),0);
 s.hp.saber=0;a.equal(S.onLethal(s,'saber'),true);a.equal(s.hp.saber,800);
 s.hp.saber=0;a.equal(S.onLethal(s,'saber'),false);
});
test('Burn ticks twice; saving and loading does not duplicate statuses',()=>{
 const s=fresh();S.addStatus(s,'enemy','foe-0',{key:'burn',power:.2,turns:2},'saber');
 S.cast(s,'saber','skill1','foe-1');
 const saved=JSON.parse(JSON.stringify(s));
 const reloaded=fresh();S.restore(reloaded,saved);
 a.equal(S.remaining(reloaded,'saber','skill1'),3);
 a.equal(reloaded.skillStatuses['ally/saber'].length,saved.skillStatuses['ally/saber'].length);
 const hp=reloaded.enemies[0].hp;
 S.advanceRound(reloaded);a.equal(reloaded.enemies[0].hp,hp-40);
 S.advanceRound(reloaded);a.equal(reloaded.enemies[0].hp,hp-80);
 S.advanceRound(reloaded);a.equal(reloaded.enemies[0].hp,hp-80);
});
test('database Basic is separate, Lucy renews poison immunity after using it',()=>{
 const s=fresh();for(const id of s.party)s.skillStatuses['ally/'+id]=[];
 const old=s.enemies[0].hp;
 const report=S.cast(s,'mage','basic','foe-0');
 a.equal(report.ok,true);a.ok(s.enemies[0].hp<old);
 for(const id of s.party)a.match(S.statusText(s,'ally',id),/กันพิษ/);
});
test('new saves have no reference kit until the player opts in',()=>{
 const s={party:['saber'],hp:{saber:1000},enemies:C.spawn('training'),round:1};
 S.clear(s);a.equal(Object.keys(s.skillKits).length,0);
 a.equal(S.ready(s,'saber','skill1'),false);
});
test('hero-neutral catalog accepts new data-only kits',()=>{
 DB.register({id:'custom-test',name:'Original Mage',skills:{
 basic:{name:'B',target:'singleEnemy',effects:[{type:'damage',attackPct:1}]},
 skill1:{name:'A',target:'allEnemies',effects:[{type:'damage',attackPct:.5}]},
 skill2:{name:'B',target:'self',effects:[{type:'status',key:'defenseUp',power:.2,turns:2}]},
 passive:{name:'P',triggers:[]}}});
 const s=fresh();s.skillKits.tank='custom-test';
 a.equal(S.cast(s,'tank','skill1','foe-0').targets.length,3);
});
test('entrypoint module order and syntax',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const names=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(names.indexOf('js/skill-engine.js')>names.indexOf('js/skill-db.js'));
 a.ok(names.indexOf('js/skill-engine.js')<names.indexOf('js/character-loader.js'));
 for(const id of ['dbHeroKit','dbSkillButtons','dbPassiveInfo','dbStatusInfo'])
  a.ok(html.includes('id="'+id+'"'));
 for(const file of ['js/app.js','js/shared-arena.js'])
  a.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}));
});
