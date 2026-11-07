/* node --test tests/stat-db.test.cjs */
const test=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const g={};g.window=g;vm.createContext(g);
function load(p){new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p}).runInContext(g)}
load('classes/catalog.js');
load('js/class-animation-registry.js');
for(const role of ['saber','mage','tank','gunner'])load('classes/'+role+'/animations.js');
load('js/stat-db.js');load('js/character-registry.js');
const DB=g.AdvengerStatDB;
test('exact 30 approved stat IDs exist in the correct categories',()=>{
 const groups={core:5,offense:8,defense:6,effects:4,utility:7};
 a.equal(DB.count,30);
 a.equal(DB.all().length,30);
 a.equal(new Set(DB.keys).size,30);
 for(const [key,count] of Object.entries(groups))
  a.equal(DB.all().filter(x=>x.group===key).length,count,key);
 const expected='MAX_HP P_ATK M_ATK DEF SPD CRIT_RATE CRIT_DMG WEAK_RATE WEAK_DMG DMG_BOOST DMG_AMP DEF_PEN CRUSH BLOCK_RATE DMG_REDUCTION RESILIENCE PHYS_RESIST MAG_RESIST EVASION EFFECT_HIT EFFECT_RESIST STATUS_BOOST CC_RESIST COUNTER_RATE FOLLOWUP_RATE HEAL_POWER HEAL_RECEIVED LIFESTEAL CD_REDUCTION EX_GAIN'.split(' ');
 for(const key of expected)a.ok(DB.get(key),key);
 a.equal(DB.get('CRIT_RATE').unit,'rate');
 a.equal(DB.get('constructor'),null);
 a.throws(()=>DB.create({stats:{constructor:100}}));
});
test('legacy characters get defaults; new ones can customize every field',()=>{
 const legacy=g.AdvengerCharacters.register({
  id:'test-legacy',classId:'saber',maxHP:1050,name:'Legacy',
  art:'characters/test-legacy/art.svg',
  skills:{basic:'B',skill:'S',ultimate:'U'}
 });
 a.equal(legacy.stats.MAX_HP,1050);
 a.equal(legacy.stats.P_ATK,242);
 a.equal(legacy.stats.DEF,158);
 a.equal(legacy.stats.SPD,100);
 a.equal(Object.keys(legacy.stats).length,30);
 a.ok(Object.isFrozen(legacy.stats));
 const custom=g.AdvengerCharacters.register({
  id:'test-custom',classId:'mage',name:'Custom',
  art:'characters/test-custom/art.svg',
  skills:{basic:'B',skill:'S',ultimate:'U'},
  maxHP:800,stats:{MAX_HP:1200,P_ATK:320,M_ATK:480,DEF:250,SPD:180,
   CRIT_RATE:.25,EFFECT_HIT:.4,CC_RESIST:.15}
 });
 a.equal(custom.stats.MAX_HP,1200);
 a.equal(custom.stats.M_ATK,480);
 a.equal(custom.stats.EFFECT_HIT,.4);
 a.equal(custom.stats.EX_GAIN,0);
 a.throws(()=>DB.create({stats:{UNKNOWN_STAT:4}}));
 a.throws(()=>DB.create({stats:{SPD:-1}}));
 a.throws(()=>DB.create({stats:{P_ATK:Infinity}}));
 a.throws(()=>DB.create({stats:{MAX_HP:NaN}}));
});
test('enemy and boss share the same schema and overrides',()=>{
 load('js/encounter-catalog.js');
 const enemies=g.AdvengerEncounters.instantiate([
  {kind:'sentinel',stats:{SPD:120,PHYS_RESIST:.25}},
  {characterId:'test-custom',attack:350,boss:true,stats:{DEF:300}}
 ]);
 a.equal(enemies[0].stats.SPD,120);
 a.equal(enemies[0].stats.PHYS_RESIST,.25);
 a.equal(enemies[1].stats.P_ATK,350);
 a.equal(enemies[1].stats.M_ATK,480);
 a.equal(enemies[1].stats.DEF,300);
 a.equal(enemies[1].stats.MAX_HP,1200);
 a.ok(Object.isFrozen(enemies[1].stats));
});
test('battle runtime exposes and restores all nine runtime field types',()=>{
 const state={
  round:4,party:['test-custom'],
  enemies:[{id:'foe-0',hp:400,maxHP:500,stats:DB.create({maxHP:500})}],
  hp:{'test-custom':800},energy:{'test-custom':60},
  skillStatuses:{'ally/test-custom':[
   {key:'defenseUp',turns:2,power:.3},{key:'burn',turns:2,power:.1}
  ]},
  skillTimers:{'test-custom':{skill1:7}},
  skillUsed:{'test-custom':true}
 };
 DB.restoreRuntime(state,{
  ally:{'test-custom':{shield:250,stacks:{burn:3},charges:{revive:1}}},
  enemy:{'foe-0':{shield:400}}
 });
 const view=DB.battleView(state,'ally','test-custom');
 a.equal(Object.keys(DB.runtimeDefinitions).length,9);
 a.equal(view.hp.current,800);a.equal(view.hp.max,1200);
 a.equal(view.ex.current,60);a.equal(view.ex.max,100);
 a.equal(view.shield,250);
 a.equal(view.buffs.length,1);a.equal(view.debuffs.length,1);
 a.equal(view.cooldowns.skill1,3);a.equal(view.stacks.burn,3);
 a.equal(view.abilityUses.reviveUsed,true);a.equal(view.lifeState,'ALIVE');
 a.equal(DB.battleView(state,'enemy','foe-0').shield,400);
 state.hp['test-custom']=0;
 a.equal(DB.battleView(state,'ally','test-custom').lifeState,'KO');
 DB.resetRuntime(state);
 a.equal(DB.battleView(state,'ally','test-custom').shield,0);
});
test('browser exposes stat catalog and loads DB before registering characters',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(scripts.indexOf('js/stat-db.js')<scripts.indexOf('js/character-registry.js'));
 for(const id of ['statLive','statCatalog'])a.ok(html.includes('id="'+id+'"'));
 for(const file of ['js/app.js','js/skill-engine.js','js/turn-rules.js'])
  a.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8')));
});
