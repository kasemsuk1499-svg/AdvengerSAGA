/* node --test tests/initiative.test.cjs
 * Speed-based interleaved ally/enemy turn rules and save recovery.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const g={};g.window=g;vm.createContext(g);
const load=file=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(g);
load('classes/catalog.js');
load('js/class-animation-registry.js');
for(const cls of ['saber','mage','tank','gunner'])load('classes/'+cls+'/animations.js');
load('js/stat-db.js');load('js/character-registry.js');
for(const cls of ['saber','mage','tank','gunner'])load('characters/'+cls+'/character.js');
load('js/encounter-catalog.js');load('js/battle-core.js');
load('js/turn-rules.js');load('js/initiative.js');
const S=g.AdvengerStatDB,I=g.AdvengerInitiative,C=g.AdvengerBattleCore,R=g.AdvengerTurnRules;
const party=['saber','mage','tank','gunner'];
const make=(encounter='training')=>{
 const s={party:party.slice(),hp:R.maxHP(party),guarded:R.counters(party),
  acted:R.counters(party),round:1,phase:'player',
  enemies:C.spawn(encounter),targetId:'foe-0',active:'saber'};
 I.begin(s);
 return s;
};
const keys=s=>Array.from(I.order(s),e=>I.token(e));
test('class SPD uses approved presets without changing old combat attack values',()=>{
 a.equal(S.forCharacter('gunner').SPD,120);
 a.equal(S.forCharacter('saber').SPD,110);
 a.equal(S.forCharacter('mage').SPD,100);
 a.equal(S.forCharacter('tank').SPD,75);
 a.equal(S.forCharacter('saber').P_ATK,230,'legacy ATK stays the same');
 a.equal(S.forCharacter('mage').MAX_HP,800);
});
test('training SPD order interleaves enemy between two heroes',()=>{
 const s=make();
 a.deepEqual(keys(s),[
  'ally:gunner','ally:saber','ally:mage','enemy:foe-0','ally:tank'
 ]);
 a.equal(s.active,'gunner');a.equal(s.phase,'player');
 a.equal(s.enemies[0].stats.SPD,95);
});
test('three-enemy SPD order includes fast and slow enemy units',()=>{
 const s=make('skirmish');
 a.deepEqual(keys(s),[
  'enemy:foe-0','ally:gunner','enemy:foe-2','ally:saber',
  'ally:mage','ally:tank','enemy:foe-1'
 ]);
 a.equal(s.phase,'enemy');a.equal(I.current(s).id,'foe-0');
});
test('equal SPD ties: allies first, then formation slot, then enemy slot',()=>{
 const s=make('skirmish');
 s.party=['mage','saber','gunner','tank'];
 for(const id of s.party)if(!s.hp[id])s.hp[id]=R.hpMax(id);
 s.enemies=C.spawn('skirmish');
 for(const enemy of s.enemies)
  enemy.stats=S.create({maxHP:enemy.maxHP,stats:{SPD:100}});
 s.initiativeOrder=I.order(s);s.initiativeDone=[];
 const ties=Array.from(s.initiativeOrder.filter(x=>x.spd===100),I.token);
 a.deepEqual(ties,[
  'ally:mage','enemy:foe-0','enemy:foe-1','enemy:foe-2'
 ]);
});
test('one action per actor, fast allies do not receive extra actions',()=>{
 const s=make();const visited=[];
 while(I.current(s)){
  const actor=I.current(s);visited.push(I.token(actor));
  a.equal(I.complete(s,actor.side,actor.id),true);
  a.equal(I.complete(s,actor.side,actor.id),false);
  I.sync(s);
 }
 a.deepEqual(visited,[
  'ally:gunner','ally:saber','ally:mage','enemy:foe-0','ally:tank'
 ]);
 a.equal(s.acted.gunner,true);a.equal(s.acted.tank,true);
 C.nextRound(s);I.begin(s);
 a.equal(s.round,2);
 a.equal(I.current(s).id,'gunner');
 a.equal(s.acted.gunner,false);
});
test('defeated enemies and allies are skipped automatically',()=>{
 const s=make('skirmish');
 s.hp.gunner=0;s.enemies[0].hp=0;
 I.begin(s);
 a.equal(I.current(s).id,'foe-2');
 a.ok(!I.order(s).some(x=>x.spd===-1));
 a.equal(I.current(s).side,'enemy');
});
test('reloading a version-4 save keeps exact remaining action slots',()=>{
 const s=make('skirmish');
 I.complete(s,'enemy','foe-0');I.sync(s);
 I.complete(s,'ally','gunner');I.sync(s);
 const snap=JSON.parse(JSON.stringify({...s,battleVersion:4}));
 const resumed=make('skirmish');
 I.restore(resumed,snap);
 a.equal(I.current(resumed).id,'foe-2');
 a.equal(resumed.phase,'enemy');
 a.equal(resumed.acted.gunner,true);
 a.equal(resumed.initiativeDone.length,2);
});
test('migrating previous player-phase saves preserves already used heroes',()=>{
 const s=make('training');s.acted.gunner=true;s.acted.saber=true;
 const entry=I.restore(s,{battleVersion:3,phase:'player'});
 a.equal(entry.id,'mage');
 a.ok(s.initiativeDone.includes('ally:saber'));
 a.ok(s.initiativeDone.includes('ally:gunner'));
});
test('migrating previous enemy-phase saves does not double-attack earlier enemies',()=>{
 const s=make('boss');
 const next=I.restore(s,{battleVersion:3,phase:'enemy',enemyCursor:1});
 a.equal(next.side,'enemy');
 a.ok(s.initiativeDone.includes('enemy:foe-0'));
 a.equal(s.initiativeDone.filter(x=>x.startsWith('ally:')).length,4);
 a.equal(next.id,'foe-2','completed enemy-0 is not repeated');
});
test('bosses use custom SPD overrides; KO and guard remain part of shared battle rules',()=>{
 const s=make();
 const boss=g.AdvengerEncounters.instantiate([{kind:'overlord',stats:{SPD:180}}])[0];
 s.enemies=[boss];I.begin(s);
 a.equal(I.current(s).id,'foe-0');
 a.equal(boss.stats.SPD,180);
 s.guarded.saber=true;
 const move=C.strike(s,boss,0);
 a.equal(move.guarded,true);a.equal(move.damage,148);
});
test('browser loads the initiative module before app.js and locks free character selection',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(scripts.indexOf('js/initiative.js')>scripts.indexOf('js/stat-db.js'));
 a.ok(scripts.indexOf('js/initiative.js')<scripts.indexOf('js/character-loader.js'));
 const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
 a.match(app,/runInitiative/);a.match(app,/INIT\.complete/);
 a.match(app,/INIT\.order/);
 a.doesNotThrow(()=>new vm.Script(app));
 const arena=fs.readFileSync(path.join(root,'js/shared-arena.js'),'utf8');
 a.match(arena,/id!==activeId/);
});
