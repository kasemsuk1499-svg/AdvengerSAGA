/* node --test tests/skill-importer.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const script=path.resolve(__dirname,'../scripts/import-skill-db.cjs');
const valid={id:'extra-hero',name:'Sample Hero',source:'https://example.org/source',skills:{
 basic:{name:'Attack',target:'singleEnemy',effects:[{type:'damage',attackPct:1}]},
 skill1:{name:'Skill One',target:'allEnemies',cooldownSeconds:75,effects:[{type:'damage',attackPct:.8,hits:2}]},
 skill2:{name:'Skill Two',target:'self',cooldownSeconds:85,effects:[{type:'status',key:'defenseUp',power:.2,turns:2}]},
 passive:{name:'Passive',triggers:[]}}};
test('importer creates an offline loadable data pack from a verified JSON array',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'adv-skill-'));
 try{
  const inp=path.join(dir,'heroes.json'),out=path.join(dir,'pack.js');
  fs.writeFileSync(inp,JSON.stringify([valid]));
  execFileSync(process.execPath,[script,inp,out],{stdio:'pipe'});
  const loaded=[];
  vm.runInNewContext(fs.readFileSync(out,'utf8'),{window:{AdvengerSkillDB:{upsert:h=>loaded.push(h)}}});
  assert.equal(loaded.length,1);assert.equal(loaded[0].skills.skill1.cooldownSeconds,75);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('importer rejects unsourced and unrecognized records',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'adv-skill-invalid-'));
 try{
  const inp=path.join(dir,'bad.json'),out=path.join(dir,'bad.js');
  fs.writeFileSync(inp,JSON.stringify([{...valid,source:'javascript:alert(1)'}]));
  assert.throws(()=>execFileSync(process.execPath,[script,inp,out],{stdio:'pipe'}));
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
