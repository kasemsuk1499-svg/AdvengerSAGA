/* node --test tests/campaign.test.cjs
 * Verified progression, resource accounting, stages, level growth, battle
 * formula isolation, replay and saved-stage resumption in static GitHub Pages.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function boot(storage=new Map()){
 const g={console,localStorage:{
  getItem:k=>storage.get(k)||null,
  setItem:(k,v)=>storage.set(k,v),
  removeItem:k=>storage.delete(k)
 }};
 g.window=g;vm.createContext(g);
 const load=file=>new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(g);
 for(const file of [
  'classes/catalog.js','js/class-animation-registry.js','js/elements.js','js/animation-catalog.js',
  'classes/saber/animations.js','classes/mage/animations.js',
  'classes/tank/animations.js','classes/gunner/animations.js',
  'js/stat-db.js','js/character-registry.js',
  'characters/saber/character.js','characters/mage/character.js',
  'characters/tank/character.js','characters/gunner/character.js',
  'js/encounter-catalog.js','js/battle-core.js','js/turn-rules.js',
  'js/initiative.js','js/skill-db.js','js/status-db.js',
  'js/status-engine.js','js/life-db.js','js/life-engine.js',
  'js/skill-engine.js','js/campaign.js'
 ])load(file);
 return {g,M:g.AdvengerCampaign,storage};
}
test('six original mission stages, two chapters, progressive stage locks and goals',()=>{
 const {M}=boot();
 a.equal(M.stages.length,6);
 a.equal(M.chapters.length,2);
 a.equal(M.firstAvailable().id,'story-01');
 a.equal(M.unlocked('story-01'),true);
 for(const s of M.stages.slice(1))a.equal(M.unlocked(s.id),false);
 a.equal(M.stage('story-06').enemies.some(e=>e.boss),true);
 a.equal(M.stage('story-05').enemies.length,4);
 a.equal(M.stage('missing'),null);
 a.throws(()=>M.complete('story-03',4,3),/ปลดล็อก/);
});
test('first clear grants XP, gold and stars, replay cannot farm duplicate rewards',()=>{
 const {M}=boot();const one=M.complete('story-01',1,7);
 a.equal(one.first,true);
 a.equal(one.stars,1);
 a.equal(one.xp,45);a.equal(one.gold,80);
 a.equal(one.next,'story-02');a.equal(M.unlocked('story-02'),true);
 let p=M.stats();a.equal(p.gold,80);a.equal(p.xp,45);
 const replay=M.complete('story-01',4,3);
 a.equal(replay.first,false);a.equal(replay.gold,0);a.equal(replay.xp,0);
 a.equal(replay.stars,3);
 p=M.stats();a.equal(p.stars['story-01'],3);
 a.equal(p.gold,80);a.equal(p.xp,45);
});
test('level increases ATK only in story, not training; level is earned via XP',()=>{
 const {g,M}=boot();
 M.complete('story-01',4,2);
 a.equal(M.stats().level.level,1);
 M.complete('story-02',4,2);
 a.equal(M.stats().level.level,2);
 a.equal(M.attackBonus(),.04);
 const s={party:['saber','mage','tank','gunner'],
  enemies:g.AdvengerEncounters.spawn('story-02'),
  hp:{saber:1000,mage:800,tank:1500,gunner:900},
  mode:'campaign',campaignStage:'story-02'};
 const action=g.AdvengerSkillEngine.adjustDamage;
 a.equal(action(s,'ally','saber','enemy','foe-0',100),104);
 s.mode='lab';
 a.equal(action(s,'ally','saber','enemy','foe-0',100),100);
});
test('gold buys a meaningful combat item, consumes stock, and cannot underflow',()=>{
 const {M}=boot();
 a.equal(M.stats().inventory.potion,1);
 a.equal(M.consume('feather'),false);
 M.complete('story-01',4,3);
 const bought=M.buy('potion');
 a.equal(bought.gold,20);a.equal(bought.inventory.potion,2);
 a.equal(M.consume('potion'),true);
 a.equal(M.stats().inventory.potion,1);
 a.throws(()=>M.buy('feather'),/ทอง/);
 M.consume('potion');a.equal(M.consume('potion'),false);
 a.equal(M.stats().inventory.potion,0);
});
test('progress and purchases persist on a fresh browser script context',()=>{
 const storage=new Map();let {M}=boot(storage);
 M.complete('story-01',4,1);M.buy('potion');
 ({M}=boot(storage));
 a.equal(M.stats().gold,20);
 a.equal(M.stats().xp,45);
 a.equal(M.unlocked('story-02'),true);
 a.equal(M.stats().inventory.potion,2);
 const duplicate=M.complete('story-01',4,1);
 a.equal(duplicate.first,false);a.equal(M.stats().gold,20);
});
test('all six authored stage encounter IDs preserve enemy roster and boss data',()=>{
 const {M,g}=boot();
 for(const s of M.stages){
  const actual=g.AdvengerEncounters.spawn(s.id);
  a.equal(actual.length,s.enemies.length,s.id);
  a.equal(actual[0].maxHP,s.enemies[0].maxHP,s.id);
  a.equal(actual[0].attack,s.enemies[0].attack,s.id);
  a.equal(actual[0].stats.SPD,s.enemies[0].speed,s.id);
 }
 const last=g.AdvengerEncounters.spawn('story-06');
 a.equal(last.filter(e=>e.boss).length,1);
});
test('all missions end with finite EXP and level progress, not infinite replay gain',()=>{
 const {M}=boot();
 for(const s of M.stages){
  a.equal(M.unlocked(s.id),true);
  M.complete(s.id,4,2);
 }
 const p=M.stats();
 a.equal(p.completed,6);a.equal(p.unlocked,6);
 a.equal(p.xp,45+65+90+115+145+195);
 a.equal(p.gold,80+110+150+190+240+350);
 a.equal(p.level.level>=2,true);
 const before=p.gold;
 const last=M.complete('story-06',4,2);
 a.equal(last.finished,true);a.equal(last.first,false);
 a.equal(M.stats().gold,before);
});
test('campaign UI is wired to game shell without bypassing battle',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const id of ['campaign','campaignLaunch','campaignResume','campaignChapters',
  'campaignBattleBanner','campaignBattleItems','campaignItemButtons',
  'campaignBattleResult','campaignResultReward','campaignShopItems'])
  a.ok(html.includes('id="'+id+'"'),id);
 const load=fs.readFileSync(path.join(root,'js/character-loader.js'),'utf8');
 a.ok(load.includes("load('js/campaign-ui.js"));
 const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
 a.match(app,/CAMPAIGN\.complete\(state\.campaignStage/);
 a.match(app,/if\(isCampaignBattle\(\)\)return notice\('LIFE LAB/);
 a.match(app,/function useCampaignItem/);
 a.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,'js/campaign-ui.js'),'utf8')));
});
