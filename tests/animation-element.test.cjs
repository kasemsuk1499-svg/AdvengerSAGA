/* node --test tests/animation-element.test.cjs
 * Animation choice must affect presentation only, not combat effects.
 * Character innate element, enemy affinities, save, JSON and visual routing.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function boot(storage=new Map()){
 const g={console,localStorage:{
  getItem:k=>storage.get(k)||null,
  setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)
 },setTimeout:callback=>{callback();return 0}};
 g.window=g;vm.createContext(g);
 const load=p=>new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p}).runInContext(g);
 for(const p of [
  'classes/catalog.js','js/class-animation-registry.js','js/elements.js',
  'js/animation-catalog.js','classes/saber/animations.js','classes/mage/animations.js',
  'classes/tank/animations.js','classes/gunner/animations.js',
  'js/stat-db.js','js/character-registry.js',
  'characters/saber/character.js','characters/mage/character.js',
  'characters/tank/character.js','characters/gunner/character.js',
  'js/turn-rules.js','js/encounter-catalog.js','js/battle-core.js',
  'js/initiative.js','js/skill-db.js','js/status-db.js','js/status-engine.js',
  'js/life-db.js','js/life-engine.js','js/skill-engine.js',
  'js/skill-creator.js','js/character-creator.js','js/shared-arena.js'
 ])load(p);
 return {g,storage,C:g.AdvengerSkillCreator,CC:g.AdvengerCharacterCreator};
}
test('catalog contains exactly 12 existing approved class animations',()=>{
 const {g}=boot(),A=g.AdvengerAnimations;
 a.equal(A.all().length,12);
 for(const id of ['saber','mage','tank','gunner'])
  for(const kind of ['basic','skill','ultimate'])
   a.ok(A.get(id+':'+kind),id+':'+kind);
 a.equal(A.get('imaginary:ultimate'),null);
 a.equal(A.get('saber:passive'),null);
});
test('native damage packets are sampled from the original scripts without VFX',async()=>{
 const {g}=boot();
 const normal=await g.AdvengerAnimations.capture('saber','basic');
 a.equal(normal.length,1);a.equal(normal[0].amount,110);
 const combo=await g.AdvengerAnimations.capture('saber','skill');
 a.equal(combo.length,3);
 a.equal(combo.reduce((n,x)=>n+x.amount,0),210);
 const mage=await g.AdvengerAnimations.capture('mage','ultimate');
 a.equal(mage.length,4);
 const gunner=await g.AdvengerAnimations.capture('gunner','ultimate');
 a.equal(gunner.length,7);
 a.equal(gunner.at(-1).amount,300);
});
test('animation selections persist per hero/slot; reject unsafe IDs; JSON roundtrip',()=>{
 const storage=new Map();let {C}=boot(storage);C.load();
 a.equal(C.animationFor('saber','skill1'),null);
 C.assignAnimation('saber','skill1','mage:ultimate');
 C.assignAnimation('saber','basic','gunner:skill');
 C.assignAnimation('gunner','basic','tank:basic');
 a.equal(C.animationFor('saber','skill1').kind,'ultimate');
 a.equal(C.animationFor('saber','basic').classId,'gunner');
 a.throws(()=>C.assignAnimation('saber','skill1','https://evil.example/js'),/แอนิเมชัน/);
 a.throws(()=>C.assignAnimation('x','basic','mage:skill'),/ช่อง/);
 const backup=C.exportData();
 C.assignAnimation('saber','skill1',null);
 a.equal(C.animationFor('saber','skill1'),null);
 C.importData(backup);
 a.equal(C.animationFor('saber','skill1').id,'mage:ultimate');
 ({C}=boot(storage));C.load();
 a.equal(C.animationFor('saber','skill1').id,'mage:ultimate');
 a.equal(C.animationFor('gunner','basic').id,'tank:basic');
});
test('original hero element and four custom animation choices survive character save and reload',()=>{
 const storage=new Map();let {CC}=boot(storage);
 const raw={name:'My Elemental Hero',classId:'saber',
  element:'fire',portrait:null,stats:CC.initial('saber'),
  slots:{},animations:{basic:'mage:ultimate',skill1:'saber:skill'}};
 CC.save(raw);
 let ctx=boot(storage);ctx.CC.boot();
 const char=ctx.g.AdvengerCharacters.get('custom-hero');
 a.equal(char.element,'fire');
 a.equal(char.defaultElement,'fire');
 a.equal(char.colors.length,12);
 a.equal(ctx.C.animationFor('custom-hero','basic').id,'mage:ultimate');
 a.equal(ctx.CC.get().element,'fire');
 const backup=ctx.CC.exportData();
 a.equal(backup.character.animations.basic,'mage:ultimate');
 a.equal(backup.character.element,'fire');
 a.throws(()=>ctx.CC.save({...raw,element:'lava'}),/ธาตุ/);
 a.throws(()=>ctx.CC.save({...raw,animations:{skill1:'malicious'}}),/แอนิเมชัน/);
});
test('existing legacy character save without element migrates to default class element',()=>{
 const {CC}=boot();
 const raw={name:'Old Hero',classId:'tank',portrait:null,
  stats:CC.initial('tank'),slots:{}};
 const saved=CC.save(raw);
 a.equal(saved.element,'earth');
 a.deepEqual(Object.keys(saved.animations),[]);
});
test('elements have controlled matchups, but cosmetic battle color does not change innate damage',()=>{
 const {g}=boot();
 const E=g.AdvengerElements;
 a.equal(E.all().length,12);
 a.equal(E.multiplier('fire','nature'),1.15);
 a.equal(E.multiplier('nature','fire'),.90);
 a.equal(E.multiplier('arcane','arcane'),1);
 a.equal(E.multiplier('water','metal'),1);
 const stats=g.AdvengerStatDB.forCharacter('saber');
 const state={party:['saber'],hp:{saber:stats.MAX_HP},enemies:
  g.AdvengerEncounters.instantiate([{kind:'wisp',element:'fire'}]),round:1,
  elements:{saber:'fire'},skillStatuses:{},mode:'lab'};
 a.equal(E.affinityForActor(state,'ally','saber'),'water');
 a.equal(E.damageMultiplier(state,'ally','saber','enemy','foe-0'),1.15);
 a.equal(g.AdvengerSkillEngine.adjustDamage(state,'ally','saber','enemy','foe-0',100),115);
 state.elements.saber='void';
 a.equal(g.AdvengerSkillEngine.adjustDamage(state,'ally','saber','enemy','foe-0',100),115);
});
test('swapped native choreography replays original hit values, not chosen animation hit values',async()=>{
 const {g}=boot(),proto=g.AdvengerSharedArena.prototype;
 const played=[],numbers=[],applied=[];
 const stage=Object.create(proto);
 stage.play=async(...args)=>{played.push(args);args[3](999);return true;};
 stage.hitNumber=(n,color)=>numbers.push(n);
 const done=await stage.playReanimated('gunner','basic','fire',
  (amount)=>{applied.push(amount);return amount},
  'saber','mage:ultimate');
 a.equal(done,true);
 a.equal(played.length,1);
 a.equal(played[0][1],'ultimate');
 a.equal(played[0][4],'mage');
 a.equal(applied.length,1);
 a.equal(applied[0],110,'original Saber Basic coefficient remains unchanged');
 a.equal(numbers[0],110);
});
test('visual-only animation for a DB skill does not execute any extra combat damage',async()=>{
 const {g}=boot(),proto=g.AdvengerSharedArena.prototype;
 const visual=[],hits=[],fake={id:'hero'},enemy={id:'foe-0'};
 const stage=Object.create(proto);
 stage.party=['saber'];stage.busy=false;stage.reduced=true;
 stage.actor=()=>fake;
 stage.play=async(id,kind,element,onDamage,source)=>{
  visual.push({id,kind,element,source});a.equal(onDamage(500),0);return true;
 };
 stage.focus=()=>{};
 stage.stage={
  classList:{add(){},remove(){}},querySelectorAll:()=>[enemy],append(){}
 };
 stage.field={point:()=>({x:0,y:0}),impact:(...args)=>hits.push(args),color:()=>"#fff",emit(){}};
 stage.announce=()=>{};stage.hitNumber=(amount)=>hits.push(amount);
 const report={ok:true,hero:{name:'test'},targets:[{side:'enemy',id:'foe-0'}],
  events:[{kind:'damage',side:'enemy',id:'foe-0',amount:123}]};
 const done=await stage.playDatabaseSkill('saber',{name:'Test'},report,'tank:skill','fire');
 a.equal(done,true);
 a.equal(visual.length,1);
 a.equal(visual[0].source,'tank');
 a.equal(visual[0].kind,'skill');
 a.ok(hits.some(x=>x===123));
});
test('web module loading order and both creator screens include animation and element UI',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const order=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(order.indexOf('js/elements.js')<order.indexOf('js/character-creator.js'));
 a.ok(order.indexOf('js/animation-catalog.js')<order.indexOf('js/skill-creator.js'));
 for(const id of ['charLabElement','charLabElementDescription',
  'skillLabAnimation','skillLabAnimationSave'])
  a.ok(html.includes('id="'+id+'"'),id);
 const creator=fs.readFileSync(path.join(root,'js/character-creator-ui.js'),'utf8');
 a.match(creator,/data-char-animation/);
 const arena=fs.readFileSync(path.join(root,'js/shared-arena.js'),'utf8');
 a.match(arena,/async playReanimated/);
});
