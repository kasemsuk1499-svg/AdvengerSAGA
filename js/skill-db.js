/* AdvengerSAGA v1.0 — small, attributed 7K Re:BIRTH skill-data starter catalog.
 * Public skill facts/numeric parameters are credited per hero. No images or game assets.
 * This is a CURATED subset, not the game's full database and not an official integration.
 * Extend via AdvengerSkillDB.register(heroRecord).
 */
(function(g){
 'use strict';
 const all=new Map();
 const status=(key,power,turns,chance=1,extra={})=>({type:'status',key,power,turns,chance,...extra});
 const damage=(attackPct,hits=1,extra={})=>({type:'damage',attackPct,hits,...extra});
 const heroRecords=[
  {id:'rachel',name:'Rachel',nameTh:'ราเชล',role:'Attack',source:'https://gamewith.net/sevenknights-rebirth/70604',
   sourceChecked:'2026-11-07',
   skills:{
    basic:{name:'Normal Attack',target:'singleEnemy',effects:[damage(1),status('burn',.2,2,.40)]},
    skill1:{name:'Blazing Strike',cooldownSeconds:84,target:'singleEnemy',
     effects:[damage(1.02,2),status('attackDown',.22,5),status('damageReductionDown',.17,5),status('burn',.2,3,.8)],
     enhancements:[{type:'damagePct',value:1.22}]},
    skill2:{name:'Phoenix Strike',cooldownSeconds:84,target:'threeEnemies',
     effects:[status('defenseDown',.29,3),status('physicalVulnerability',.22,3),damage(1.60)],
     enhancements:[{type:'defenseDown',value:.36},{type:'physicalVulnerability',value:.28}]},
    passive:{name:'Power of Flames',target:'self',
     triggers:[{event:'battleStart',target:'allAllies',effect:status('weaknessBoost',.22,999)},
               {event:'lethal',target:'self',effect:{type:'revive',hpPct:.80,oncePerBattle:true}}]}
   }},
  {id:'lucy',name:'Lucy',nameTh:'ลูซี่',role:'Support',source:'https://gamewith.net/sevenknights-rebirth/70557',
   sourceChecked:'2026-11-07',
   skills:{
    basic:{name:'Normal Attack',target:'singleEnemy',
     effects:[{type:'damage',attackPct:.5,defensePct:.6,hits:1},status('attackDown',.09,2)]},
    skill1:{name:'Mystic Dance',cooldownSeconds:95,target:'allAllies',
     effects:[{type:'heal',defensePct:1}],enhancements:[{type:'healDefensePct',value:1.2}]},
    skill2:{name:"Dancer's Prayer",cooldownSeconds:80,target:'allAllies',requiresDebuff:true,
     effects:[{type:'cleanse',count:2},status('defenseUp',.18,3)],
     enhancements:[{type:'defenseUp',value:.22}]},
    passive:{name:'Spirit Dancer',target:'allAllies',
     triggers:[{event:'battleStart',target:'allAllies',effect:status('poisonImmunity',1,2)}]}
   }},
  {id:'ellen',name:'Ellen',nameTh:'เอลเลน',role:'Attack',source:'https://gamewith.net/sevenknights-rebirth/70587',
   sourceChecked:'2026-11-07',
   skills:{
    basic:{name:'Normal Attack',target:'singleEnemy',effects:[damage(.9)]},
    skill1:{name:'Keen Arrow',cooldownSeconds:60,target:'singleEnemy',
     effects:[damage(2.45),{type:'reduceBuffDuration',turns:1,chance:1}]},
    skill2:{name:'Enhance Arrows',cooldownSeconds:60,target:'self',
     effects:[status('physicalDamageUp',.2,5)]},
    passive:{name:'Evasive Maneuvers',target:'self',
     triggers:[{event:'battleStart',target:'self',effect:status('magicImmunity',1,2)}]}
   }}
 ];
 const VALID_TARGETS=new Set(['self','singleEnemy','threeEnemies','allEnemies','allAllies','singleAlly']);
 const VALID_TYPES=new Set(['damage','heal','status','cleanse','reduceBuffDuration','revive']);
 function register(entry){
  if(!entry||typeof entry.id!=='string'||!/^[a-z][a-z0-9-]*$/.test(entry.id)||all.has(entry.id))
   throw new Error('Invalid or duplicate skill database hero');
  if(!entry.skills||!entry.skills.skill1||!entry.skills.skill2||!entry.skills.passive)throw new Error('Missing core skill records');
  for(const key of ['basic','skill1','skill2']){
   const skill=entry.skills[key];if(!skill)continue;
   if(!VALID_TARGETS.has(skill.target)||!Array.isArray(skill.effects)||
      skill.effects.some(e=>!VALID_TYPES.has(e.type)))
    throw new Error('Invalid skill in '+entry.id+': '+key);
  }
  const record=JSON.parse(JSON.stringify(entry));
  all.set(record.id,record);return record;
 }
 for(const hero of heroRecords)register(hero);
 g.AdvengerSkillDB=Object.freeze({
  version:'1.0',register,get:id=>all.get(id)||null,
  skill:(id,key)=>all.get(id)?.skills?.[key]||null,
  all:()=>Array.from(all.values()),
  targetTypes:Object.freeze(Array.from(VALID_TARGETS)),
  secondsPerRound:30,
  rounds:seconds=>Math.max(0,Math.ceil((Number(seconds)||0)/30))
 });
})(window);
