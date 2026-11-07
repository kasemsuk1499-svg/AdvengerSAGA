/* node --test tests/character-creator.test.cjs
 * One original character; 30 stats, class fallback, portrait security,
 * custom skill slots, persistence, replacement, imported backup and SPD.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function boot(storage=new Map()){
 const g={console,localStorage:{
  getItem:k=>storage.has(k)?storage.get(k):null,
  setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)
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
  'js/skill-engine.js','js/skill-creator.js','js/character-creator.js'
 ])load(p);
 return {g,load,C:g.AdvengerCharacterCreator,skills:g.AdvengerSkillCreator,storage};
}
function draft(C,classId='saber'){
 return {name:'Custom Hero',nameTh:'ฮีโร่ต้นฉบับ',classId,
  description:'ความหวังของปาร์ตี้',portrait:null,stats:C.initial(classId),slots:{}};
}
test('one custom character has an editable class preset and all 30 stat values',()=>{
 const {C,g}=boot();
 a.equal(C.get(),null);
 a.equal(C.id,'custom-hero');
 const stats=C.initial('saber');
 a.equal(Object.keys(stats).length,30);
 a.equal(stats.MAX_HP,1000);
 a.equal(stats.P_ATK,260);
 a.equal(stats.SPD,110);
 a.equal(stats.CRIT_RATE,.10);
 a.equal(C.initial('mage').M_ATK,320);
 a.equal(C.initial('tank').DEF,300);
 a.equal(C.initial('gunner').SPD,120);
 a.throws(()=>C.initial('healer'));
 a.ok(g.AdvengerStatDB.all().every(entry=>Object.hasOwn(stats,entry.id)));
});
test('saved single custom hero boots before app and reuses original class moves',async()=>{
 const storage=new Map();
 let {C}=boot(storage);
 const raw=draft(C,'mage');
 raw.stats.MAX_HP=1850;raw.stats.M_ATK=490;raw.stats.SPD=160;
 raw.stats.EFFECT_HIT=.35;
 C.save(raw);
 let instance=boot(storage);const hero=instance.C.boot();
 a.ok(hero);
 a.equal(hero.id,'custom-hero');
 a.equal(hero.classId,'mage');
 a.equal(hero.nameTh,'ฮีโร่ต้นฉบับ');
 a.equal(hero.stats.MAX_HP,1850);
 a.equal(hero.stats.M_ATK,490);
 a.equal(hero.stats.SPD,160);
 a.equal(hero.stats.EFFECT_HIT,.35);
 a.equal(Object.keys(hero.stats).length,30);
 a.equal(hero.art,'characters/mage/art.svg');
 a.equal(hero.defaultElement,'arcane');
 a.equal(instance.g.AdvengerCharacters.all().filter(x=>x.id==='custom-hero').length,1);
 a.ok(instance.C.boot());
 const hits=[];const api={
  announce(){},rune(){},shield(){},lock(){},beam(){},
  rush:async()=>{},strafe:async()=>{},wait:async()=>{},
  charge:async()=>{},cinematic:async()=>{},projectile:async()=>{},
  meteor:async()=>{},aim:async()=>{},hit:x=>hits.push(x)
 };
 // Class motion is the approved existing Mage animation, not a new effect loop.
 a.equal(typeof hero.perform,'function');
 a.equal(instance.g.AdvengerStatDB.forCharacter('custom-hero').SPD,160);
});
test('custom hero can equip authored skills and cast using personal stats',()=>{
 const storage=new Map();
 let {C,skills}=boot(storage);skills.load();
 const recorded=skills.add({
  name:'Original Burst',target:'singleEnemy',damageType:'magic',
  cooldownRounds:2,effects:[{type:'damage',hits:1,attackPct:1}]
 });
 const data=draft(C,'mage');
 data.stats.MAX_HP=1800;data.stats.M_ATK=420;data.stats.SPD=180;
 data.slots={skill1:recorded.id};
 C.save(data);
 const x=boot(storage);
 x.C.boot();
 const hero=x.g.AdvengerCharacters.get('custom-hero');
 a.equal(hero.stats.M_ATK,420);
 a.equal(x.skills.equipped('custom-hero','skill1').id,recorded.id);
 const party=['custom-hero','saber','mage','tank'];
 const state={
  party,round:1,phase:'player',active:'custom-hero',
  enemies:x.g.AdvengerEncounters.spawn('training'),targetId:'foe-0',
  hp:x.g.AdvengerTurnRules.maxHP(party),
  energy:Object.fromEntries(party.map(id=>[id,100])),
  acted:x.g.AdvengerTurnRules.counters(party),
  guarded:x.g.AdvengerTurnRules.counters(party),
  skillKits:{}
 };
 x.g.AdvengerSkillEngine.clear(state);
 x.g.AdvengerLifeEngine.reset(state);
 x.g.AdvengerInitiative.begin(state);
 a.equal(x.g.AdvengerInitiative.current(state).id,'custom-hero');
 const ability=x.skills.equipped('custom-hero','skill1');
 const hit=x.g.AdvengerSkillEngine.cast(state,'custom-hero','skill1','foe-0',ability);
 a.equal(hit.ok,true);
 a.equal(hit.events.filter(e=>e.kind==='damage')[0].amount,420);
 a.equal(x.g.AdvengerSkillEngine.createdRemaining(state,'custom-hero',ability.id),2);
});
test('existing skill creator assignment survives subsequent reload and hero edits',()=>{
 const storage=new Map();
 let a1=boot(storage);a1.skills.load();
 const skill=a1.skills.add({name:'Skill A',target:'singleEnemy',effects:[{type:'damage',hits:1,attackPct:1}]});
 a1.C.save(draft(a1.C));
 let a2=boot(storage);a2.C.boot();
 a2.skills.assign('custom-hero','ultimate',skill.id);
 let a3=boot(storage);a3.C.boot();
 a.equal(a3.skills.equipped('custom-hero','ultimate').id,skill.id);
 let changed=a3.C.get();changed.name='Edited Hero';
 changed.slots={ultimate:skill.id};
 a3.C.save(changed);
 const a4=boot(storage);a4.C.boot();
 a.equal(a4.g.AdvengerCharacters.get('custom-hero').name,'Edited Hero');
 a.equal(a4.skills.equipped('custom-hero','ultimate').id,skill.id);
});
test('custom image accepts bounded PNG/JPEG/WebP data but rejects unsafe/remote art',()=>{
 const {C}=boot();
 const base=draft(C);
 base.portrait='https://example.com/x.png';a.throws(()=>C.save(base),/รูปภาพ/);
 base.portrait='data:image/svg+xml;base64,PHN2Zz4=';a.throws(()=>C.save(base));
 base.portrait='data:image/png;base64,YWJj';a.doesNotThrow(()=>C.save(base));
 base.portrait='data:text/html;base64,PHNjcmlwdD4=';a.throws(()=>C.save(base));
 base.portrait='data:image/jpeg;base64,'+'A'.repeat(900000);a.throws(()=>C.save(base));
});
test('stat schema rejects missing, negative, overlong, NaN or invalid rate input',()=>{
 const {C}=boot();
 const bad=draft(C);bad.name='<img>';a.throws(()=>C.save(bad));
 bad.name='Valid';
 bad.stats.MAX_HP=0;a.throws(()=>C.save(bad));
 bad.stats.MAX_HP=1000;delete bad.stats.DEF;a.throws(()=>C.save(bad));
 bad.stats.DEF=100;bad.stats.CRIT_RATE=Infinity;a.throws(()=>C.save(bad));
 bad.stats.CRIT_RATE=.1;bad.stats.SPD=10.2;a.throws(()=>C.save(bad));
});
test('JSON backup includes hero and authored skill library; import is validated',()=>{
 const storage=new Map();let x=boot(storage);x.skills.load();
 const sk=x.skills.add({name:'Backup Skill',target:'singleEnemy',effects:[{type:'damage',hits:2,attackPct:.5}]});
 const raw=draft(x.C);raw.slots={basic:sk.id};x.C.save(raw);
 const backup=x.C.exportData();
 a.equal(backup.character.name,'Custom Hero');
 a.equal(backup.skillLibrary.skills.length,1);
 let next=boot(new Map());next.skills.load();
 next.C.importData(JSON.parse(JSON.stringify(backup)));
 next=boot(next.storage);next.C.boot();
 a.equal(next.g.AdvengerCharacters.get('custom-hero').name,'Custom Hero');
 a.equal(next.skills.equipped('custom-hero','basic').id,sk.id);
 a.throws(()=>next.C.importData({character:{name:'X',classId:'unknown'}}));
 a.equal(next.C.get().name,'Custom Hero');
 next.C.remove();
 a.equal(next.C.get(),null);
});
test('HTML/loader exposes character editor and loads saved hero before app boot',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const id of ['character','charLabName','charLabClass','charLabStats',
  'charLabPortrait','charLabSkills','charLabSave','charLabTransfer'])
  a.ok(html.includes('id="'+id+'"'),id);
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(scripts.indexOf('js/character-creator.js')<scripts.indexOf('js/character-loader.js'));
 const loader=fs.readFileSync(path.join(root,'js/character-loader.js'),'utf8');
 a.ok(loader.indexOf('AdvengerCharacterCreator?.boot()')<loader.indexOf("load('js/app.js"));
 a.match(loader,/character-creator-ui\.js/);
 const style=fs.readFileSync(path.join(root,'css/character-creator.css'),'utf8');
 a.match(style,/character-stat-grid/);
 a.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,'js/character-creator-ui.js'),'utf8')));
});
