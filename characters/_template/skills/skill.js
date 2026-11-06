/* Only this character's Special Skill behavior. */
(function(){
 const id='new-hero';
 const slots=window.AdvengerCharacterSkills ||= {};
 const kit=slots[id] ||= {};
 kit.skill=async function(a){
  a.announce('SPECIAL SKILL','ท่าเฉพาะตัว');
  await a.charge(420);
  const dash=a.rush(930,'slash');
  await a.wait(460);a.hit(90,'slash');
  await a.wait(220);a.hit(120,'slash',true);
  await dash;
 };
})();