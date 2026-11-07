/* node --test tests/life-engine.test.cjs
 * KO, Auto Revive, Guts, Immortality, Soul Death, manual revive, enemy boss
 * and multi-hit sequential effects with pre/post-life-game state checks.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const g={};g.window=g;vm.createContext(g);
const load=file=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(g);
[
 'classes/catalog.js','js/class-animation-registry.js','js/elements.js','js/animation-catalog.js',
 'classes/saber/animations.js','classes/mage/animations.js',
 'classes/tank/animations.js','classes/gunner/animations.js',
 'js/stat-db.js','js/character-registry.js',
 'characters/saber/character.js','characters/mage/character.js',
 'characters/tank/character.js','characters/gunner/character.js',
 'js/encounter-catalog.js','js/battle-core.js','js/turn-rules.js',
 'js/initiative.js','js/skill-db.js','js/status-db.js',
 'js/status-engine.js','js/life-db.js','js/life-engine.js','js/skill-engine.js'
].forEach(load);
const LIFE=g.AdvengerLifeEngine,S=g.AdvengerSkillEngine,
 STATUS=g.AdvengerStatusEngine,DB=g.AdvengerSkillDB,
 CORE=g.AdvengerBattleCore,INIT=g.AdvengerInitiative,STATS=g.AdvengerStatDB;
function fresh(enc='training'){
 const party=['saber','mage','tank','gunner'];
 const s={round:1,party,phase:'player',
  enemies:CORE.spawn(enc),active:'saber',targetId:'foe-0',
  hp:Object.fromEntries(party.map(id=>[id,STATS.forCharacter(id).MAX_HP])),
  energy:Object.fromEntries(party.map(id=>[id,100])),
  acted:Object.fromEntries(party.map(id=>[id,false])),
  guarded:Object.fromEntries(party.map(id=>[id,false])),
  skillKits:{}};
 S.clear(s);LIFE.reset(s);INIT.begin(s);return s;
}
test('death/revival library catalog lists nine reusable effects',()=>{
 const all=g.AdvengerLifeDB.all();
 a.equal(all.length,9);
 for(const name of ['death','deathImmunity','soulDeath','revive',
  'autoRevive','guts','immortality','execute','damageImmunity'])
  a.ok(g.AdvengerLifeDB.get(name)?.nameTh);
});
test('Guts prevents exactly one lethal hit, maintaining 1 HP',()=>{
 const s=fresh();
 a.equal(LIFE.grant(s,'ally','gunner',{type:'guts',uses:1}),true);
 a.equal(CORE.hitEnemy(s,'foe-0',0),0);
 a.equal(LIFE.hit(s,'ally','gunner',100000),900);
 a.equal(s.hp.gunner,1);
 a.equal(LIFE.stateOf(s,'ally','gunner').pending.guts.uses,0);
 LIFE.hit(s,'ally','gunner',100000);
 a.equal(s.hp.gunner,0);
 a.equal(LIFE.drain(s).filter(e=>e.type==='guts').length,1);
});
test('auto revive restores chosen fraction and does not reset a used SPD action',()=>{
 const s=fresh();
 a.equal(LIFE.grant(s,'ally','saber',{type:'autoRevive',uses:1,hpPct:.6}),true);
 INIT.complete(s,'ally','gunner');INIT.sync(s);
 INIT.complete(s,'ally','saber');INIT.sync(s);
 LIFE.hit(s,'ally','saber',99999);
 a.equal(s.hp.saber,Math.round(STATS.forCharacter('saber').MAX_HP*.6));
 a.equal(s.acted.saber,true);
 a.equal(INIT.current(s).id,'mage');
 LIFE.hit(s,'ally','saber',99999);
 a.equal(s.hp.saber,0);
});
test('Soul Death blocks Revive/Immortality but does not cancel Guts prevention',()=>{
 const s=fresh();
 LIFE.grant(s,'ally','mage',{type:'autoRevive',hpPct:.8,uses:1});
 STATUS.apply(s,'ally','mage',{key:'soulDeath',turns:3,chance:1,ignoreResistance:true},'foe-0');
 LIFE.hit(s,'ally','mage',99999);
 a.equal(s.hp.mage,0);
 a.equal(LIFE.revive(s,'ally','mage',{hpPct:1}),false);
 a.equal(STATUS.cleanse(s,'ally','mage',1),1);
 a.equal(LIFE.revive(s,'ally','mage',{hpPct:.4}),true);
 a.equal(s.hp.mage,Math.round(STATS.forCharacter('mage').MAX_HP*.4));
 LIFE.grant(s,'ally','mage',{type:'guts'});
 STATUS.apply(s,'ally','mage',{key:'soulDeath',turns:3,chance:1,ignoreResistance:true},'foe-0');
 LIFE.hit(s,'ally','mage',99999);
 a.equal(s.hp.mage,1,'Guts blocks KO without reviving and survives Soul Death');
});
test('Kris Immortality restores 1 HP, ignores damage, cannot heal and expires to KO',()=>{
 const s=fresh();s.skillKits.saber='kris';
 const first=LIFE.hit(s,'ally','saber',99999);
 a.ok(first>0);a.equal(s.hp.saber,1);
 a.equal(LIFE.inspect(s,'ally','saber').immortalityTurns,2);
 a.equal(LIFE.hit(s,'ally','saber',123),0);
 a.equal(LIFE.heal(s,'ally','saber',100),0);
 LIFE.finishRound(s);a.equal(s.hp.saber,1);
 s.round=2;LIFE.finishRound(s);a.equal(s.hp.saber,1);
 s.round=3;LIFE.finishRound(s);a.equal(s.hp.saber,0);
 a.equal(LIFE.inspect(s,'ally','saber').immortalityTurns,0);
 a.equal(LIFE.onLethal(s,'ally','saber'),false,'passive once only');
});
test('Rachel passive still revives once on ordinary CORE.applyStrike',()=>{
 const s=fresh();s.skillKits.saber='rachel';
 s.enemies[0].attack=999999;
 const move=CORE.strike(s,s.enemies[0],0);
 a.equal(move.heroId,'saber');
 CORE.applyStrike(s,move);
 a.ok(s.hp.saber>0);
 a.equal(s.skillUsed.saber,true);
 LIFE.hit(s,'ally','saber',99999);
 a.equal(s.hp.saber,0);
});
test('Rosie Holy Prayer revives two KO allies at 40% HP without granting extra actions',()=>{
 const s=fresh();s.skillKits.mage='rosie';
 s.hp.saber=0;s.hp.gunner=0;
 s.acted.saber=true;
 const report=S.cast(s,'mage','skill2','foe-0');
 a.equal(report.ok,true);
 const revived=report.events.filter(e=>e.kind==='revive');
 a.equal(revived.length,2);
 a.equal(s.hp.saber,Math.round(STATS.forCharacter('saber').MAX_HP*.4));
 a.equal(s.hp.gunner,Math.round(STATS.forCharacter('gunner').MAX_HP*.4));
 a.equal(s.acted.saber,true);
 a.ok(report.events.some(e=>e.kind==='reduceBuffDuration'));
});
test('Death debuff reapplication KOs target but can be countered by auto-revive',()=>{
 const s=fresh();s.skillKits.saber='rachel';
 STATUS.apply(s,'ally','saber',{key:'death',chance:1,turns:3},'foe-0');
 STATUS.apply(s,'ally','saber',{key:'death',chance:1,turns:3},'foe-0');
 a.equal(s.hp.saber,Math.round(STATS.forCharacter('saber').MAX_HP*.8));
 a.equal(s.skillUsed.saber,true);
 a.equal(STATUS.has(s,'ally','saber','death'),false);
 STATUS.apply(s,'ally','saber',{key:'death',chance:1,turns:1},'foe-0');
 S.advanceRound(s);a.equal(s.hp.saber,0);
});
test('Death immunity prevents Death, and damage immunity blocks direct hits',()=>{
 const s=fresh();
 STATUS.apply(s,'ally','tank',{key:'deathImmunity',turns:3,chance:1},'tank');
 a.equal(STATUS.apply(s,'ally','tank',{key:'death',turns:3,chance:1},'foe-0'),false);
 STATUS.apply(s,'ally','tank',{key:'damageImmunity',turns:3,chance:1},'tank');
 a.equal(LIFE.hit(s,'ally','tank',10000),0);
 a.equal(s.hp.tank,STATS.forCharacter('tank').MAX_HP);
});
test('KO bosses use custom passive Immortality and victory is delayed',()=>{
 const s=fresh();
 s.enemies=g.AdvengerEncounters.instantiate([{kind:'overlord',
  life:{type:'immortality',turns:1}}]);
 const foe=s.enemies[0];
 CORE.hitEnemy(s,foe.id,100000);
 a.equal(foe.hp,1);a.equal(CORE.outcome(s),null);
 LIFE.finishRound(s);
 s.round=2;LIFE.finishRound(s);
 a.equal(foe.hp,0);a.equal(CORE.outcome(s),'victory');
});
test('Guts, Immortality and revival state persist across saved battle',()=>{
 const s=fresh();LIFE.grant(s,'ally','tank',{type:'guts',uses:1});
 LIFE.grant(s,'ally','mage',{type:'immortality',turns:2,uses:1});
 LIFE.hit(s,'ally','mage',99999);
 const raw=JSON.parse(JSON.stringify(s.lifeRuntime));
 const other=fresh();other.hp.mage=1;other.round=1;
 LIFE.restore(other,raw);
 a.equal(LIFE.inspect(other,'ally','tank').pending.guts.uses,1);
 a.equal(LIFE.inspect(other,'ally','mage').immortalityTurns,2);
});
test('Execution obeys threshold and allows Guts to prevent death',()=>{
 const s=fresh();const foe=s.enemies[0];
 a.equal(LIFE.execute(s,'enemy',foe.id),true);
 a.equal(foe.hp,0);
 const s2=fresh();LIFE.grant(s2,'ally','tank',{type:'guts'});
 a.equal(LIFE.execute(s2,'ally','tank'),false);
 a.equal(s2.hp.tank,1);
});
test('app entrypoint loads Life Engine before skill runtime and has Life Lab',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const paths=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(paths.indexOf('js/life-engine.js')>paths.indexOf('js/status-engine.js'));
 a.ok(paths.indexOf('js/life-engine.js')<paths.indexOf('js/skill-engine.js'));
 for(const id of ['lifeDemoTarget','lifeDemoInfo','lifePanel'])
  a.ok(html.includes('id="'+id+'"'),id);
 for(const file of ['js/app.js','js/life-engine.js','js/skill-engine.js'])
  a.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8')));
});
