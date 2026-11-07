/* node --test tests/status-effects.test.cjs */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const g={};g.window=g;vm.createContext(g);
const load=f=>new vm.Script(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}).runInContext(g);
[
 'classes/catalog.js','js/class-animation-registry.js','js/elements.js','js/animation-catalog.js',
 'classes/saber/animations.js','classes/mage/animations.js',
 'classes/tank/animations.js','classes/gunner/animations.js',
 'js/stat-db.js','js/character-registry.js',
 'characters/saber/character.js','characters/mage/character.js',
 'characters/tank/character.js','characters/gunner/character.js',
 'js/encounter-catalog.js','js/battle-core.js','js/turn-rules.js',
 'js/initiative.js','js/skill-db.js','js/status-db.js',
 'js/status-engine.js','js/skill-engine.js'
].forEach(load);
const A=g.AdvengerStatusDB,T=g.AdvengerStatusEngine,
 S=g.AdvengerSkillEngine,E=g.AdvengerEncounters,C=g.AdvengerBattleCore,
 I=g.AdvengerInitiative,D=g.AdvengerSkillDB;
function fresh(){
 const party=['saber','mage','tank','gunner'];
 const s={round:1,phase:'player',party,enemies:E.spawn('skirmish'),
  hp:Object.fromEntries(party.map(id=>[id,g.AdvengerStatDB.forCharacter(id).MAX_HP])),
  energy:{saber:100,mage:100,tank:100,gunner:100},acted:Object.fromEntries(party.map(id=>[id,false])),
  guarded:Object.fromEntries(party.map(id=>[id,false])),skillKits:{}};
 S.clear(s);I.begin(s);return s;
}
test('reference ailment catalog includes 17 named, grouped and distinct statuses',()=>{
 a.equal(A.all().length,17);
 for(const x of ['stun','paralysis','shock','freeze','petrify','sleep','fear','silence',
  'blind','confusion','burn','dragonFlame','bleed','poison','death','healBlock','soulDeath'])
  a.ok(A.get(x)?.nameTh,x);
 a.equal(A.get('silence').category,'restriction');
 a.equal(A.isControl('stun'),true);
 a.equal(A.isControl('silence'),false);
 a.equal(A.isDot('bleed'),true);
});
test('paralysis prevents exactly two action opportunities and zeroes Block',()=>{
 const s=fresh();const fx={key:'paralysis',chance:1,turns:2};
 a.equal(T.apply(s,'ally','tank',fx,'foe-0'),true);
 a.equal(T.canUse(s,'ally','tank','basic'),false);
 a.equal(T.effectiveBlockRate(s,'ally','tank'),0);
 const first=T.consumeControl(s,'ally','tank');
 a.equal(first.blocked,true);
 a.equal(T.find(s,'ally','tank','paralysis').turns,1);
 const second=T.consumeControl(s,'ally','tank');
 a.equal(second.blocked,true);
 a.equal(T.canUse(s,'ally','tank','basic'),true);
});
test('silence blocks active skills but basic and guard remain; blindness causes Fumble',()=>{
 const s=fresh();
 T.apply(s,'ally','gunner',{key:'silence',turns:2,chance:1},'foe-0');
 a.equal(T.canUse(s,'ally','gunner','basic'),true);
 a.equal(T.canUse(s,'ally','gunner','skill'),false);
 a.equal(T.canUse(s,'ally','gunner','ultimate'),false);
 a.equal(T.canUse(s,'ally','gunner','guard'),true);
 T.apply(s,'ally','gunner',{key:'blind',turns:2,chance:1},'foe-0');
 a.equal(T.isFumble(s,'ally','gunner','basic'),true);
 a.equal(T.isFumble(s,'ally','gunner','skill'),false);
});
test('status immunity and effect resistance override raw infliction chance',()=>{
 const s=fresh();
 T.apply(s,'ally','tank',{key:'poisonImmunity',turns:3,chance:1},'tank');
 a.equal(T.apply(s,'ally','tank',{key:'poison',turns:3,chance:1},'foe-0'),false);
 T.apply(s,'ally','mage',{key:'ccImmunity',turns:3,chance:1},'mage');
 a.equal(T.apply(s,'ally','mage',{key:'stun',turns:2,chance:1},'foe-0'),false);
 s.enemies[0].stats=g.AdvengerStatDB.create({stats:{EFFECT_RESIST:1,CC_RESIST:1}});
 a.equal(T.apply(s,'enemy','foe-0',{key:'paralysis',turns:2,chance:1},'saber'),false);
 a.equal(T.apply(s,'enemy','foe-0',{key:'paralysis',turns:2,chance:1,ignoreResistance:true},'saber'),true);
});
test('poison DOT uses target max HP subject to attack cap; bleed stacks to five',()=>{
 const s=fresh(),foe=s.enemies[1];foe.hp=foe.maxHP;
 T.apply(s,'enemy',foe.id,{key:'poison',turns:2,chance:1},'saber');
 const start=foe.hp;
 const first=T.tick(s);
 const poisoned=first.find(x=>x.key==='poison');
 a.equal(poisoned.amount,Math.min(Math.round(foe.maxHP*.06),
  Math.round(g.AdvengerStatDB.forCharacter('saber').P_ATK*1.5)));
 a.equal(foe.hp,start-poisoned.amount);
 for(let i=0;i<7;i++)
  T.apply(s,'enemy',foe.id,{key:'bleed',turns:2,chance:1},'gunner');
 a.equal(T.find(s,'enemy',foe.id,'bleed').stacks,5);
 const tick=T.tick(s);
 a.equal(tick.find(x=>x.key==='bleed').amount,
  Math.round(g.AdvengerStatDB.forCharacter('gunner').P_ATK*.6*5));
});
test('shock retaliates on received damage, freeze breaks on hit, petrify hurts on cleanse',()=>{
 const s=fresh(),foe=s.enemies[1];
 T.apply(s,'enemy',foe.id,{key:'shock',turns:2,chance:1},'gunner');
 const hp=foe.hp,react=T.onHit(s,'enemy',foe.id,100);
 a.equal(hp-foe.hp,react[0].amount);
 a.equal(react[0].kind,'shockBonus');
 T.remove(s,'enemy',foe.id,'shock');
 T.apply(s,'enemy',foe.id,{key:'freeze',turns:1,chance:1},'mage');
 const frozen=T.onHit(s,'enemy',foe.id,100);
 a.ok(frozen.some(x=>x.key==='freeze'&&x.amount>0));
 a.equal(T.has(s,'enemy',foe.id,'freeze'),false);
 T.apply(s,'enemy',foe.id,{key:'petrify',turns:2,chance:1},'tank');
 const prior=foe.hp;
 a.equal(T.cleanse(s,'enemy',foe.id,1),1);
 a.ok(foe.hp<prior);
});
test('sleep wakes on 7 percent HP damage, but not from weaker hits',()=>{
 const s=fresh(),foe=s.enemies[1];
 T.apply(s,'enemy',foe.id,{key:'sleep',turns:2,chance:1},'saber');
 T.onHit(s,'enemy',foe.id,Math.floor(foe.maxHP*.069));
 a.equal(T.has(s,'enemy',foe.id,'sleep'),true);
 T.onHit(s,'enemy',foe.id,Math.ceil(foe.maxHP*.07));
 a.equal(T.has(s,'enemy',foe.id,'sleep'),false);
});
test('death reapplication knocks out target, Soul Death prevents passive revival',()=>{
 const s=fresh(),foe=s.enemies[1];
 a.equal(T.apply(s,'enemy',foe.id,{key:'death',turns:3,chance:1},'saber'),true);
 a.equal(T.apply(s,'enemy',foe.id,{key:'death',turns:3,chance:1},'saber'),true);
 a.equal(foe.hp,0);
 s.skillKits.saber='rachel';T.apply(s,'ally','saber',{key:'soulDeath',turns:3,chance:1},'foe-0');
 s.hp.saber=0;a.equal(S.onLethal(s,'saber'),false);
});
test('save and resume retains ailment turns, stacks and caster ATK information',()=>{
 const s=fresh();for(let i=0;i<3;i++)
  T.apply(s,'enemy','foe-1',{key:'bleed',turns:3,chance:1},'gunner');
 const saved=JSON.parse(JSON.stringify(s));
 const restored=fresh();S.restore(restored,saved);
 const bleed=T.find(restored,'enemy','foe-1','bleed');
 a.equal(bleed.turns,3);a.equal(bleed.stacks,3);
 a.equal(bleed.sourceAttack,g.AdvengerStatDB.forCharacter('gunner').P_ATK);
});
test('sequential 4-target x4-hit action rolls control per hit, then buffs self',()=>{
 const s=fresh();
 s.enemies.push({...s.enemies[1],id:'foe-3',hp:2000,maxHP:2000});
 D.register({id:'seq-control-test',name:'Sequential Test',skills:{
  basic:{name:'B',target:'singleEnemy',effects:[{type:'damage',attackPct:.5}]},
  skill1:{name:'Fourfold',target:'fourEnemies',effects:[
   {type:'damage',attackPct:.05,hits:4},
   {type:'status',key:'paralysis',turns:2,chance:1,eachHit:true},
   {type:'status',key:'attackUp',power:.4,turns:4,target:'self'}
  ]},
  skill2:{name:'Buff',target:'self',effects:[{type:'status',key:'attackUp',power:.4,turns:2}]},
  passive:{name:'P',triggers:[]}
 }});
 s.skillKits.saber='seq-control-test';
 const before=s.enemies.map(x=>x.hp);
 const report=S.cast(s,'saber','skill1','foe-0');
 a.equal(report.ok,true);
 const dmg=report.events.filter(x=>x.kind==='damage');
 const cc=report.events.filter(x=>x.kind==='status'&&x.key==='paralysis');
 a.equal(dmg.length,16,'each of four targets takes four separate hits');
 a.equal(cc.length,16,'each landed hit rolls the subsequent paralysis independently');
 a.equal(report.events.filter(x=>x.key==='attackUp').length,1);
 a.equal(T.find(s,'ally','saber','attackUp').power,.4);
 a.equal(S.adjustDamage(s,'ally','saber','enemy','foe-0',100),140);
 a.deepEqual(s.enemies.map(x=>before[0]-x.hp).length,4);
});
test('front-end has status library, training demo and correct module load order',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const srcs=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(srcs.indexOf('js/status-db.js')<srcs.indexOf('js/status-engine.js'));
 a.ok(srcs.indexOf('js/status-engine.js')<srcs.indexOf('js/skill-engine.js'));
 for(const id of ['ailmentCatalog','ailmentDemoKind','ailmentDemoEnemy','ailmentDemoAlly'])
  a.ok(html.includes('id="'+id+'"'),id);
 for(const p of ['js/app.js','js/skill-engine.js','js/status-engine.js'])
  a.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,p),'utf8')));
});
