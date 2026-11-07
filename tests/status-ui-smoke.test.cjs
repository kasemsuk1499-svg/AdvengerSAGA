/* node --test tests/status-ui-smoke.test.cjs
 * Headless event flow: status test can block the active SPD ally without
 * causing a no-command softlock. Real browser visual QA still required.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function boot({customHero=false}={}){
 const nodes=new Map(),listeners={};
 const make=id=>{
  if(nodes.has(id))return nodes.get(id);
  let html='';
  const el={
   id,value:'',hidden:false,disabled:false,textContent:'',href:'',
   className:'',dataset:{},setAttribute(){},getAttribute(){return null},
   remove(){},append(){},style:{setProperty(){},width:''},
   classList:{toggle(){},add(){},remove(){}},
   addEventListener:(key,fn)=>((el.events||={})[key]=fn),
   querySelector:()=>null,querySelectorAll:()=>[],
   get options(){return [...html.matchAll(/<option\b[^>]*value="([^"]+)"/g)]
     .map(x=>({value:x[1]}));},
   get innerHTML(){return html},
   set innerHTML(str){html=String(str);if(id==='ailmentDemoKind'&&!this.value){
    this.value=this.options[0]?.value||'';
   }}
  };
  nodes.set(id,el);return el;
 };
 const document={
  getElementById:make,
  querySelector:()=>null,
  querySelectorAll:()=>[],
  addEventListener:(type,fn)=>listeners[type]=fn,
  createElement:()=>make('tmp-'+nodes.size),
  body:{append(){},appendChild(){}}
 };
 const store=new Map(),localStorage={
  getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)
 };
 const attacks=[];
 const g={document,localStorage,setTimeout:()=>0,console};
 g.window=g;vm.createContext(g);
 const load=p=>new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p}).runInContext(g);
 for(const p of [
  'classes/catalog.js','js/class-animation-registry.js',
  'classes/saber/animations.js','classes/mage/animations.js',
  'classes/tank/animations.js','classes/gunner/animations.js',
  'js/stat-db.js','js/character-registry.js',
  'characters/saber/character.js','characters/mage/character.js',
  'characters/tank/character.js','characters/gunner/character.js',
  'js/team-effects.js','js/turn-rules.js','js/encounter-catalog.js',
  'js/battle-core.js','js/initiative.js','js/skill-db.js',
  'js/status-db.js','js/status-engine.js','js/life-db.js','js/life-engine.js','js/skill-engine.js','js/skill-creator.js','js/character-creator.js','js/campaign.js'
 ])load(p);
 if(customHero){
  const c=g.AdvengerCharacterCreator;
  const stats=c.initial('gunner');stats.SPD=170;stats.P_ATK=440;
  c.save({name:'My Original',nameTh:'ออริจินัล',classId:'gunner',
   description:'Character Lab Test',stats,slots:{},portrait:null});
  c.boot();
 }
 g.AdvengerSharedArena=class{
  constructor(){ }
  mount(){ }
  energy(){ }
  status(){ }
  focus(){ }
  syncEnemies(){ }
  selectTarget(){ }
  reset(){ }
  announce(){ }
  async guard(){ }
  async play(id,kind,element,hit){hit(50);return true}
  async playDatabaseSkill(){return true}
  async enemyAttack(id,damage,guarded,name){attacks.push({id,damage,name})}
 };
 load('js/app.js');
 load('js/skill-creator-ui.js');
 load('js/character-creator-ui.js');
 load('js/campaign-ui.js');
 const click=data=>listeners.click({
  target:{closest:selector=>selector==='button'?{dataset:data}:null}
 });
 return {g,nodes,click,listeners,attacks};
}
test('saved custom hero appears in party picker, swaps into team and takes SPD priority',()=>{
 const app=boot({customHero:true});
 a.match(app.nodes.get('charLabStats').innerHTML,/MAX_HP/);
 a.match(app.nodes.get('charLabStats').innerHTML,/CRIT_RATE/);
 app.click({mainSlot:0});
 a.match(app.nodes.get('pickerOptions').innerHTML,/My Original/);
 app.click({pick:'custom-hero'});
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.party[0],'custom-hero');
 app.click({screen:'battle'});
 a.match(app.nodes.get('turnOrder').innerHTML,/My Original/);
 a.match(app.nodes.get('turnOrder').innerHTML,/SPD 170/);
 a.match(app.nodes.get('activeName').textContent,/My Original/);
});
test('app boots cleanly and auto-selects highest-SPD Gunner',()=>{
 const app=boot();app.click({screen:'battle'});
 a.match(app.nodes.get('activeName').textContent,/Gunner/);
 a.match(app.nodes.get('turnOrder').innerHTML,/SPD 120/);
 a.match(app.nodes.get('turnOrder').innerHTML,/SPD 95/);
});
test('app applying Paralysis to active ally automatically advances to next SPD actor',async()=>{
 const app=boot();app.click({screen:'battle'});
 app.nodes.get('ailmentDemoKind').value='paralysis';
 app.g.document.getElementById('ailmentDemoTurns').value='2';
 app.click({}); // ignored click, no changes
 // Dispatch via DOM button listener registered by app.js
 app.nodes.get('ailmentDemoAlly').events.click();
 await new Promise(resolve=>setImmediate(resolve));
 a.match(app.nodes.get('activeName').textContent,/Saber/);
 a.match(app.nodes.get('battleLog').innerHTML,/เสียคิวตาม SPD/);
});
test('Life Lab Guts keeps a hero at 1 HP, second lethal KO, manual revive restores 40%',()=>{
 const app=boot();app.click({screen:'battle'});
 app.nodes.get('lifeDemoTarget').value='gunner';
 app.click({lifeTest:'guts'});
 app.click({lifeTest:'damage'});
 let data=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(data.hp.gunner,1);
 a.equal(data.lifeRuntime.ally.gunner.pending.guts.uses,0);
 a.match(app.nodes.get('battleLog').innerHTML,/GUTS/);
 app.click({lifeTest:'damage'});
 data=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(data.hp.gunner,0);
 app.click({lifeTest:'revive'});
 data=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(data.hp.gunner,360);
 a.match(app.nodes.get('battleLog').innerHTML,/REVIVE/);
});
test('custom authored skill appears for equipped character and casts on their SPD turn',async()=>{
 const app=boot();
 a.match(app.nodes.get('skillLabEffects').innerHTML,/ขั้นที่ 1/);
 const created=app.g.AdvengerSkillCreator.add({
  name:'Thunder Practice',target:'singleEnemy',damageType:'magic',
  cooldownRounds:3,effects:[{type:'damage',hits:2,attackPct:1,defensePct:0,hpPct:0}]
 });
 app.g.AdvengerSkillCreator.assign('gunner','skill1',created.id);
 app.click({screen:'battle'});
 a.match(app.nodes.get('createdBattleSkills').innerHTML,/Thunder Practice/);
 app.click({createdSkill:'skill1'});
 await new Promise(resolve=>setImmediate(resolve));
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.acted.gunner,true);
 a.equal(saved.createdSkillTimers.gunner[created.id],4);
 a.match(app.nodes.get('battleLog').innerHTML,/Thunder Practice/);
});
test('fastest enemy acts automatically before any ally in three-enemy skirmish',async()=>{
 const app=boot();app.click({screen:'battle'});
 app.nodes.get('encounterSelect').value='skirmish';
 app.nodes.get('encounterSelect').events.change({target:{value:'skirmish'}});
 await new Promise(resolve=>setImmediate(resolve));
 a.ok(app.attacks.length>=1);
 a.equal(app.attacks[0].name,'Void Scout');
 a.match(app.nodes.get('activeName').textContent,/Gunner/);
});
