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
  addEventListener:(type,fn)=>(listeners[type]||=[]).push(fn),
  createElement:()=>make('tmp-'+nodes.size),
  body:{append(){},appendChild(){}}
 };
 const store=new Map(),localStorage={
  getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)
 };
 const attacks=[],nativeMoves=[],databaseMoves=[];
 const g={document,localStorage,setTimeout:()=>0,console};
 g.window=g;vm.createContext(g);
 const load=p=>new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p}).runInContext(g);
 for(const p of [
  'classes/catalog.js','js/class-animation-registry.js','js/elements.js','js/animation-catalog.js',
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
  async play(id,kind,element,hit,sourceHeroId){
   nativeMoves.push({id,kind,sourceHeroId});
   hit(g.AdvengerCampaignBridge?.state()?.mode==='campaign'?5000:50);
   return true;
  }
  async playReanimated(id,kind,element,onDamage,sourceHeroId,animationId){
   nativeMoves.push({id,kind,sourceHeroId,animationId,visualOnly:true});
   const original=await g.AdvengerAnimations.capture(sourceHeroId||id,kind);
   for(const hit of original)onDamage(hit.amount,kind,hit.critical);
   return true;
  }
  async playDatabaseSkill(id,skill,report,animationId,element){
   databaseMoves.push({id,skillName:skill.name,animationId,element,report});
   return true;
  }
  async enemyAttack(id,damage,guarded,name){attacks.push({id,damage,name})}
 };
 load('js/app.js');
 load('js/skill-creator-ui.js');
 load('js/character-creator-ui.js');
 load('js/campaign-ui.js');
 const click=data=>{const event={target:{closest:selector=>selector==='button'?{dataset:data}:null}};
  for(const listener of listeners.click||[])listener(event);
 };
 return {g,nodes,click,listeners,attacks,nativeMoves,databaseMoves};
}
test('Overlimit UI generates and saves a powerful 99,999-hit template with no forced chance defaults',()=>{
 const app=boot();
 const UI=app.nodes;
 const btn=UI.get('skillLabOverlimitExample');
 a.equal(typeof btn.events.click,'function');
 btn.events.click();
 a.equal(UI.get('skillLabOverlimit').checked,true);
 a.match(UI.get('skillLabEffects').innerHTML,/max="1000000"/);
 a.match(UI.get('skillLabOverlimitInfo').textContent,/OVERLIMIT ACTIVE/);
 a.match(UI.get('skillLabName').value,/OVERLIMIT/);
 UI.get('skillLabSave').events.click();
 const skills=app.g.AdvengerSkillCreator.list();
 a.equal(skills.length,1);
 a.equal(skills[0].overlimit,true);
 a.equal(skills[0].effects[0].hits,99999);
});
test('Character Creator changes innate element and chooses animations for four skill slots',()=>{
 const app=boot();
 a.match(app.nodes.get('charLabElement').innerHTML,/value="fire"/);
 a.match(app.nodes.get('charLabSkills').innerHTML,/data-char-animation="basic"/);
 app.nodes.get('charLabName').value='Element Hero';
 app.nodes.get('charLabNameTh').value='ฮีโร่ไฟ';
 app.nodes.get('charLabElement').events.change({target:{value:'fire'}});
 app.nodes.get('charLabSkills').events.change({
  target:{dataset:{charAnimation:'skill1'},value:'mage:ultimate'}
 });
 app.nodes.get('charLabSave').events.click();
 const stored=app.g.AdvengerCharacterCreator.get();
 a.equal(stored.name,'Element Hero');
 a.equal(stored.element,'fire');
 a.equal(stored.animations.skill1,'mage:ultimate');
});
test('Skill Creator Lab can set visual choreography without installing a new skill',()=>{
 const app=boot();const C=app.g.AdvengerSkillCreator;
 a.match(app.nodes.get('skillLabAnimation').innerHTML,/Saber/);
 app.nodes.get('skillLabHero').value='gunner';
 app.nodes.get('skillLabSlot').value='basic';
 app.nodes.get('skillLabAnimation').value='tank:ultimate';
 app.nodes.get('skillLabAnimationSave').events.click();
 a.equal(C.animationFor('gunner','basic').id,'tank:ultimate');
 a.equal(C.equippedSource('gunner','basic'),null);
});
test('equipped native animation preset keeps the original action while replacing VFX',async()=>{
 const app=boot();const C=app.g.AdvengerSkillCreator;
 C.assignAnimation('gunner','basic','mage:ultimate');
 app.click({screen:'battle'});app.click({command:'basic'});
 await new Promise(resolve=>setImmediate(resolve));
 a.equal(app.nativeMoves.length,1);
 a.equal(app.nativeMoves[0].kind,'basic');
 a.equal(app.nativeMoves[0].animationId,'mage:ultimate');
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.acted.gunner,true);
 a.ok(saved.enemies[0].hp<saved.enemies[0].maxHP);
});
test('equipped Seven Knights skill uses selected animation and preserves source cooldown',async()=>{
 const app=boot();const C=app.g.AdvengerSkillCreator;
 C.assign('gunner','skill1','kit:rachel:skill1');
 C.assignAnimation('gunner','skill1','saber:ultimate');
 app.click({screen:'battle'});app.click({command:'skill'});
 await new Promise(resolve=>setImmediate(resolve));
 a.equal(app.databaseMoves.length,1);
 a.equal(app.databaseMoves[0].animationId,'saber:ultimate');
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.createdSkillTimers.gunner['kit:rachel:skill1'],4);
});
test('campaign starts from hub, hides cheat labs, saves in-progress mission and resumes',()=>{
 const app=boot();
 a.match(app.nodes.get('campaignChapters').innerHTML,/เสียงเรียกจากรอยแยก/);
 a.equal(app.nodes.get('campaignResume').hidden,true);
 app.nodes.get('campaignLaunch').events.click();
 let saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.mode,'campaign');
 a.equal(saved.campaignStage,'story-01');
 a.equal(saved.enemies.length,1);
 a.equal(saved.enemies[0].maxHP,1300);
 a.equal(app.nodes.get('lifePanel').hidden,true);
 a.equal(app.nodes.get('ailmentPanel').hidden,true);
 a.equal(app.nodes.get('encounterToolbar').hidden,true);
 a.equal(app.nodes.get('campaignBattleItems').hidden,false);
 app.click({screen:'campaign'});
 a.equal(app.nodes.get('campaignResume').hidden,false);
 app.nodes.get('campaignResume').events.click();
 saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.campaignStage,'story-01');
 a.equal(saved.mode,'campaign');
});
test('actual Basic command clears campaign stage and grants first-clear reward exactly once',async()=>{
 const app=boot();const M=app.g.AdvengerCampaign;
 app.nodes.get('campaignLaunch').events.click();
 a.equal(M.stats().xp,0);
 app.click({command:'basic'});
 await new Promise(resolve=>setImmediate(resolve));
 let p=M.stats();
 a.equal(p.xp,45);a.equal(p.gold,80);
 a.equal(p.cleared['story-01'],true);
 a.equal(p.stars['story-01'],3);
 a.equal(app.nodes.get('campaignBattleResult').hidden,false);
 a.match(app.nodes.get('campaignResultTitle').textContent,/ภารกิจสำเร็จ/);
 app.click({command:'basic'});
 p=M.stats();a.equal(p.xp,45);a.equal(p.gold,80);
 app.click({screen:'campaign'});
 app.nodes.get('campaignLaunch').events.click();
 app.click({command:'basic'});
 await new Promise(resolve=>setImmediate(resolve));
 p=M.stats();a.equal(p.xp,45);a.equal(p.gold,80);
});
test('campaign item shop unlocks purchases only after earning gold',()=>{
 const app=boot();
 const M=app.g.AdvengerCampaign;
 a.equal(M.stats().gold,0);
 M.complete('story-01',4,2);
 app.click({screen:'campaign'});
 app.click({campaignBuy:'potion'});
 a.equal(M.stats().gold,20);
 a.equal(M.stats().inventory.potion,2);
 a.match(app.nodes.get('campaignShopItems').innerHTML,/มี 2/);
});
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
test('equipping a custom Basic truly replaces original Basic button and its action',async()=>{
 const app=boot();const C=app.g.AdvengerSkillCreator;
 const skill=C.add({name:'Arc Pulse',target:'singleEnemy',damageType:'magic',
  cooldownRounds:2,effects:[{type:'damage',hits:2,attackPct:1}]});
 C.assign('gunner','basic',skill.id);
 app.click({screen:'battle'});
 a.match(app.nodes.get('basicLabel').textContent,/Arc Pulse/);
 a.doesNotMatch(app.nodes.get('createdBattleSkills').innerHTML,/data-created-skill=/);
 app.click({command:'basic'});
 await new Promise(resolve=>setImmediate(resolve));
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.acted.gunner,true);
 a.equal(saved.createdSkillTimers.gunner[skill.id],3);
 a.equal(app.nativeMoves.length,0,'the original native basic choreography was replaced');
 a.match(app.nodes.get('battleLog').innerHTML,/Arc Pulse/);
});
test('existing Saber class Skill replaces Gunner Skill without spawning a duplicate action',async()=>{
 const app=boot();const C=app.g.AdvengerSkillCreator;
 C.assign('gunner','skill1','native:saber:skill');
 app.click({screen:'battle'});
 a.match(app.nodes.get('skillLabel').textContent,/Elemental Triple/);
 app.click({command:'skill'});
 await new Promise(resolve=>setImmediate(resolve));
 a.equal(app.nativeMoves.length,1);
 a.equal(app.nativeMoves[0].id,'gunner');
 a.equal(app.nativeMoves[0].sourceHeroId,'saber');
 a.equal(app.nativeMoves[0].kind,'skill');
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.acted.gunner,true);
});
test('existing Seven Knights active skill equips into Skill 1 and uses its source cooldown',async()=>{
 const app=boot();const C=app.g.AdvengerSkillCreator;
 C.assign('gunner','skill1','kit:rachel:skill1');
 app.click({screen:'battle'});
 a.match(app.nodes.get('skillLabel').textContent,/Blazing Strike/);
 app.click({command:'skill'});
 await new Promise(resolve=>setImmediate(resolve));
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(saved.acted.gunner,true);
 a.equal(saved.createdSkillTimers.gunner['kit:rachel:skill1'],4);
 a.ok(saved.enemies[0].hp<saved.enemies[0].maxHP);
 a.match(app.nodes.get('battleLog').innerHTML,/Blazing Strike/);
});
test('equipped original Ultimate in Basic still charges EX 100',async()=>{
 const app=boot();app.g.AdvengerSkillCreator.assign('gunner','basic','native:saber:ultimate');
 app.click({screen:'battle'});
 app.click({command:'basic'});
 await new Promise(resolve=>setImmediate(resolve));
 const saved=JSON.parse(app.g.localStorage.getItem('AdvengerSAGA_FORMATION_V1'));
 a.equal(app.nativeMoves[0].kind,'ultimate');
 a.equal(app.nativeMoves[0].sourceHeroId,'saber');
 a.equal(saved.energy.gunner,0);
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
