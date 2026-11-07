/* AdvengerSAGA v0.9 — runnable without npm dependencies.
   node --test tests/battle-core.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const sandbox={};
sandbox.window=sandbox;
vm.createContext(sandbox);
function load(filename){
 const source=fs.readFileSync(path.join(root,filename),'utf8');
 new vm.Script(source,{filename}).runInContext(sandbox);
}
load('js/encounter-catalog.js');
load('js/battle-core.js');
const C=sandbox.AdvengerBattleCore, E=sandbox.AdvengerEncounters;
const make=encounter=>({
 encounterId:encounter,round:1,phase:'player',party:['saber','mage','tank','gunner'],
 hp:{saber:1000,mage:800,tank:1500,gunner:900},
 guarded:{saber:false,mage:false,tank:false,gunner:false},
 acted:{saber:true,mage:true,tank:true,gunner:true},enemies:C.spawn(encounter),targetId:'foe-0'
});
test('the catalog creates independent 1-target, 3-target and boss encounters',()=>{
 assert.equal(C.spawn('training').length,1);
 assert.equal(C.spawn('skirmish').length,3);
 const boss=C.spawn('boss');
 assert.equal(boss.length,3);
 assert.equal(boss.filter(x=>x.boss).length,1);
 boss[0].hp=0;
 assert.equal(C.spawn('boss')[0].hp,1100,'new encounter must not reuse mutable enemy health');
});
test('damage is bounded by HP and selection skips KO targets',()=>{
 const s=make('skirmish');
 assert.equal(C.hitEnemy(s,'foe-0',200,1.25),250);
 assert.equal(s.enemies[0].hp,1050);
 assert.equal(C.hitEnemy(s,'foe-0',50000),1050);
 assert.equal(C.hitEnemy(s,'foe-0',55),0);
 assert.equal(C.select(s,'foe-0'),'foe-1');
 assert.equal(C.select(s,'not-an-enemy'),'foe-1');
 assert.equal(C.hitEnemy(s,'foe-1',NaN),0);
 assert.equal(C.hitEnemy(s,'foe-1',-900),0);
});
test('guard reduces damage, enemy rounds target living heroes',()=>{
 const s=make('boss');
 s.guarded.saber=true;
 const m=C.strike(s,s.enemies[0],0);
 assert.equal(m.heroId,'saber');assert.equal(m.damage,75);
 assert.equal(C.applyStrike(s,m),75);
 assert.equal(s.hp.saber,925);
 s.hp.saber=0;
 assert.equal(C.strike(s,s.enemies[1],1).heroId,'tank');
});
test('restore cannot replace enemy definitions or exceed configured HP',()=>{
 const s=make('boss');
 const altered=[{...s.enemies[0],hp:999999,maxHP:999999,name:'Injected'},
  {...s.enemies[1],hp:-200},{id:'foe-2',kind:'unknown',hp:0}];
 const restored=C.restore(altered,'boss');
 assert.equal(restored[0].hp,1100);
 assert.equal(restored[0].name,'Arcane Wisp');
 assert.equal(restored[1].hp,0);
 assert.equal(restored[2].hp,1300);
});
test('win, loss and next round reset are deterministic',()=>{
 const s=make('training');
 assert.equal(C.outcome(s),null);
 C.hitEnemy(s,'foe-0',5000);
 assert.equal(C.outcome(s),'victory');
 const loss=make('boss');
 for(const id of loss.party)loss.hp[id]=0;
 assert.equal(C.outcome(loss),'defeat');
 const round=make('training');round.round=3;
 C.nextRound(round);
 assert.equal(round.round,4);assert.equal(round.phase,'player');
 assert.deepEqual(Object.values(round.acted),[false,false,false,false]);
 assert.deepEqual(Object.values(round.guarded),[false,false,false,false]);
 assert.equal(round.active,'saber');
});
test('approved class animation presets and Tanjiro skill overrides load together',async()=>{
 load('classes/catalog.js');
 load('js/class-animation-registry.js');
 for(const role of ['saber','mage','tank','gunner'])load('classes/'+role+'/animations.js');
 load('js/character-registry.js');
 load('characters/tanjiro/skills/basic.js');
 load('characters/tanjiro/skills/skill.js');
 load('characters/tanjiro/skills/ultimate.js');
 load('characters/tanjiro/character.js');
 const tanjiro=sandbox.AdvengerCharacters.get('tanjiro');
 assert.equal(tanjiro.classId,'saber');
 const hits=[];
 const a={announce(){},rune(){},shield(){},lock(){},beam(){},
  rush:()=>Promise.resolve(),strafe:()=>Promise.resolve(),wait:async()=>{},
  charge:async()=>{},cinematic:async()=>{},projectile:async()=>{},
  meteor:async()=>{},aim:async()=>{},hit:n=>hits.push(n)};
 await tanjiro.perform(a,'basic');assert.deepEqual(hits.splice(0),[110]);
 await tanjiro.perform(a,'skill');assert.deepEqual(hits.splice(0),[70,95,130]);
 await tanjiro.perform(a,'ultimate');assert.deepEqual(hits.splice(0),[90,110,140,260]);
});
test('one registered character module can also be assigned to the enemy or boss team',()=>{
 const enemies=E.instantiate([{characterId:'tanjiro',attack:180,boss:true}]);
 assert.equal(enemies.length,1);
 assert.equal(enemies[0].characterId,'tanjiro');
 assert.equal(enemies[0].maxHP,1100);
 assert.equal(enemies[0].attack,180);
 assert.equal(enemies[0].boss,true);
 assert.match(enemies[0].art,/characters\/tanjiro\/assets\//);
 assert.throws(()=>E.instantiate([]));
 assert.throws(()=>E.instantiate(['scout','scout','scout','scout']));
});
test('browser entrypoint loads core in order and all referenced modules exist',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const srcs=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 for(const src of srcs)assert.ok(fs.existsSync(path.join(root,src)),src);
 assert.ok(srcs.indexOf('js/encounter-catalog.js')<srcs.indexOf('js/battle-core.js'));
 assert.ok(srcs.indexOf('js/battle-core.js')<srcs.indexOf('js/character-loader.js'));
 for(const filename of ['js/app.js','js/shared-arena.js','js/character-loader.js','js/team-effects.js'])
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,filename),'utf8')),{filename});
});
