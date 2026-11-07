/* AdvengerSAGA shared battlefield — exactly four visible primary heroes.
   Each class' action code comes from characters/<id>/character.js; the stage
   only supplies reusable movement, VFX and feedback primitives. */
(function(g){
 'use strict';
 const wait=ms=>new Promise(ok=>setTimeout(ok,ms));
 const esc=v=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
 class SharedArena{
  constructor(stage){
   if(!stage)throw new Error('Shared arena stage not found');
   this.stage=stage;this.party=[];this.active=null;this.busy=false;
   this.field=null;this.lastAction='READY TO ENGAGE';this.enemySignature='';
   this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  mount(party,selected,enemies=[],targetId=null){
   if(this.busy)return;
   if(party.length!==4||new Set(party).size!==4)throw Error('Shared arena requires exactly four unique units');
   if(this.field){this.field.destroy();this.field=null;}
   this.party=party.slice();this.active=selected;
   const actors=party.map((id,i)=>{
    const char=AdvengerCharacters.get(id);
    if(!char)throw Error('Missing character module: '+id);
    return '<button type="button" class="as-fighter'+(selected===id?' selected':'')+
     '" data-field-unit="'+esc(id)+'" data-slot="'+i+'" aria-label="เลือก '+esc(char.name)+'" aria-pressed="'+(id===selected)+'">'+
     '<span class="as-rank">'+(i===0||i===2?'FRONT':'REAR')+'</span>'+
     '<img class="as-sprite" draggable="false" src="'+esc(char.art)+'" alt="'+esc(char.name)+'">'+
     '<span class="as-marker" aria-hidden="true"></span>'+
     '<span class="as-name">'+char.icon+' '+esc(char.name)+'</span>'+
     '<span class="as-hp"><i></i></span>'+
     '<span class="as-ex"><i></i></span></button>';
   }).join('');
   this.stage.innerHTML='<div class="as-backdrop" aria-hidden="true">'+
    '<div class="as-moon"></div><div class="as-ruins"></div><div class="as-ground"></div></div>'+
    '<div class="as-stage-note">BATTLE 01 / 01 · FIELD 01</div>'+
    '<div class="as-party-ground" aria-hidden="true"></div>'+actors+
    '<div class="as-foes" id="asFoes"></div>'+
    '<canvas class="as-fx" id="asFx" aria-hidden="true"></canvas>'+
    '<div id="asAction" class="as-action" aria-live="polite">เลือกสมาชิกแล้วกดโจมตี</div>'+
    '<div id="asCinematic" class="as-cinematic" aria-hidden="true">'+
    '<div class="as-portrait"></div><div class="as-cinematic-copy"><small>ULTIMATE TECHNIQUE</small>'+
    '<strong></strong><span></span></div></div>';
   this.enemySignature='';this.syncEnemies(enemies,targetId);
   this.field=new AdvengerEffectField(this.stage,this.stage.querySelector('#asFx'));
   for(const el of this.stage.querySelectorAll('.as-fighter')){
    const c=AdvengerCharacters.get(el.dataset.fieldUnit),img=el.querySelector('.as-sprite');
    img.addEventListener('error',()=>{if(!img.dataset.fallback&&img.getAttribute('src')!==c.fallback){img.dataset.fallback='1';img.src=c.fallback;}});
   }
   this.focus(selected);
  }
  syncEnemies(enemies=[],targetId=null){
   const root=this.stage.querySelector('#asFoes');
   if(!root)return;
   const signature=enemies.map(e=>e.id+':'+e.kind).join('|');
   if(signature!==this.enemySignature){
    const count=enemies.length;
    root.innerHTML=enemies.map((foe,i)=>'<button type="button" class="as-target" data-target-enemy="'+esc(foe.id)+
     '" data-count="'+count+'" data-slot="'+i+'" aria-label="เลือกเป้าหมาย '+esc(foe.name)+'">'+
     '<span class="as-lock" aria-hidden="true">TARGET</span>'+
     '<img src="'+esc(foe.art)+'" data-char-fallback="'+esc(foe.fallback||foe.art)+'" draggable="false" alt="">'+
     '<span class="as-target-name">'+esc(foe.name)+'</span></button>').join('');
    this.enemySignature=signature;
   }
   for(const e of enemies){
    const el=Array.from(root.querySelectorAll('.as-target')).find(n=>n.dataset.targetEnemy===e.id);
    if(!el)continue;
    el.classList.toggle('dead',e.hp<=0);el.disabled=e.hp<=0;
    el.setAttribute('aria-label',e.name+' HP '+e.hp+'/'+e.maxHP+(e.hp<=0?' KO':''));
    const mark=el.querySelector('.as-lock');if(mark)mark.textContent=e.hp<=0?'KO':'';
   }
   this.selectTarget(targetId);
  }
  selectTarget(id){
   const nodes=Array.from(this.stage.querySelectorAll('.as-target'));
   this.target=nodes.find(n=>n.dataset.targetEnemy===id&&!n.disabled)||
    nodes.find(n=>!n.disabled)||nodes[0]||null;
   for(const node of nodes){
    const chosen=node===this.target&&!node.disabled;
    node.classList.toggle('selected',chosen);
    const lock=node.querySelector('.as-lock');
    if(lock&&!node.disabled)lock.textContent=chosen?'TARGET':'';
    node.setAttribute('aria-pressed',String(chosen));
   }
  }
  focus(id){
   if(!this.party.includes(id))return;
   this.active=id;
   for(const el of this.stage.querySelectorAll('.as-fighter')){
    const yes=el.dataset.fieldUnit===id;el.classList.toggle('selected',yes);el.setAttribute('aria-pressed',String(yes));
   }
  }
  actor(id){return this.stage.querySelector('.as-fighter[data-field-unit="'+id+'"]')}
  energy(energyValues){
   for(const id of this.party){
    const n=this.actor(id);if(n){const bar=n.querySelector('.as-ex i');bar.style.width=Math.max(0,Math.min(100,energyValues?.[id]||0))+'%'}
   }
  }
  status(hp,maxHp,acted,guarded,phase,activeId){
   for(const id of this.party){
    const n=this.actor(id);if(!n)continue;
    const amount=Math.max(0,hp?.[id]||0),max=Math.max(1,maxHp?.[id]||1);
    const fallen=amount<=0,done=!!acted?.[id];
    n.classList.toggle('fallen',fallen);
    n.classList.toggle('acted',done&&!fallen);
    n.classList.toggle('guarding',!!guarded?.[id]&&!fallen);
    const bar=n.querySelector('.as-hp i');
    if(bar)bar.style.width=Math.round(amount/max*100)+'%';
    const token=n.querySelector('.as-marker');
    if(token)token.textContent=fallen?'KO':phase==='enemy'?'WAIT':
      done?'DONE':id===activeId&&phase==='player'?'NEXT':'';
    n.disabled=fallen||done||phase!=='player'||id!==activeId;
    n.setAttribute('aria-label',AdvengerCharacters.get(id).name+' HP '+amount+'/'+max+
      (fallen?' ถูกน็อก':done?' ใช้เทิร์นแล้ว':' พร้อมใช้เทิร์น'));
   }
  }
  async guard(id){
   const actor=this.actor(id);
   if(!actor)return;
   this.focus(id);
   const p=this.field.point(actor);
   this.announce('GUARD','ตั้งรับแรงโจมตีศัตรู · EX +15');
   this.field.emit('shield',p,p,'#8bdbff',this.reduced?130:460,{radius:43});
   if(!this.reduced&&actor.animate){
    actor.animate([
     {transform:'translateY(0) scale(1)'},
     {offset:.45,transform:'translateY(-6px) scale(1.07)'},
     {transform:'translateY(0) scale(1)'}
    ],{duration:500,easing:'ease-in-out'});
   }
   await wait(this.reduced?130:480);
  }
  async enemyAttack(id,damage,guarded=false,enemyName='Enemy'){
   const target=this.actor(id);
   if(!target||!this.target)return;
   this.announce('ENEMY TURN',enemyName+' → '+AdvengerCharacters.get(id).name);
   const from=this.field.point(this.target),to=this.field.point(target);
   const color=guarded?'#7dcfff':'#ff9c97';
   this.field.emit('projectile',from,to,color,this.reduced?130:480,{role:'bullet'});
   await wait(this.reduced?130:480);
   this.field.impact(this.field.point(target),color,guarded?0.7:1.25,'heavy');
   if(!this.reduced&&target.animate){
    target.animate([
     {transform:'translate3d(0,0,0)',filter:'brightness(1)'},
     {offset:.18,transform:'translate3d(13px,-5px,0) rotate(4deg)',filter:'brightness(1.5)'},
     {offset:.65,transform:'translate3d(-5px,1px,0) rotate(-2deg)',filter:'brightness(1)'},
     {transform:'translate3d(0,0,0)',filter:'brightness(1)'}
    ],{duration:380,easing:'ease-out'});
   }
   if(damage>0)this.hitNumber(damage,color,target);
   await wait(this.reduced?130:400);
  }
  announce(label,detail){
   const n=this.stage.querySelector('#asAction');
   if(n)n.textContent=label+' · '+detail;
  }
  async cinematic(title,subtitle,duration=830){
   const overlay=this.stage.querySelector('#asCinematic'),actor=this.actor(this.active);
   const portrait=overlay.querySelector('.as-portrait'),char=AdvengerCharacters.get(this.active);
   portrait.innerHTML='<img src="'+esc(char.cutin||char.portrait||char.art)+'" data-char-fallback="'+esc(char.fallback||char.art)+'" alt="">';
   overlay.querySelector('strong').textContent=title;
   overlay.querySelector('span').textContent=subtitle;
   overlay.classList.add('show');
   await wait(this.reduced?80:duration);
   overlay.classList.remove('show');
  }
  async translate(el,frames,duration){
   if(!el?.animate||this.reduced){await wait(this.reduced?40:duration);return}
   const animation=el.animate(frames,{duration,easing:'cubic-bezier(.18,.65,.23,1)',fill:'none'});
   try{await animation.finished}catch(e){/* animation interrupted by navigation */}
  }
  rush(duration,type){
   const el=this.actor(this.active),enemy=this.target;
   if(!el||!enemy)return wait(duration);
   const a=el.getBoundingClientRect(),b=enemy.getBoundingClientRect();
   // Direction-aware rush: attacker now starts on the RIGHT and strikes the
   // LEFT-side target. Supports either side if the formation changes later.
   const actorX=a.left+a.width*.5,enemyX=b.left+b.width*.5;
   const direction=Math.sign(enemyX-actorX)||-1;
   const standOff=Math.max(20,(a.width+b.width)*.38);
   const travel=Math.max(0,Math.abs(enemyX-actorX)-standOff);
   const deltaX=direction*Math.min(travel,this.stage.getBoundingClientRect().width*.81);
   const deltaY=(b.top+b.height*.52)-(a.top+a.height*.52);
   const tilt=(type==='heavy'?3:8)*direction;
   const f=(offset,x,y,scale,rot)=>({offset,
    transform:'translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) scale('+scale+') rotate('+rot+'deg)'});
   el.classList.add('performing');
   const frames=[f(0,0,0,1,0),f(.13,-direction*12,4,.96,-tilt*.5),
    f(.31,deltaX*.29,deltaY*.25,1.04,tilt*.2),
    f(.55,deltaX,deltaY,1.14,tilt),
    f(.69,deltaX,deltaY,1.08,tilt*.65),
    f(.9,deltaX*.13,deltaY*.1,.98,0),f(1,0,0,1,0)];
   return this.translate(el,frames,duration).finally(()=>el.classList.remove('performing'));
  }
  strafe(duration){
   const el=this.actor(this.active);if(!el)return wait(duration);
   el.classList.add('performing');
   return this.translate(el,[
    {offset:0,transform:'translate3d(0,0,0)'},
    {offset:.22,transform:'translate3d(-22px,-15px,0)'},
    {offset:.42,transform:'translate3d(26px,-7px,0)'},
    {offset:.68,transform:'translate3d(-10px,10px,0)'},
    {offset:.88,transform:'translate3d(20px,0,0)'},
    {offset:1,transform:'translate3d(0,0,0)'}
   ],duration).finally(()=>el.classList.remove('performing'));
  }
  async actorPose(duration,intensity=1){
   const el=this.actor(this.active);
   const p=this.translate(el,[
    {transform:'translateY(0) scale(1)',filter:'brightness(1)'},
    {offset:.55,transform:'translateY(-7px) scale('+(1+.06*intensity)+')',filter:'brightness(1.35)'},
    {transform:'translateY(0) scale(1)',filter:'brightness(1)'}
   ],duration);
   await p;
  }
  recoil(){
   const el=this.target;
   if(!el||!el.animate||this.reduced)return;
   el.animate([{transform:'translate3d(0,0,0)',filter:'brightness(1)'},
    {offset:.2,transform:'translate3d(12px,-4px,0) rotate(4deg)',filter:'brightness(1.7)'},
    {offset:.54,transform:'translate3d(-6px,0,0) rotate(-3deg)',filter:'brightness(1.2)'},
    {transform:'translate3d(0,0,0)',filter:'brightness(1)'}],
    {duration:340,easing:'ease-out'});
  }
  hitNumber(n,color,node=this.target){
   const tgt=this.field.point(node),el=document.createElement('span');
   el.className='as-number';el.textContent='−'+n;el.style.cssText='left:'+tgt.x+'px;top:'+(tgt.y-30)+'px;color:'+color;
   this.stage.append(el);
   if(el.animate&&!this.reduced){
    let a=el.animate([{opacity:0,transform:'translate(-50%,0) scale(.7)'},
      {offset:.28,opacity:1,transform:'translate(-50%,-18px) scale(1.13)'},
      {offset:.72,opacity:1,transform:'translate(-50%,-38px) scale(1)'},
      {opacity:0,transform:'translate(-50%,-65px) scale(.93)'}],
      {duration:890,easing:'ease-out'});
    a.finished.then(()=>el.remove()).catch(()=>el.remove());
   }else setTimeout(()=>el.remove(),600);
  }
  async play(id,kind,element,onDamage,sourceHeroId=null){
   if(this.busy||!this.party.includes(id))return false;
   const owner=AdvengerCharacters.get(id);
   const character=AdvengerCharacters.get(sourceHeroId||id);
   if(!owner||!character||!['basic','skill','ultimate'].includes(kind))return false;
   this.focus(id);this.busy=true;
   this.stage.classList.add('as-busy');
   const color=window.AdvengerElements?.get(element)?.color||
    character.colors.find(([name])=>name===element)?.[2]||character.accent;
   const origin=()=>this.field.point(this.actor(id));
   const target=()=>this.field.point(this.target);
   const fx=this.field;
   let strikes=0;
   const api={
    wait:ms=>wait(this.reduced?Math.min(ms,65):ms),
    announce:(title,msg)=>this.announce(title,msg),
    rush:(ms,type)=>this.rush(this.reduced?65:ms,type),
    strafe:ms=>this.strafe(this.reduced?65:ms),
    aim:async ms=>{fx.emit('lock',target(),target(),color,ms,{radius:35});await this.actorPose(this.reduced?65:ms,.5)},
    charge:async ms=>{fx.emit('charge',origin(),origin(),color,ms);await this.actorPose(this.reduced?65:ms,1)},
    cinematic:(title,subtitle,ms)=>this.cinematic(title,subtitle,ms),
    projectile:async(ms,mode)=>{fx.emit('projectile',origin(),target(),color,ms,{role:mode});await wait(this.reduced?65:ms)},
    meteor:async ms=>{const t=target();fx.emit('meteor',{x:t.x+35,y:-35},t,color,ms,{role:'meteor'});await wait(this.reduced?65:ms)},
    rune:ms=>fx.emit('rune',target(),target(),color,ms,{radius:54}),
    lock:ms=>fx.emit('lock',target(),target(),color,ms,{radius:43}),
    shield:ms=>fx.emit('shield',origin(),origin(),color,ms,{radius:52}),
    beam:ms=>fx.emit('beam',origin(),target(),color,ms,{intensity:kind==='ultimate'?1.3:1}),
    hit:(amount,style='slash',critical=false)=>{
     strikes++;
     const p=target();this.recoil();fx.impact(p,color,critical?1.65:1,style);
     if(style==='slash')fx.emit('slash',p,p,color,340,{intensity:critical?1.5:1});
     const dealt=Math.max(0,Math.round(onDamage(amount,kind,critical,strikes)||0));
     if(dealt)this.hitNumber(dealt,color);
    }
   };
   try{
    await character.perform(api,kind);
    this.announce('ACTION COMPLETE',owner.name+' · '+strikes+' HITS');
    return true;
   }catch(e){
    console.error('Character ability failed',id,kind,e);
    this.announce('ACTION ERROR','พบข้อผิดพลาดในท่าโจมตี');
    return false;
   }finally{
    this.busy=false;
    this.stage.classList.remove('as-busy');
   }
  }
  async playReanimated(id,kind,element,onDamage,sourceHeroId,animationId){
   const chosen=window.AdvengerAnimations?.get(animationId);
   if(!chosen)return this.play(id,kind,element,onDamage,sourceHeroId);
   // Sample the original move's damage packets without visuals, then run
   // the chosen choreography VISUALLY ONLY. The selected animation cannot
   // change hit count, coefficients, EX cost, damage or status effects.
   let hits;
   try{hits=await window.AdvengerAnimations.capture(sourceHeroId||id,kind)}
   catch(e){console.error('Animation damage capture',e);return false}
   const success=await this.play(id,chosen.kind,element,()=>0,chosen.classId);
   if(!success)return false;
   let number=0;
   const color=window.AdvengerElements?.get(element)?.color||
    window.AdvengerCharacters.get(id)?.accent||'#fff';
   for(const h of hits){
    number++;
    const dealt=onDamage(h.amount,kind,h.critical,number);
    if(dealt>0)this.hitNumber(dealt,color);
   }
   return true;
  }
  async playDatabaseSkill(id,skill,report,animationId=null,elementOverride=null){
   if(this.busy||!this.party.includes(id)||!report?.ok)return false;
   const preset=window.AdvengerAnimations?.get(animationId);
   let choreographed=false;
   if(preset){
    // All skill effects are already computed by SkillEngine.cast. The class
    // choreography is only visualization; it must not deal damage again.
    choreographed=await this.play(id,preset.kind,
     elementOverride||window.AdvengerCharacters.get(id)?.defaultElement,
     ()=>0,preset.classId);
    if(!choreographed)return false;
   }
   const actor=this.actor(id);
   if(!actor)return false;
   this.busy=true;this.focus(id);this.stage.classList.add('as-busy');
   const element=elementOverride||
    AdvengerCharacters.get(id)?.defaultElement||'arcane';
   const color=window.AdvengerElements?.get(element)?.color||this.field.color(element);
   try{
    const programmedHits=skill.overlimit?
     report.events.filter(evt=>evt.kind==='damage').reduce((sum,evt)=>
      sum+(evt.hits||1),0):0;
    this.announce(programmedHits>32?'☄️ OVERLIMIT · '+
     programmedHits.toLocaleString('en-US')+' HIT':
     'SKILL DATABASE · '+skill.name,
     'Data-driven ability · '+report.hero.name);
    const point=this.field.point(actor);
    if(!choreographed){
     this.field.emit('charge',point,point,color,this.reduced?130:480);
     await wait(this.reduced?80:350);
    }
    const targets=report.targets.map(t=>{
     const el=t.side==='ally'?this.actor(t.id):
      Array.from(this.stage.querySelectorAll('[data-target-enemy]')).find(n=>n.dataset.targetEnemy===t.id);
     return {t,el};
    }).filter(({el})=>el);
    if(!choreographed){
     for(const {t,el} of targets){
      const dest=this.field.point(el);
      const ally=t.side==='ally';
      this.field.emit(ally?'shield':'projectile',point,dest,
       ally?'#78f3c9':color,this.reduced?170:340,{role:ally?'heal':'orb'});
     }
     await wait(this.reduced?85:330);
    }
    // A god-tier skill can produce thousands of logical events. Render
    // at most a handful of COMBINED per-target hits; the Skill Engine has
    // already applied every underlying gameplay consequence exactly once.
    let visibleEvents=report.events;
    if(report.events.length>48){
     const grouped=new Map(),other=new Map();
     for(const evt of report.events){
      const key=evt.side+'/'+evt.id+'/'+evt.kind;
      if(evt.kind==='damage'||evt.kind==='heal'){
       if(!grouped.has(key))grouped.set(key,{...evt,amount:0,compact:true});
       grouped.get(key).amount=Math.min(Number.MAX_SAFE_INTEGER,
        grouped.get(key).amount+Math.max(0,evt.amount||0));
      }else if(other.size<16&&!other.has(key)){
       other.set(key,evt);
      }
     }
     visibleEvents=[...grouped.values(),...other.values()].slice(0,24);
     this.announce('☄️ OVERLIMIT · '+report.events.length+' EFFECTS',
      'รวมภาพการโจมตีเพื่อประหยัดประสิทธิภาพ');
    }
    for(const evt of visibleEvents){
     const node=evt.side==='ally'?this.actor(evt.id):
      Array.from(this.stage.querySelectorAll('[data-target-enemy]')).find(n=>n.dataset.targetEnemy===evt.id);
     if(!node)continue;
     const pos=this.field.point(node),heal=evt.kind==='heal';
     this.field.impact(pos,heal?'#6df2bd':color,heal?.7:1,
      heal?'heal':'magic');
     if(evt.amount>0&&(evt.kind==='damage'||heal)){
      if(heal){
       const n=document.createElement('span');n.className='as-number';
       n.style.cssText='left:'+pos.x+'px;top:'+(pos.y-20)+'px;color:#82ffbe';
       n.textContent='+'+evt.amount;this.stage.append(n);
       setTimeout(()=>n.remove(),this.reduced?350:850);
      }else this.hitNumber(evt.amount,color,node);
     }
    }
    await wait(this.reduced?110:450);
    this.announce(programmedHits>32?'☄️ OVERLIMIT COMPLETE':'SKILL COMPLETE',
     skill.name+' · '+(programmedHits>32?
      programmedHits.toLocaleString('en-US')+' HIT (configured)':
      report.events.length+' effects'));
    return true;
   }finally{
    this.busy=false;this.stage.classList.remove('as-busy');
   }
  }
  reset(){
   if(this.busy)return;
   this.field?.clear();
   this.announce('READY','เลือกตัวละครและท่าโจมตี');
  }
 }
 g.AdvengerSharedArena=SharedArena;
})(window);