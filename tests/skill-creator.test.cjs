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
  'classes/catalog.js','js/class-animation-registry.js',
  'classes/saber/animations.js','classes/mage/animations.js',
  'classes/tank/animations.js','classes/gunner/animations.js',
  'js/stat-db.js','js/character-registry.js',
  'characters/saber/character.js','characters/mage/character.js',
  'characters/tank/character.js','characters/gunner/character.js',
  'js/turn-rules.js','js/encounter-catalog.js','js/battle-core.js',
  'js/initiative.js','js/skill-db.js','js/status-db.js',
  'js/status-engine.js','js/life-db.js','js/life-engine.js',
  'js/skill-engine.js','js/skill-creator.js'
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
