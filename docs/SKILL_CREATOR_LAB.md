# AdvengerSAGA v1.5 — Skill Creator Lab

**Playable browser editor** for custom character skills. It is a user-authored, original data library running locally in the browser; it does not fetch or copy proprietary skill lists from Seven Knights Re:BIRTH. Existing sourced Seven Knights reference kits remain independent.

## How to create and test

1. Open the live game and choose **🧪 สร้างสกิล** in the navigation.
2. Enter a skill name, main target group, physical/magic damage type and cooldown in rounds.
3. Press **+ เพิ่มเอฟเฟกต์**; pick from Damage, Status, Heal, Cleanse, Revive, Guts, Auto Revive, Immortality, Execute or Reduce Buff Duration. Each step has its own optional target selector.
4. Add, remove and move individual effect rows with up/down buttons. The engine executes effects strictly in the displayed sequence.
5. Press **💾 บันทึกลงคลัง** for a newly authored skill, or directly choose an existing original class / Seven Knights skill from **สกิลที่จะใช้แทนช่องนี้**. Pick a character and one of Basic, Skill 1, Skill 2, Ultimate, then press **ติดตั้งสกิลนี้**. The source ability replaces the action in that slot; one saved skill can still be assigned to multiple characters.
6. Choose **⚔️ สนามทดสอบ**, expand **🧪 MY CREATED SKILLS** and press the assigned skill when that character's SPD turn comes. Ultimate requires EX 100 and consumes EX; all authored skills consume one normal action and have independent cooldowns.
7. Choose **🧪 SKILL LAB · ศัตรู 4 ตัว** in the encounter selector when testing the confirmed 4-target × 4-hits-per-target rule.

**Replacement loadout (v2.1):** the regular Basic / Skill / Ultimate command cards call equipped abilities *instead of* the defaults. An additional Skill 2 command appears only when the corresponding fourth slot is assigned. Empty slots always revert to the original class moves. Select from (a) original Saber/Mage/Tank/Gunner class moves, (b) original active skills in the curated Seven Knights database, or (c) new authored skills. This does not overwrite source skill files or animations. Borrowed original class moves replay their existing light class choreography on the current actor. Borrowed Seven Knights skills use the existing data-driven VFX and cooldowns, but do not import their source hero's passive. The separate reference-kit lab remains available for testing.

## Example — four enemies, four hits each, Paralysis, self buff

The **⚡ ตัวอย่าง 4×4** button inserts the following editable draft. Percentages are data values expressed as fractions (1.0 = 100%, .4 = 40%):

```js
{
 name:'ตัวอย่าง 4 เป้าหมาย × 4 ฮิต',
 target:'fourEnemies',damageType:'physical',cooldownRounds:3,
 effects:[
  {type:'damage',hits:4,attackPct:1,defensePct:0,hpPct:0},
  {type:'status',key:'paralysis',turns:2,chance:null,eachHit:true},
  {type:'status',target:'self',key:'attackUp',chance:1,power:.4,turns:4}
 ]
}
```

The combat engine hits **up to 4 targets × 4 hits each = up to 16 hits**, then separately rolls Paralysis for each landed hit, then gives **+40% ATK to the caster for 4 turns**. The 100% ATK damage coefficient and 3-round cooldown are **editable lab example defaults, not user-approved balance**. **Paralysis probability is deliberately left blank** and cannot be saved until the player chooses it. The self-buff is not retroactive.

## Effect authoring fields

- `damage`: hits (per target, max 12), coefficients based on Attack, Defense and Max HP, each configured as a percentage.
- `status`: choose from `AdvengerStatusDB.labels` including buffs, 17 ailments and life-related immunities; chance, turn duration, optional magnitude; `eachHit:true` uses landed hits from the immediately prior Damage step.
- `heal`: Attack and Defense scaling.
- `cleanse`: number of debuffs removed.
- `reduceBuffDuration`: number of rounds taken away from enemy buffs.
- `revive`: HP percentage on resurrection, targeting KO party members; can choose self, one, two or all allies in effect target.
- `guts`, `autoRevive`, `immortality`: uses, HP% or duration according to the effect type.
- `execute`: target HP threshold and caster attack limit; lethal protection like Guts remains effective.

Allied and enemy target selectors, Speed Initiative, status resistance, life engine and combat VFX use the existing shared runtime; the lab does not create new Canvas or animation loops.

## Data and backup

- `js/skill-creator.js`: normalized skill records, validation, local library, equipped slots, JSON import/export.
- `js/skill-creator-ui.js`: visual ordered-effect editor and assignment interface.
- `js/skill-engine.js`: `readyCreated`, `createdRemaining`, and custom `cast` support, with saved per-skill cooldowns.
- `js/app.js`: replacement command-slot routing (Basic / Skill 1 / optional Skill 2 / Ultimate), with inherited class fallback, SPD/EX/cooldowns and status checks.
- `css/skill-creator.css`: responsive layouts and the four-foe arena positioning.

Data is persisted automatically in the current browser under `AdvengerSAGA_SKILL_CREATOR_V1`. Use **ส่งออก JSON** to place your complete library/assignments in a copyable text field; **นำเข้า JSON** validates and replaces the library after confirmation. This is **not** a server, database account, GitHub commit, or cloud sync. Clearing browser storage will erase the local library unless exported.

## Intentional limitations

- This version edits **active skills (Basic / Skill 1 / Skill 2 / Ultimate)**; a custom passive-trigger editor and character-art/VFX editor are not included.
- The character picker lists characters already registered in the game. New character modules will become selectable automatically after they have been added to the registry.
- The status probability/resistance formula is the game's current provisional adaptation rather than Seven Knights' exact formula; the general crit, block and evasion systems are still incomplete.
- No arbitrary JavaScript is executed from an imported skill. Records must pass whitelisted effect and targeting schemas.
- The skills are rendered with the light common DB-skill VFX, not hand-designed unique moves for every original character.
- The UI's browser visual and mobile performance must still be checked manually; node regression and DOM smoke tests are not real-device QA.

Run verification with `node --test tests/*.test.cjs`.
