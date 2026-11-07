#!/usr/bin/env node
/* Import a user-reviewed JSON catalog into the static browser skill registry.
 * Does NOT scrape Netmarble, GameWith or third-party databases.
 * Run: node scripts/import-skill-db.cjs path/to/verified-skills.json
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const file=process.argv[2];
if(!file){
 console.error('Usage: node scripts/import-skill-db.cjs path/to/verified-skills.json [output.js]');
 process.exit(1);
}
const source=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
const records=Array.isArray(source)?source:source.heroes;
if(!Array.isArray(records))throw Error('Expect a JSON array or {"heroes":[...]}');
const allowedTargets=new Set(['self','singleEnemy','threeEnemies','fourEnemies','allEnemies','allAllies','singleAlly']);
const allowedEffects=new Set(['damage','heal','status','cleanse','reduceBuffDuration','revive']);
const seen=new Set();
for(const hero of records){
 if(!hero||!/^[a-z][a-z0-9-]*$/.test(hero.id||'')||seen.has(hero.id))
  throw Error('Invalid or duplicate hero ID: '+String(hero?.id));
 seen.add(hero.id);
 if(typeof hero.source!=='string'||!/^https:\/\//.test(hero.source))
  throw Error('An HTTPS source URL is required for each imported kit: '+hero.id);
 if(!hero.skills||!hero.skills.skill1||!hero.skills.skill2||!hero.skills.passive)
  throw Error('Missing mandatory skill1/skill2/passive: '+hero.id);
 for(const key of ['basic','skill1','skill2','awakening']){
  const s=hero.skills[key];if(!s)continue;
  if(!allowedTargets.has(s.target)||!Array.isArray(s.effects)||!s.effects.every(e=>e&&allowedEffects.has(e.type)))
   throw Error('Unrecognized target/effect: '+hero.id+'/'+key);
  if(s.cooldownSeconds!==undefined&&(!Number.isFinite(s.cooldownSeconds)||s.cooldownSeconds<0))
   throw Error('Invalid cooldown: '+hero.id+'/'+key);
 }
}
const out=path.resolve(process.argv[3]||path.join(__dirname,'..','js','skill-imports.js'));
const clean=JSON.stringify(records,null,1).replace(/</g,'\\u003c');
const content='/* Generated from a user-reviewed skill database export; sources are attached to records. */\n'+
 '(function(){\n const records='+clean+';\n for(const hero of records)window.AdvengerSkillDB.upsert(hero);\n})();\n';
fs.writeFileSync(out,content,'utf8');
console.log('Imported '+records.length+' records to '+out);
