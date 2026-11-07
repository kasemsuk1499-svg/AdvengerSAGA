/* AdvengerSAGA v1.5 — Skill Creator screen controller.
 * Data-only editor, no in-editor combat simulation or new animation loops.
 * Uses centralized status/stat/life definitions and only safe textContent / esc().
 */
(function(g){
 'use strict';
 const C=g.AdvengerSkillCreator;
 if(!C||!g.document)return;
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,x=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const text=(id,v)=>$(id).textContent=v;
 const options=[
  ['singleEnemy','ศัตรู 1 เป้าหมาย'],['twoEnemies','ศัตรู 2 เป้าหมาย'],
  ['threeEnemies','ศัตรู 3 เป้าหมาย'],['fourEnemies','ศัตรู 4 เป้าหมาย'],
  ['allEnemies','ศัตรูทั้งหมด'],['self','ตนเอง'],
  ['singleAlly','เพื่อนร่วมทีม 1 คน'],['twoAllies','เพื่อนร่วมทีม 2 คน'],
  ['allAllies','เพื่อนร่วมทีมทั้งหมด']
 ];
 const typeLabels={
  damage:'⚔️ สร้างความเสียหาย',status:'🌀 ใส่บัฟ / ดีบัฟ',
  heal:'💚 ฟื้น HP',cleanse:'🕊️ ล้างดีบัฟ',
  revive:'🌱 ชุบชีวิต',guts:'🛡️ Guts',
  autoRevive:'💠 Auto Revive',immortality:'✨ Immortality',
  execute:'💀 Execution',reduceBuffDuration:'⌛ ลดเวลาบัฟ'
 };
 let currentId=null;
 let draft=makeEmpty();
 function makeEmpty(){
  return {name:'',overlimit:false,target:'singleEnemy',
   damageType:'physical',cooldownRounds:3,
   effects:[{type:'damage',attackPct:1,defensePct:0,hpPct:0,hits:1}]};
 }
 function defaultFx(type){
  switch(type){
   case 'damage':return {type,attackPct:1,defensePct:0,hpPct:0,hits:1};
   case 'status':return {type,key:'paralysis',chance:null,turns:2,eachHit:false};
   case 'heal':return {type,attackPct:0,defensePct:1};
   case 'cleanse':return {type,count:1};
   case 'revive':return {type,hpPct:.4};
   case 'guts':return {type,uses:1};
   case 'autoRevive':return {type,hpPct:.5,uses:1};
   case 'immortality':return {type,turns:2,uses:1};
   case 'execute':return {type,hpThresholdPct:.24,attackLimitPct:1.2};
   case 'reduceBuffDuration':return {type,turns:1};
   default:throw Error('Unknown effect type');
  }
 }
 function chooseTarget(v,includeInherit){
  return (includeInherit?'<option value="">ตามเป้าหมายหลัก</option>':'')+
   options.map(([id,name])=>'<option value="'+id+'"'+(id===v?' selected':'')+'>'+
   esc(name)+'</option>').join('');
 }
 const numeric=(i,key,label,v,{percent=false,min=0,max=10000,step=1}={})=>{
  const shown=v==null?'':percent?Math.round(v*100000)/1000:v;
  return '<label>'+esc(label)+
   '<input data-step="'+i+'" data-field="'+esc(key)+'" '+(percent?'data-percent="1" ':'')+
   'type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+esc(shown)+'"></label>';
 };
 const select=(i,key,label,choices,current)=>{
  return '<label>'+esc(label)+'<select data-step="'+i+'" data-field="'+esc(key)+'">'+
   choices.map(([value,name])=>'<option value="'+esc(value)+'"'+
    (value===current?' selected':'')+'>'+esc(name)+'</option>').join('')+
    '</select></label>';
 };
 function renderEffects(){
  const limits=draft.overlimit?C.overlimitLimits:C.normalLimits;
  const pMax=limits.power*100;
  $('skillLabEffects').innerHTML=draft.effects.map((fx,i)=>{
   let fields=select(i,'type','ประเภทเอฟเฟกต์',C.types.map(id=>[id,typeLabels[id]]),fx.type)+
    '<label>เป้าหมายของขั้นนี้<select data-step="'+i+'" data-field="target">'+
    chooseTarget(fx.target||'',true)+'</select></label>';
   if(fx.type==='damage'){
    fields+=numeric(i,'hits','ฮิตต่อเป้าหมาย',fx.hits,{min:1,max:limits.hits})+
     numeric(i,'attackPct','ดาเมจจาก ATK (%)',fx.attackPct,{percent:true,max:pMax,step:.1})+
     numeric(i,'defensePct','ดาเมจจาก DEF (%)',fx.defensePct,{percent:true,max:pMax,step:.1})+
     numeric(i,'hpPct','ดาเมจจาก MAX_HP (%)',fx.hpPct,{percent:true,max:pMax,step:.1});
   }else if(fx.type==='status'){
    const keys=Object.entries(g.AdvengerStatusDB.labels).map(([k,label])=>[k,label+' ('+k+')']);
    fields+=select(i,'key','สถานะ',keys,fx.key)+
     numeric(i,'chance','โอกาสติดสถานะ (%)',fx.chance,{percent:true,max:100,step:.1})+
     numeric(i,'turns','ระยะเวลา (เทิร์น)',fx.turns,{min:1,max:999})+
     numeric(i,'power','ความแรง (%) · เว้นว่างได้',fx.power,{percent:true,max:pMax,step:.1})+
     '<label class="creator-check"><input type="checkbox" data-step="'+i+
     '" data-field="eachHit" '+(fx.eachHit?'checked':'')+
     '>ตรวจโอกาสแยกต่อฮิตที่โจมตีสำเร็จ</label>';
   }else if(fx.type==='heal'){
    fields+=numeric(i,'attackPct','ฮีลตาม ATK (%)',fx.attackPct,{percent:true,max:pMax,step:.1})+
     numeric(i,'defensePct','ฮีลตาม DEF (%)',fx.defensePct,{percent:true,max:pMax,step:.1});
   }else if(fx.type==='cleanse'){
    fields+=numeric(i,'count','จำนวนสถานะที่ล้าง',fx.count,{min:1,max:99});
   }else if(fx.type==='reduceBuffDuration'){
    fields+=numeric(i,'turns','ลดเวลาบัฟ (รอบ)',fx.turns,{min:1,max:999});
   }else if(fx.type==='revive'){
    fields+=numeric(i,'hpPct','HP หลังชุบ (%)',fx.hpPct,{percent:true,max:100,step:.1});
   }else if(fx.type==='guts'){
    fields+=numeric(i,'uses','จำนวนครั้งที่รอด',fx.uses,{min:1,max:limits.uses});
   }else if(fx.type==='autoRevive'){
    fields+=numeric(i,'hpPct','HP หลังฟื้น (%)',fx.hpPct,{percent:true,max:100,step:.1})+
     numeric(i,'uses','จำนวนครั้ง',fx.uses,{min:1,max:limits.uses});
   }else if(fx.type==='immortality'){
    fields+=numeric(i,'turns','จำนวนเทิร์นอมตะ',fx.turns,{min:1,max:999})+
     numeric(i,'uses','จำนวนครั้ง',fx.uses,{min:1,max:9});
   }else if(fx.type==='execute'){
    fields+=numeric(i,'hpThresholdPct','เกณฑ์ HP เป้าหมาย (%)',fx.hpThresholdPct,{percent:true,max:pMax,step:.1})+
     numeric(i,'attackLimitPct','เพดานเทียบ ATK (%)',fx.attackLimitPct,{percent:true,max:pMax,step:.1});
   }
   const note=fx.type==='status'&&fx.eachHit?
    'ตรวจหนึ่งครั้งต่อหนึ่งฮิตที่โดนเป้าหมายในขั้นโจมตีก่อนหน้า':
    fx.type==='damage'?'จำนวนฮิต × จำนวนเป้าหมาย ไม่ใช่แชร์จำนวนฮิตกัน':
    fx.type==='revive'?'ใช้กับเพื่อนที่ KO; ตั้งเป้าหมายของขั้นนี้เป็นเพื่อนร่วมทีมหรือทั้งหมด':'';
   return '<article class="creator-step-card'+(draft.overlimit?' creator-step-overlimit':'')+
    '" data-step-card="'+i+'">'+
    '<div class="creator-step-top"><strong>ขั้นที่ '+(i+1)+' · '+esc(typeLabels[fx.type])+'</strong>'+
    '<div class="creator-step-tools">'+
    '<button data-lab-step="up" data-step="'+i+'" '+(i===0?'disabled':'')+'>↑ เลื่อนขึ้น</button>'+
    '<button data-lab-step="down" data-step="'+i+'" '+(i===draft.effects.length-1?'disabled':'')+'>↓ เลื่อนลง</button>'+
    '<button data-lab-step="remove" data-step="'+i+'" '+(draft.effects.length===1?'disabled':'')+'>ลบขั้น</button></div></div>'+
    '<div class="creator-step-inputs">'+fields+'</div>'+
    (note?'<p class="creator-step-note">'+esc(note)+'</p>':'')+'</article>';
  }).join('');
  preview();
 }
 function message(v,error=false){
  text('skillLabMessage',v);
  $('skillLabMessage').classList.toggle('error',error);
 }
 function preview(){
  const raw={...draft};
  delete raw.id;
  $('skillLabPreview').textContent=JSON.stringify(raw,null,2);
  const hits=draft.effects.filter(x=>x.type==='damage')
   .reduce((sum,x)=>sum+Math.max(0,Number(x.hits)||0)*4,0);
  const limits=draft.overlimit?C.overlimitLimits:C.normalLimits;
  text('skillLabOverlimitInfo',draft.overlimit?
   '😈 OVERLIMIT ACTIVE · '+draft.effects.length+'/'+limits.effects+
   ' ขั้น · สูงสุด '+limits.hits.toLocaleString()+
   ' ฮิต/เป้าหมาย · ระเบิดดาเมจแบบรวมเพื่อไม่ให้แลค':
   'NORMAL · '+draft.effects.length+'/'+limits.effects+
   ' ขั้น · เปิด Overlimit เพื่อปลดพลัง');
  $('skillLabCooldown').max=String(limits.cooldown);
 }
 function readBase(){
  draft.name=$('skillLabName').value;
  draft.overlimit=!!$('skillLabOverlimit').checked;
  draft.target=$('skillLabTarget').value;
  draft.damageType=$('skillLabDamageType').value;
  const cd=$('skillLabCooldown').value;
  draft.cooldownRounds=cd===''?null:Number(cd);
 }
 function stepChanged(e){
  const el=e.target,i=Number(el.dataset.step),key=el.dataset.field;
  if(!Number.isInteger(i)||!draft.effects[i]||!key)return;
  if(key==='type'){
   const old=draft.effects[i],now=defaultFx(el.value);
   if(old.target)now.target=old.target;
   draft.effects[i]=now;
   renderEffects();return;
  }
  if(key==='target'){
   if(el.value)draft.effects[i].target=el.value;
   else delete draft.effects[i].target;
  }else if(key==='eachHit')draft.effects[i].eachHit=!!el.checked;
  else if(['key'].includes(key))draft.effects[i][key]=el.value;
  else{
   const raw=el.value;
   draft.effects[i][key]=raw===''?null:
    (Number(raw)/(el.dataset.percent==='1'?100:1));
  }
  preview();
 }
 function renderList(){
  const selected=currentId||'';
  $('skillLabList').innerHTML='<option value="">— สกิลใหม่ —</option>'+
   C.list().map(v=>'<option value="'+esc(v.id)+'"'+(v.id===selected?' selected':'')+'>'+
    esc(v.name)+'</option>').join('');
  $('skillLabList').value=selected;
 }
 function renderEquip(){
  const id=$('skillLabHero').value,slot=$('skillLabSlot').value;
  const assigned=C.equippedSource(id,slot);
  const animation=C.animationFor(id,slot);
  $('skillLabAnimation').value=animation?.id||'';
  text('skillLabEquipped',(assigned?'สกิล: '+assigned.name:
   'สกิล: ท่าเดิมของตัวละคร')+
   ' · ภาพท่า: '+(animation?.name||'อัตโนมัติ'));
 }
 function renderEquipCatalog(){
  const select=$('skillLabEquipSource');
  if(!select)return;
  const previous=select.value;
  const catalog=C.catalog();
  select.innerHTML='<option value="">— เลือกจากสกิลที่มีอยู่ —</option>'+
   [['native','⚔️ สกิลอาชีพเดิม'],['kit','📖 สกิลฐานข้อมูล Seven Knights'],
    ['custom','🧪 สกิลที่สร้างเอง']].map(([key,title])=>
     '<optgroup label="'+title+'">'+
     catalog[key].map(skill=>'<option value="'+esc(skill.id)+'">'+
     esc(skill.name)+'</option>').join('')+'</optgroup>'
    ).join('');
  select.value=catalog.all.some(x=>x.id===previous)?previous:'';
 }
 function renderBase(){
  $('skillLabName').value=draft.name||'';
  $('skillLabOverlimit').checked=!!draft.overlimit;
  $('skillLabTarget').value=draft.target;
  $('skillLabDamageType').value=draft.damageType;
  $('skillLabCooldown').value=draft.cooldownRounds??'';
  $('skillLabCooldown').max=String((draft.overlimit?
   C.overlimitLimits:C.normalLimits).cooldown);
 }
 function render(){
  renderList();renderBase();renderEffects();renderEquipCatalog();renderEquip();
 }
 function selectSkill(id){
  const chosen=id?C.get(id):null;
  currentId=chosen?.id||null;
  draft=chosen||makeEmpty();
  render();
  if(currentId)$('skillLabEquipSource').value=currentId;
  message(currentId?'กำลังแก้ไขสกิล '+draft.name:'พร้อมสร้างสกิลใหม่');
 }
 function save(){
  try{
   readBase();
   const result=currentId?C.update(currentId,draft):C.add(draft);
   currentId=result.id;draft=result;
   render();
   $('skillLabEquipSource').value=result.id;
   message('✅ บันทึก '+result.name+' ลงคลังแล้ว ('+result.effects.length+' ขั้น)');
  }catch(e){message('⚠️ '+e.message,true)}
 }
 function equip(){
  try{
   const selection=$('skillLabEquipSource')?.value||currentId;
   if(!selection)throw Error('เลือกสกิลจากคลัง หรือกดบันทึกสกิลใหม่ก่อน');
   C.assign($('skillLabHero').value,$('skillLabSlot').value,selection);
   C.assignAnimation($('skillLabHero').value,$('skillLabSlot').value,
    $('skillLabAnimation').value||null);
   renderEquip();message('✅ ติดตั้ง '+C.resolve(selection).name+
    ' แทนสกิลเดิมในช่องนี้แล้ว');
  }catch(e){message('⚠️ '+e.message,true)}
 }
 function bind(){
  const labs=$('skillLabEffects');
  labs.addEventListener('input',stepChanged);
  labs.addEventListener('change',stepChanged);
  labs.addEventListener('click',e=>{
   const btn=e.target.closest('button[data-lab-step]');
   if(!btn)return;
   const i=Number(btn.dataset.step),op=btn.dataset.labStep;
   if(i<0||i>=draft.effects.length)return;
   if(op==='remove'&&draft.effects.length>1)draft.effects.splice(i,1);
   if(op==='up'&&i>0)
    [draft.effects[i-1],draft.effects[i]]=[draft.effects[i],draft.effects[i-1]];
   if(op==='down'&&i<draft.effects.length-1)
    [draft.effects[i+1],draft.effects[i]]=[draft.effects[i],draft.effects[i+1]];
   renderEffects();
  });
  for(const id of ['skillLabName','skillLabCooldown','skillLabTarget','skillLabDamageType'])
   $(id).addEventListener('input',()=>{readBase();preview()});
  $('skillLabOverlimit').addEventListener('change',()=>{
   readBase();renderEffects();
   message(draft.overlimit?'😈 โหมด OVERLIMIT เปิดแล้ว · ปลดพลังได้ตามใจ!':
    'โหมด NORMAL · หากมีค่าเกินเพดานให้ลดก่อนบันทึก');
  });
  $('skillLabList').addEventListener('change',e=>selectSkill(e.target.value));
  $('skillLabHero').addEventListener('change',renderEquip);
  $('skillLabSlot').addEventListener('change',renderEquip);
  $('skillLabAnimationSave').addEventListener('click',()=>{
   try{
    C.assignAnimation($('skillLabHero').value,$('skillLabSlot').value,
     $('skillLabAnimation').value||null);
    renderEquip();
    message('✅ บันทึกแอนิเมชันแล้ว · สกิลเดิมและค่าดาเมจไม่เปลี่ยน');
   }catch(e){message('⚠️ '+e.message,true)}
  });
  $('skillLabAdd').addEventListener('click',()=>{
   const max=(draft.overlimit?C.overlimitLimits:C.normalLimits).effects;
   if(draft.effects.length>=max)return message('สูงสุด '+max+' ขั้น',true);
   draft.effects.push(defaultFx('damage'));renderEffects();
  });
  $('skillLabNew').addEventListener('click',()=>selectSkill(''));
  $('skillLabExample').addEventListener('click',()=>{
   currentId=null;draft=C.example();render();
   message('⚡ ตัวอย่าง 4×4: กำหนดโอกาสติดอัมพาตก่อนกดบันทึก (ยังไม่มีเปอร์เซ็นต์ที่ตกลงกัน)');
  });
  $('skillLabOverlimitExample').addEventListener('click',()=>{
   currentId=null;draft=C.overlimitExample();render();
   message('☄️ สกิลล้างโลก: 99,999 ฮิต × 4 เป้าหมาย · ยัดพลังได้อีก · กดบันทึกได้เลย');
  });
  $('skillLabSave').addEventListener('click',save);
  $('skillLabDuplicate').addEventListener('click',()=>{
   readBase();currentId=null;draft.name=(draft.name||'Untitled')+' (Copy)';
   render();message('สำเนายังไม่ได้บันทึก · กดบันทึกเพื่อสร้างรายการใหม่');
  });
  $('skillLabDelete').addEventListener('click',()=>{
   if(!currentId)return message('ยังไม่ได้เลือกสกิลที่บันทึก',true);
   const n=draft.name;
   if(typeof g.confirm==='function'&&!g.confirm('ลบสกิล "'+n+'" และถอดออกจากทุกตัวละคร?'))return;
   C.remove(currentId);selectSkill('');message('ลบสกิล '+n+' แล้ว');
  });
  $('skillLabEquip').addEventListener('click',equip);
  $('skillLabUnequip').addEventListener('click',()=>{
   C.assign($('skillLabHero').value,$('skillLabSlot').value,null);
   renderEquip();message('ถอดสกิลจากช่องนี้แล้ว');
  });
  $('skillLabExport').addEventListener('click',()=>{
   $('skillLabTransfer').value=JSON.stringify(C.exportData(),null,2);
   message('📤 ส่งออก JSON ไปยังช่องด้านล่างแล้ว คัดลอกไปสำรองไว้ได้');
  });
  $('skillLabImport').addEventListener('click',()=>{
   try{
    const raw=$('skillLabTransfer').value;
    if(raw.length>8000000)throw Error('ข้อมูลนำเข้าใหญ่เกิน 8 MB');
    const parsed=JSON.parse(raw);
    if(typeof g.confirm==='function'&&!g.confirm('นำเข้าคลังสกิลจาก JSON และแทนที่คลังเดิมในเบราว์เซอร์นี้?'))return;
    C.importData(parsed);
    selectSkill('');message('✅ นำเข้าสกิล '+C.list().length+' รายการสำเร็จ');
   }catch(e){message('⚠️ นำเข้าไม่ได้: '+e.message,true)}
  });
 }
 function init(){
  C.load();
  $('skillLabAnimation').innerHTML='<option value="">อัตโนมัติ · ใช้ภาพท่าเดิม</option>'+
   g.AdvengerAnimations.all().map(animation=>
    '<option value="'+esc(animation.id)+'">'+esc(animation.name)+'</option>'
   ).join('');
  $('skillLabTarget').innerHTML=chooseTarget('singleEnemy',false);
  $('skillLabHero').innerHTML=g.AdvengerCharacters.all().map(x=>
   '<option value="'+esc(x.id)+'">'+esc(x.nameTh||x.name)+'</option>').join('');
  $('skillLabHero').value=g.AdvengerCharacters.all()[0]?.id||'saber';
  bind();render();
 }
 init();
 g.AdvengerSkillCreatorUI=Object.freeze({render,selectSkill});
})(window);
