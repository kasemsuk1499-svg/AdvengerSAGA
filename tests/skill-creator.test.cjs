/* node --test tests/skill-creator.test.cjs
 * Custom ordered skills: validation, local persistence, hero assignment,
 * multi-hit AOE, paralysis-per-hit, self-buff-after-attack, cooldown and EX.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function boot(storage=new Map()){
 const g={console,localStorage:{
  getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)
 }};
 g.window=g;vm.createContext(g);
 const load=p=>new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p}).runInContext(g);
 for(const p of [
  'classes/catalog.js','js/class-animation-registry.js','js/elements.js','js/animation-catalog.js',
  'classes/saber/animations.js','classes/mage/animations.js',
  'classes/tank/animations.js','classes/gunner/animations.js',
  'js/stat-db.js','js/character-registry.js',
  'characters/saber/character.js','characters/mage/character.js',
  'characters/tank/character.js','characters/gunner/character.js',
  'js/turn-rules.js','js/encounter-catalog.js','js/battle-core.js',
  'js/initiative.js','js/skill-db.js','js/status-db.js',
  'js/status-engine.js','js/life-db.js','js/life-engine.js',
  'js/skill-engine.js','js/hit-display.js','js/skill-creator.js'
 ])load(p);
 return {g,load,storage,C:g.AdvengerSkillCreator,S:g.AdvengerSkillEngine};
}
function setup(g){
 const party=['saber','mage','tank','gunner'];
 const enemies=g.AdvengerEncounters.instantiate([
  {kind:'sentinel',maxHP:4000},{kind:'scout',maxHP:4000},
  {kind:'guardian',maxHP:4000},{kind:'wisp',maxHP:4000}
 ]);
 const state={party,enemies,round:1,phase:'player',active:'saber',
  hp:Object.fromEntries(party.map(id=>[id,g.AdvengerStatDB.forCharacter(id).MAX_HP])),
  guarded:Object.fromEntries(party.map(id=>[id,false])),
  acted:Object.fromEntries(party.map(id=>[id,false])),
  skillKits:{},targetId:'foe-0'};
 g.AdvengerSkillEngine.clear(state);
 g.AdvengerLifeEngine.reset(state);
 g.AdvengerInitiative.begin(state);
 return state;
}
test('creator database starts empty, accepts only validated authored effect data',()=>{
 const {C}=boot();C.load();
 assert.equal(C.list().length,0);
 const draft=C.example();
 assert.equal(draft.effects[0].hits,4);
 assert.equal(draft.effects[1].key,'paralysis');
 assert.equal(draft.effects[1].eachHit,true);
 assert.equal(draft.effects[1].chance,null,'approved example has no invented paralysis rate');
 assert.throws(()=>C.add(draft),/โอกาส/);
 draft.effects[1].chance=.35;
 const record=C.add(draft);
 assert.equal(record.id,'created-1');
 assert.equal(record.effects[1].chance,.35);
 assert.equal(record.effects[2].power,.4);
 assert.equal(C.list().length,1);
 assert.throws(()=>C.add({...draft,effects:[{type:'javascript'}]}));
 assert.throws(()=>C.add({...draft,target:'allBosses'}));
 assert.throws(()=>C.add({...draft,name:' '}));
 assert.throws(()=>C.add({...draft,effects:[]}));
 assert.throws(()=>C.add({...draft,effects:[{type:'damage',hits:13}]}));
});
test('assigning one skill to several heroes and independent slots survives refresh',()=>{
 const storage=new Map();let b=boot(storage);b.C.load();
 const draft=b.C.example();draft.effects[1].chance=.75;
 const skill=b.C.add(draft);
 b.C.assign('saber','skill1',skill.id);
 b.C.assign('mage','ultimate',skill.id);
 assert.equal(b.C.equipped('saber','skill1').id,skill.id);
 assert.equal(b.C.equipped('mage','ultimate').id,skill.id);
 b=boot(storage);b.C.load();
 assert.equal(b.C.equipped('saber','skill1').id,skill.id);
 assert.equal(b.C.equipped('mage','ultimate').id,skill.id);
 b.C.assign('mage','ultimate',null);
 assert.equal(b.C.equipped('mage','ultimate'),null);
 const d=b.C.get(skill.id);d.name='Edited skill';
 b.C.update(skill.id,d);
 assert.equal(b.C.get(skill.id).name,'Edited skill');
 b.C.remove(skill.id);
 assert.equal(b.C.list().length,0);
 assert.equal(b.C.equipped('saber','skill1'),null);
});
test('import/export restore valid library atomically and reject corrupt/untrusted fields',()=>{
 const {C}=boot();C.load();const draft=C.example();
 draft.effects[1].chance=.25;
 const record=C.add(draft);
 C.assign('saber','basic',record.id);
 const backup=C.exportData();
 C.remove(record.id);
 C.importData(backup);
 assert.equal(C.list().length,1);
 assert.equal(C.equipped('saber','basic').id,record.id);
 assert.throws(()=>C.importData({...backup,skills:[{...record,
  effects:[{type:'eval',script:'alert(1)'}]}]}));
 assert.equal(C.list().length,1,'failed import must not replace working library');
 assert.throws(()=>C.assign('unknown-hero','skill1',record.id));
});
test('4 targets ×4 hits =16 hits; next effect checks each hit then self ATK buff',()=>{
 const {g,C,S}=boot();C.load();
 const raw=C.example();raw.effects[1].chance=1;
 const skill=C.add(raw);
 const state=setup(g);
 const hp=state.enemies.map(foe=>foe.hp);
 assert.equal(S.readyCreated(state,'saber',skill,'skill1'),true);
 const result=S.cast(state,'saber','skill1','foe-0',skill);
 assert.equal(result.ok,true);
 const attacks=result.events.filter(e=>e.kind==='damage');
 const paralysis=result.events.filter(e=>e.kind==='status'&&e.key==='paralysis');
 assert.equal(attacks.length,16);
 assert.equal(paralysis.length,16);
 assert.equal(result.targets.length,4);
 for(const foe of state.enemies){
  const hits=attacks.filter(e=>e.id===foe.id);
  assert.equal(hits.length,4);
  assert.equal(hp[state.enemies.indexOf(foe)]-foe.hp,4*230,
   'buff must not retroactively increase earlier hit damage');
  assert.equal(g.AdvengerStatusEngine.has(state,'enemy',foe.id,'paralysis'),true);
 }
 assert.equal(g.AdvengerStatusEngine.value(state,'ally','saber','attackUp'),.4);
 assert.equal(S.adjustDamage(state,'ally','saber','enemy','foe-0',100),140);
 assert.equal(S.readyCreated(state,'saber',skill,'skill1'),false);
 assert.equal(S.createdRemaining(state,'saber',skill.id),3);
 const saved=JSON.parse(JSON.stringify(state));
 const restored=setup(g);
 S.restore(restored,saved);
 assert.equal(S.createdRemaining(restored,'saber',skill.id),3);
 assert.equal(S.readyCreated(restored,'saber',skill,'skill1'),false);
 restored.round=4;
 assert.equal(S.readyCreated(restored,'saber',skill,'skill1'),true);
});
test('custom basic works under Silence, while created active and Ultimate are locked',()=>{
 const {g,C,S}=boot();C.load();
 const skill=C.add({
  name:'Simple',target:'singleEnemy',damageType:'magic',cooldownRounds:0,
  effects:[{type:'damage',attackPct:.75,hits:1}]
 });
 const state=setup(g);
 g.AdvengerStatusEngine.apply(state,'ally','saber',{
  key:'silence',turns:2,chance:1},'foe-0');
 assert.equal(S.readyCreated(state,'saber',skill,'basic'),true);
 assert.equal(S.readyCreated(state,'saber',skill,'skill1'),false);
 assert.equal(S.readyCreated(state,'saber',skill,'ultimate'),false);
});
test('loadout catalog can equip existing class and reference Seven Knights skills',()=>{
 const {C}=boot();C.load();
 const catalog=C.catalog();
 assert.equal(catalog.native.length,12);
 assert.equal(catalog.kit.length,15);
 assert.equal(catalog.custom.length,0);
 const orig=C.resolve('native:saber:skill');
 assert.equal(orig.kind,'native');
 assert.equal(orig.sourceHero,'saber');
 assert.equal(orig.sourceKind,'skill');
 assert.match(orig.name,/Elemental Triple/);
 const reference=C.resolve('kit:rachel:skill1');
 assert.equal(reference.kind,'database');
 assert.equal(reference.skill.cooldownRounds,3);
 assert.equal(reference.skill.effects[0].hits,2);
 C.assign('mage','basic',orig.id);
 C.assign('tank','skill2',reference.id);
 assert.equal(C.equippedSource('mage','basic').sourceHero,'saber');
 assert.equal(C.equippedSource('tank','skill2').skill.name,'Blazing Strike');
 assert.throws(()=>C.assign('saber','skill1','kit:fake:skill2'));
 assert.throws(()=>C.assign('saber','skill1','native:fake:ultimate'));
 C.assign('mage','basic',null);
 assert.equal(C.equippedSource('mage','basic'),null);
});
test('existing loadouts persist through JSON backup and reload with no created skills',()=>{
 const storage=new Map();let {C}=boot(storage);C.load();
 C.assign('saber','basic','native:mage:basic');
 C.assign('saber','skill1','kit:kris:skill1');
 const backup=C.exportData();
 assert.equal(backup.skills.length,0);
 C.importData(backup);
 assert.equal(C.equippedSource('saber','basic').sourceHero,'mage');
 let other=boot(storage);other.C.load();
 assert.equal(other.C.equippedSource('saber','skill1').sourceHero,'kris');
 other.C.assign('saber','skill1',null);
 assert.equal(other.C.equippedSource('saber','skill1'),null);
});
test('equipped Seven Knights active skill uses original effects and real per-skill cooldown',()=>{
 const {g,C,S}=boot();C.load();
 C.assign('saber','skill1','kit:kris:skill1');
 const source=C.equippedSource('saber','skill1');
 const state=setup(g);
 assert.equal(S.readyCreated(state,'saber',source.skill,'skill1'),true);
 const report=S.cast(state,'saber','skill1','foe-0',source.skill);
 assert.equal(report.ok,true);
 assert.ok(report.events.some(e=>e.kind==='damage'));
 assert.equal(S.createdRemaining(state,'saber',source.id),2);
 assert.equal(S.readyCreated(state,'saber',source.skill,'skill1'),false);
});
test('silence cannot be circumvented by placing an existing active kit in Basic',()=>{
 const {g,C,S}=boot();C.load();
 const reference=C.resolve('kit:kris:skill1').skill;
 const basic=C.resolve('kit:lucy:basic').skill;
 const state=setup(g);
 g.AdvengerStatusEngine.apply(state,'ally','saber',{
  key:'silence',chance:1,turns:2},'foe-0');
 assert.equal(S.readyCreated(state,'saber',reference,'basic'),false);
 assert.equal(S.readyCreated(state,'saber',basic,'basic'),true);
});
test('Overlimit opt-in lifts hit / multiplier / step / cooldown caps without weakening normal validation',()=>{
 const {C}=boot();C.load();
 const god=C.overlimitExample();
 assert.equal(god.overlimit,true);
 assert.equal(god.effects[0].hits,99999);
 const chosen=C.add(god);
 assert.equal(chosen.overlimit,true);
 assert.equal(chosen.effects[0].attackPct,1000);
 assert.equal(chosen.cooldownRounds,0);
 assert.equal(C.normalLimits.hits,12);
 assert.equal(C.overlimitLimits.hits,1000000);
 const full=C.validate({...god,cooldownRounds:999,
  effects:[...Array.from({length:128},()=>({
   type:'damage',hits:1000000,attackPct:1000000}))]});
 assert.equal(full.effects.length,128);
 assert.equal(full.effects[0].hits,1000000);
 assert.throws(()=>C.validate({...god,overlimit:false}),/ฮิต/);
 assert.throws(()=>C.validate({...god,effects:[{type:'damage',hits:1000001}]}),/ฮิต/);
 assert.throws(()=>C.validate({...god,effects:[...full.effects,{type:'damage'}]}),/128/);
 assert.throws(()=>C.validate({...god,effects:[{type:'damage',attackPct:1000001}]}),/พลังโจมตี/);
 assert.throws(()=>C.validate({...god,effects:[{type:'status',key:'paralysis',chance:null}]}),/โอกาส/);
 assert.equal(C.validate({...god,effects:[{type:'guts',uses:999}]}).effects[0].uses,999);
});
test('God-tier AOE ends battle in 4 compact damage events, not 399,996 renderer events',()=>{
 const {g,C,S}=boot();C.load();
 const ability=C.add(C.overlimitExample());
 const state=setup(g);
 const out=S.cast(state,'saber','skill1','foe-0',ability);
 assert.equal(out.ok,true);
 assert.equal(out.events.filter(x=>x.kind==='damage').length,4);
 assert.ok(out.events.every(e=>e.kind!=='damage'||e.compact));
 assert.ok(out.events.length<20,'event log must not scale with requested millions of hit visuals');
 assert.ok(state.enemies.every(x=>x.hp===0));
 assert.equal(g.AdvengerStatusEngine.value(state,'ally','saber','attackUp'),10);
 assert.equal(S.createdRemaining(state,'saber',ability.id),0);
});
test('one million actual hits on surviving 2M-HP target are computed as one damage record and compact ailment roll',()=>{
 const {g,C,S}=boot();C.load();
 const ability=C.add({name:'Infinite Thunder',overlimit:true,
  target:'singleEnemy',damageType:'physical',cooldownRounds:0,
  effects:[{type:'damage',hits:1000000,attackPct:.005},
   {type:'status',key:'paralysis',chance:.01,turns:999,eachHit:true}]});
 const state=setup(g);
 state.enemies[0].maxHP=2000000;state.enemies[0].hp=2000000;
 const result=S.cast(state,'saber','skill1','foe-0',ability);
 assert.equal(result.ok,true);
 const dmg=result.events.filter(e=>e.kind==='damage');
 assert.equal(dmg.length,1);
 assert.equal(dmg[0].hits,1000000);
 assert.equal(dmg[0].landedHits,1000000);
 assert.equal(dmg[0].amount,1000000);
 assert.equal(state.enemies[0].hp,1000000);
 assert.equal(result.events.filter(e=>e.kind==='status'&&e.key==='paralysis').length,1);
 assert.equal(g.AdvengerStatusEngine.has(state,'enemy','foe-0','paralysis'),true);
 assert.ok(result.events.length<20);
});
test('Overlimit hits still consume Guts protection multiple times without materializing hits',()=>{
 const {g,C,S}=boot();C.load();
 const ability=C.add({name:'Guts Breaker',overlimit:true,
  target:'singleEnemy',damageType:'physical',cooldownRounds:0,
  effects:[{type:'damage',hits:1000000,attackPct:1}]});
 const state=setup(g);
 g.AdvengerLifeEngine.grant(state,'enemy','foe-0',{type:'guts',uses:5});
 const result=S.cast(state,'saber','skill1','foe-0',ability);
 assert.equal(result.ok,true);
 assert.equal(state.enemies[0].hp,0,'follow-up lethal packets must remove repeated Guts');
 assert.equal(result.events.filter(e=>e.kind==='damage').length,1);
 assert.ok(result.events.length<20);
});
test('Overlimit records survive export/import and include large powers and extra Guts uses',()=>{
 const storage=new Map();let {C}=boot(storage);C.load();
 const ability=C.add({name:'Godmode Ward',overlimit:true,
  target:'self',damageType:'magic',cooldownRounds:0,effects:[
   {type:'status',key:'attackUp',chance:1,power:1000000,turns:999},
   {type:'guts',uses:999}]});
 C.assign('mage','ultimate',ability.id);
 const json=C.exportData();
 let restored=boot(new Map());restored.C.load();
 restored.C.importData(json);
 const read=restored.C.equipped('mage','ultimate');
 assert.equal(read.overlimit,true);
 assert.equal(read.effects[0].power,1000000);
 assert.equal(read.effects[1].uses,999);
 const state=setup(restored.g);
 const result=restored.S.cast(state,'mage','ultimate',null,read);
 assert.equal(result.ok,true);
 assert.equal(restored.g.AdvengerStatusEngine.value(state,'ally','mage','attackUp'),1000000);
 const recovered=setup(restored.g);
 restored.g.AdvengerLifeEngine.restore(recovered,JSON.parse(JSON.stringify(state)).lifeRuntime);
 assert.equal(recovered.lifeRuntime.ally.mage.pending.guts.uses,999);
});
test('real Overlimit engine feeds the display 120 exact per-hit damage numbers',()=>{
 const {g,C,S}=boot();C.load();
 const skill=C.add({name:'Real 120',overlimit:true,
  target:'singleEnemy',damageType:'physical',cooldownRounds:0,
  effects:[{type:'damage',hits:120,attackPct:.01}]});
 const state=setup(g);state.enemies[0].maxHP=100000;state.enemies[0].hp=100000;
 const report=S.cast(state,'saber','skill1','foe-0',skill);
 assert.equal(report.ok,true);
 const damage=report.events.filter(e=>e.kind==='damage');
 assert.equal(damage.length,1);
 assert.equal(damage[0].landedHits,120);
 assert.equal(damage[0].packets.length,1);
 const timeline=g.AdvengerHitDisplay.plan(report);
 assert.equal(timeline.shownHits,120);
 assert.equal(timeline.landedHits,120);
 assert.equal(timeline.configuredHits,120);
 assert.ok(timeline.frames.every(x=>x.kind!=='damage'||x.amount===damage[0].packets[0].perHit));
 assert.equal(state.enemies[0].hp,100000-120*damage[0].packets[0].perHit);
});
test('real enemy early-KO reports 2 landed hits and distinct final partial hit numbers',()=>{
 const {g,C,S}=boot();C.load();
 const skill=C.add({name:'Real 100',overlimit:true,
  target:'singleEnemy',damageType:'physical',cooldownRounds:0,
  effects:[{type:'damage',hits:100,attackPct:.04}]});
 const state=setup(g);state.enemies[0].maxHP=15;state.enemies[0].hp=15;
 const report=S.cast(state,'saber','skill1','foe-0',skill);
 assert.equal(report.ok,true);
 const timeline=g.AdvengerHitDisplay.plan(report);
 assert.equal(timeline.configuredHits,100);
 assert.equal(timeline.landedHits,2);
 assert.deepEqual(Array.from(timeline.frames,x=>x.amount),[9,6]);
 assert.equal(timeline.frames[1].hitNumber,2);
 assert.equal(state.enemies[0].hp,0);
});
test('browser mounts Skill Creator before app, and full UI loads after app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const src=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 assert.ok(src.indexOf('js/skill-creator.js')>src.indexOf('js/skill-engine.js'));
 assert.ok(src.indexOf('js/skill-creator.js')<src.indexOf('js/character-loader.js'));
 for(const id of ['creator','skillLabEffects','skillLabHero','skillLabSlot',
  'skillLabPreview','skillLabSave','createdBattleSkills'])
  assert.ok(html.includes('id="'+id+'"'),id);
 const loader=fs.readFileSync(path.join(root,'js/character-loader.js'),'utf8');
 assert.match(loader,/skill-creator-ui\.js/);
 const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
 assert.match(app,/sendCreatedSkill/);
 assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,'js/skill-creator-ui.js'),'utf8')));
});
