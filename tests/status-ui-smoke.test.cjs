/* node --test tests/status-ui-smoke.test.cjs
 * Headless event flow: status test can block the active SPD ally without
 * causing a no-command softlock. Real browser visual QA still required.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function boot(){
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
  getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)
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
  'js/status-db.js','js/status-engine.js','js/skill-engine.js'
 ])load(p);
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
 const click=data=>listeners.click({
  target:{closest:selector=>selector==='button'?{dataset:data}:null}
 });
 return {g,nodes,click,listeners,attacks};
}
test('app boots cleanly and auto-selects highest-SPD Gunner',()=>{
 const app=boot();app.click({screen:'battle'});
 a.match(app.nodes.get('activeName').textContent,/Gunner/);
 a.match(app.nodes.get('turnOrder').innerHTML,/SPD 120/);
 a.match(app.nodes.get('turnOrder').innerHTML,/SPD 95/);
});
test('app applying Paralysis to active ally automatically advances to next SPD actor',async()=>{
 const app=boot();app.click({screen:'battle'});
 app.nodes.get('ailmentDemoKind').value='paralysis';
 app.nodes.get('ailmentDemoTurns').value='2';
 app.click({}); // ignored click, no changes
 // Dispatch via DOM button listener registered by app.js
 app.nodes.get('ailmentDemoAlly').events.click();
 await new Promise(resolve=>setImmediate(resolve));
 a.match(app.nodes.get('activeName').textContent,/Saber/);
 a.match(app.nodes.get('battleLog').innerHTML,/เสียคิวตาม SPD/);
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
