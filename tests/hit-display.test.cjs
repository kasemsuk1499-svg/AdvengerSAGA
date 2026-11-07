/* node --test tests/hit-display.test.cjs
 * Small skills must show REAL per-hit numbers. Giant skills must never
 * spawn a million DOM damage sprites; visible combo counters distinguish
 * successfully landed from configured hits, including early KO.
 */
const test=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function boot(){
 const numbers=[],impacts=[],headlines=[],messages=[];
 const combo={hidden:true,
  set textContent(v){messages.push(v)},get textContent(){return messages.at(-1)}
 };
 const enemy={dataset:{targetEnemy:'foe-0'}};
 const actor={dataset:{fieldUnit:'saber'}};
 const document={createElement:()=>({
  className:'',textContent:'',style:{},remove(){},
  animate:null
 })};
 const g={window:null,document,console,setTimeout:callback=>{
  callback();return 1;
 }};
 g.window=g;vm.createContext(g);
 const load=p=>new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p}).runInContext(g);
 load('js/hit-display.js');
 load('js/shared-arena.js');
 const arena=Object.create(g.AdvengerSharedArena.prototype);
 arena.party=['saber'];arena.busy=false;arena.reduced=true;
 arena.focus=()=>{};
 arena.actor=()=>actor;
 arena.stage={
  classList:{add(){},remove(){}},append(){},
  querySelector:selector=>selector==='#asCombo'?combo:null,
  querySelectorAll:selector=>selector==='[data-target-enemy]'?[enemy]:[]
 };
 arena.field={point:()=>({x:10,y:20}),
  impact:(...args)=>impacts.push(args),
  emit(){},color:()=>"#ffb74a"};
 arena.announce=(...args)=>headlines.push(args);
 arena.hitNumber=(...args)=>numbers.push(args);
 return {g,planner:g.AdvengerHitDisplay,arena,numbers,impacts,
  headlines,messages,combo};
}
const damage=(amount,index)=>({kind:'damage',side:'enemy',id:'foe-0',
 amount,hitIndex:index});
test('4-hit skill shows four independent damage values, not their sum',()=>{
 const {planner}=boot();
 const p=planner.plan({events:[damage(120,1),damage(90,2),damage(80,3),damage(70,4)]});
 a.equal(p.configuredHits,4);a.equal(p.landedHits,4);
 a.equal(p.shownHits,4);a.equal(p.sampled,false);
 a.deepEqual(Array.from(p.frames,x=>x.amount),[120,90,80,70]);
 a.deepEqual(Array.from(p.frames,x=>x.hitNumber),[1,2,3,4]);
});
test('4 targets × 4 hits keeps all 16 independent number frames',()=>{
 const {planner}=boot();
 const e=['foe-0','foe-1','foe-2','foe-3'].flatMap(id=>
  Array.from({length:4},(_,i)=>({...damage(140-i*10,i+1),id})));
 const p=planner.plan({events:e});
 a.equal(p.configuredHits,16);a.equal(p.landedHits,16);
 a.equal(p.shownHits,16);a.equal(p.sampled,false);
 a.equal(p.frames.filter(x=>x.id==='foe-3').length,4);
 a.equal(p.frames[15].hitNumber,16);
});
test('100 landed hits show 100 real per-hit numbers without aggregation',()=>{
 const {planner}=boot();
 const p=planner.plan({events:Array.from({length:100},(_,i)=>damage(i+1,i+1))});
 a.equal(p.shownHits,100);a.equal(p.sampled,false);
 a.equal(p.frames[0].amount,1);a.equal(p.frames[99].amount,100);
});
test('100 programmed hits but target dies after 3: display 40,40,20 and 3/100, not 100/100',()=>{
 const {planner}=boot();
 const p=planner.plan({events:[{
  ...damage(100,1),compact:true,hits:100,landedHits:3,
  packets:[{hits:3,perHit:40,damage:100}]
 }]});
 a.equal(p.configuredHits,100);a.equal(p.landedHits,3);
 a.deepEqual(Array.from(p.frames,x=>x.amount),[40,40,20]);
 a.deepEqual(Array.from(p.frames,x=>x.hitNumber),[1,2,3]);
});
test('1M landed hits show at most 120 accurate sampled amounts with a 1M counter',()=>{
 const {planner}=boot();
 const p=planner.plan({events:[{
  ...damage(1000000,1),compact:true,hits:1000000,
  landedHits:1000000,
  packets:[{hits:1000000,perHit:1,damage:1000000}]
 }]});
 a.equal(p.configuredHits,1000000);a.equal(p.landedHits,1000000);
 a.equal(p.shownHits,120);a.equal(p.sampled,true);
 a.ok(p.frames.every(x=>x.amount===1));
 a.equal(p.frames[0].hitNumber,1);
 a.equal(p.frames.at(-1).hitNumber,1000000);
});
test('Overlimit four enemies killed on first landed hit: counter truthfully says 4 of 399996',()=>{
 const {planner}=boot();
 const p=planner.plan({events:[0,1,2,3].map(i=>({
  ...damage(400,i+1),id:'foe-'+i,compact:true,
  hits:99999,landedHits:1,
  packets:[{hits:1,perHit:1000,damage:400}]
 }))});
 a.equal(p.configuredHits,399996);
 a.equal(p.landedHits,4);
 a.equal(p.shownHits,4);
 a.deepEqual(Array.from(p.frames,x=>x.amount),[400,400,400,400]);
});
test('revive/Guts packets preserve individual numbers at each lethal boundary',()=>{
 const {planner}=boot();
 const p=planner.plan({events:[{
  ...damage(130,1),compact:true,hits:1000,landedHits:4,
  packets:[{hits:2,perHit:40,damage:65},
   {hits:2,perHit:40,damage:65}]
 }]});
 a.deepEqual(Array.from(p.frames,x=>x.amount),[40,25,40,25]);
 a.equal(p.landedHits,4);
});
test('arena displays actual numbers one by one and updates HIT meter incrementally',async()=>{
 const {arena,numbers,messages,combo}=boot();
 const report={ok:true,hero:{name:'original'},
  targets:[{side:'enemy',id:'foe-0'}],
  events:[damage(40,1),damage(35,2),damage(30,3),damage(25,4)]};
 const done=await arena.playDatabaseSkill('saber',{name:'Quad',effects:[]},
  report,null,'fire');
 a.equal(done,true);
 a.deepEqual(numbers.map(x=>x[0]),[40,35,30,25]);
 a.ok(messages.some(x=>x.includes('1 / 4 HIT')));
 a.ok(messages.some(x=>x.includes('4 / 4 HIT')));
 a.equal(combo.hidden,true);
});
test('arena can show a million-hit count without a million floating number nodes',async()=>{
 const {arena,numbers,messages}=boot();
 const report={ok:true,hero:{name:'original'},
  targets:[{side:'enemy',id:'foe-0'}],
  events:[{...damage(1000000,1),compact:true,hits:1000000,
   landedHits:1000000,
   packets:[{hits:1000000,perHit:1,damage:1000000}]}]};
 const done=await arena.playDatabaseSkill('saber',
  {name:'Infinite',overlimit:true,effects:[]},report,null,'fire');
 a.equal(done,true);
 a.equal(numbers.length,120);
 a.equal(numbers[0][0],1);
 a.equal(numbers.at(-1)[0],1);
 a.ok(messages.some(x=>x.includes('1,000,000 / 1,000,000 HIT')));
});
test('web app loads hit-display module before SharedArena and includes combo CSS',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 a.ok(scripts.indexOf('js/hit-display.js')>0);
 a.ok(scripts.indexOf('js/hit-display.js')<scripts.indexOf('js/shared-arena.js'));
 a.match(html,/css\/hit-display\.css/);
 const arena=fs.readFileSync(path.join(root,'js/shared-arena.js'),'utf8');
 a.match(arena,/id="asCombo"/);
});
