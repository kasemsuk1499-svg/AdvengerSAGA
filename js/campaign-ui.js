/* AdvengerSAGA v2.0 Campaign UI — original RPG story, no Canvas loops.
 * Mounted after app so it controls the existing battle through a small bridge.
 */
(function(g){
 'use strict';
 const M=g.AdvengerCampaign,BR=g.AdvengerCampaignBridge;
 if(!M||!BR||!g.document)return;
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,x=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 let selected=M.firstAvailable()?.id||'story-01';
 function renderHub(){
  const p=M.stats(),lvl=p.level;
  $('campaignLevel').textContent='LV '+lvl.level;
  $('campaignGold').textContent=p.gold.toLocaleString()+' G';
  $('campaignProgress').textContent=p.completed+' / '+M.stages.length;
  $('campaignBonus').textContent='ATK +'+Math.round(p.attackBonus*100)+'%';
  $('campaignXpLabel').textContent=lvl.needed?
   lvl.progress+' / '+lvl.needed+' XP':'LV MAX';
  $('campaignXpBar').style.width=lvl.needed?
   Math.min(100,Math.round(lvl.progress/lvl.needed*100))+'%':'100%';
  if(!M.unlocked(selected))selected=M.firstAvailable()?.id||'story-01';
  const stage=M.stage(selected);
  $('campaignChapters').innerHTML=M.chapters.map(ch=>{
   const levels=M.stages.filter(s=>s.chapter===ch.id);
   return '<section class="campaign-chapter">'+
    '<div class="campaign-chapter-head"><small>'+esc(ch.subtitle)+'</small>'+
    '<strong>'+esc(ch.title)+'</strong><p>'+esc(ch.description)+'</p></div>'+
    '<div class="campaign-stage-list">'+levels.map(s=>{
     const locked=!M.unlocked(s.id),stars=p.stars[s.id]||0;
     const done=!!p.cleared[s.id];
     return '<button type="button" data-campaign-stage="'+esc(s.id)+'" '+
      'class="campaign-stage-button'+(s.id===selected?' active':'')+
      (locked?' locked':'')+'"'+(locked?' disabled':'')+'>'+
      '<span class="campaign-stage-number">'+esc(s.number)+'</span>'+
      '<span class="campaign-stage-title">'+esc(s.title)+
      '<small>'+esc(s.subtitle)+'</small></span>'+
      '<span class="campaign-stage-score">'+
      (done?'★'.repeat(stars)+'☆'.repeat(3-stars):locked?'🔒':'▶ NEW')+
      '</span></button>';
    }).join('')+'</div></section>';
  }).join('');
  $('campaignStageNumber').textContent='MISSION '+stage.number;
  $('campaignStageTitle').textContent=stage.title;
  $('campaignStageSubtitle').textContent=stage.subtitle;
  $('campaignStageStory').textContent=stage.story;
  $('campaignStageEnemies').textContent='⚔️ ศัตรู '+stage.enemies.length+' ตัว';
  $('campaignStageRewards').textContent='🎁 '+stage.xp+' EXP / '+stage.gold+' G'+
   (p.cleared[stage.id]?' · เคยรับแล้ว':'');
  $('campaignStageObjective').textContent='ภารกิจ: '+stage.objective;
  $('campaignLaunch').disabled=!M.unlocked(stage.id)||BR.isBusy();
  $('campaignLaunch').textContent=p.cleared[stage.id]?
   '↻ เล่นด่านนี้ซ้ำ':'⚔️ เริ่มภารกิจ';
  const battle=BR.state();
  const resumable=battle.mode==='campaign'&&M.stage(battle.campaignStage)&&
   ['player','enemy'].includes(battle.phase)&&!battle.campaignRewarded;
  $('campaignResume').hidden=!resumable;
  if(resumable)
   $('campaignResume').textContent='↩ กลับสู่ภารกิจที่ค้าง: '+
    M.stage(battle.campaignStage).title;
  $('campaignBriefingMessage').textContent=
   p.completed===M.stages.length?
    '🏆 จบบทที่ 1 แล้ว · เล่นซ้ำเพื่อเพิ่มดาวได้':
    'ปลดล็อกด่านถัดไปด้วยชัยชนะ · รับ EXP และทองเมื่อผ่านครั้งแรก';
  $('campaignShopItems').innerHTML=Object.values(M.items).map(item=>
   '<div class="campaign-shop-item"><span class="campaign-shop-item-icon">'+
   item.emoji+'</span><div class="campaign-shop-item-copy"><strong>'+
   esc(item.name)+' · มี '+p.inventory[item.id]+'</strong><small>'+
   esc(item.desc)+'</small></div><button type="button" data-campaign-buy="'+
   esc(item.id)+'"'+(p.gold<item.price?' disabled':'')+'>'+
   item.price+' G · ซื้อ</button></div>'
  ).join('');
 }
 function renderBattle(){
  const state=BR.state(),campaign=state.mode==='campaign'&&!!M.stage(state.campaignStage);
  for(const id of ['campaignBattleBanner','campaignBattleItems'])
   $(id).hidden=!campaign;
  for(const id of ['encounterToolbar','lifePanel','ailmentPanel','dbSkillPanel'])
   $(id).hidden=campaign;
  $('battleReset').textContent=campaign?'↻ ลองภารกิจอีกครั้ง':'↻ เริ่มไฟต์ใหม่';
  if(!campaign){$('campaignBattleResult').hidden=true;return}
  const mission=M.stage(state.campaignStage),progress=M.stats();
  $('campaignBattleTitle').textContent=mission.number+' · '+mission.title;
  $('campaignBattleObjective').textContent='เป้าหมาย: '+mission.objective+
   ' · LV '+progress.level.level;
  const injured=state.party.some(id=>state.hp[id]>0&&
   state.hp[id]<BR.maxHP(id)&&BR.canHeal(state,'ally',id));
  const fallen=state.party.some(id=>state.hp[id]<=0&&
   BR.canRevive(state,'ally',id));
  $('campaignItemButtons').innerHTML=Object.values(M.items).map(item=>{
   const possible=item.id==='potion'?injured:fallen;
   const note=item.id==='potion'?'ฟื้น HP ให้ผู้ที่บาดเจ็บมากที่สุด':'ชุบสมาชิกที่ KO คนแรก';
   return '<button type="button" data-campaign-item="'+esc(item.id)+'"'+
    (!BR.canAct()||!progress.inventory[item.id]||!possible?' disabled':'')+
    '>'+item.emoji+' '+esc(item.name)+' ×'+progress.inventory[item.id]+
    '<small>'+esc(note)+'</small></button>';
  }).join('');
  const finished=['victory','defeat'].includes(state.phase);
  $('campaignBattleResult').hidden=!finished;
  if(finished){
   const won=state.phase==='victory',r=state.campaignResult;
   $('campaignResultTitle').textContent=won?'🏆 ภารกิจสำเร็จ':'💀 ภารกิจล้มเหลว';
   $('campaignResultStory').textContent=won?mission.after:
    'กลุ่มผู้เดินทางต้องถอยกลับไปตั้งหลัก พันธสัญญายังไม่สิ้นสุด—จัดทีมใหม่แล้วลองอีกครั้ง';
   $('campaignResultReward').textContent=won&&r?
    ('★'.repeat(r.stars)+'☆'.repeat(3-r.stars)+
     (r.first?' · +'+r.xp+' EXP · +'+r.gold+' G':
      ' · เล่นซ้ำสำเร็จ (ไม่มีรางวัลซ้ำ)')):'ไม่มีรางวัล · สามารถเริ่มใหม่ได้';
   const button=document.querySelector('[data-campaign-next]');
   if(button){
    button.disabled=!won||!r?.next;
    button.textContent=r?.next?'▶ ภารกิจถัดไป':'🏁 จบบทที่หนึ่ง';
   }
  }
 }
 function render(){renderHub();renderBattle()}
 function select(id){
  if(!M.unlocked(id))return BR.notice('ภารกิจยังไม่ปลดล็อก');
  selected=id;renderHub();
 }
 function buy(id){
  try{M.buy(id);render();BR.notice('🎒 ซื้อ '+M.items[id].name+' สำเร็จ')}
  catch(e){BR.notice(e.message)}
 }
 function click(e){
  const button=e.target?.closest?.('button');
  if(!button)return;
  if(button.dataset.campaignStage){select(button.dataset.campaignStage);return}
  if(button.dataset.campaignBuy){buy(button.dataset.campaignBuy);return}
  if(button.dataset.campaignItem){BR.item(button.dataset.campaignItem);return}
  if(button.dataset.campaignNext){
   const next=BR.state().campaignResult?.next;
   if(next&&M.unlocked(next)){selected=next;BR.start(next)}
   else BR.show('campaign');
  }
 }
 document.addEventListener('click',click);
 $('campaignLaunch').addEventListener('click',()=>BR.start(selected));
 $('campaignResume').addEventListener('click',()=>BR.show('battle'));
 render();
 g.AdvengerCampaignUI=Object.freeze({render,select});
})(window);
