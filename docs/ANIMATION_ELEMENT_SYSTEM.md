# AdvengerSAGA v2.2 — Animation Selector + Character Elements

Adds two independent, reusable systems to the existing **Character Creator → Skill Creator → RPG Campaign** flow, without introducing new WebGL, 3D, per-frame Canvas loops, or replacing previously approved effects.

## 🎬 Choose how each skill LOOKS

**Where:** open **🧪 สร้างสกิล** → select character and skill slot → choose **🎬 แอนิเมชันที่ใช้แสดงท่าสกิล** → press **บันทึกแอนิเมชันให้ช่องนี้**. You can set it even if that slot still uses the character's normal attack. To change the actual skill as well, pick a source and press **ติดตั้งสกิลนี้**; that action stores both the chosen skill and its animation.

In **👤 สร้างตัวละคร**, the original hero also has independent animation selectors below **Basic / Skill 1 / Skill 2 / Ultimate**. Press **บันทึกตัวละคร**, which reloads the game and applies the new choices.

**Choices:** 12 originally approved lightweight animations: Saber, Mage, Tank and Gunner each provide **Basic, Skill and Ultimate**. The list uses the actual original move names (e.g. Quick Slash / Elemental Triple / Astral Rend). **อัตโนมัติ** reverts to the normal class/data-driven effect presentation.

**Critical combat guarantee:** Animations are **visual-only**:
- They do **not** change attack coefficients, the actual attack hit count, target list, status effects, damage type, healing, death/revive, EX cost, cooldown or SPD turn consumption.
- For a native class skill, the original source's damage packets are captured using a no-VFX adapter, then displayed under the chosen choreography. No extra damage is dealt by the replacement animation.
- For a skill from Seven Knights' existing database or a skill created in Skill Creator, the Skill Engine computes and applies effects **once**, while the chosen original animation is played with damage disabled. The event results (damage, heal, status) are still displayed using the lightweight original battlefield effects.
- Changing a slot's skill does not erase the custom animation choice; removing the animation choice returns to **อัตโนมัติ**.
- A borrowed class animation is not the owner's passive skill and gives **no gameplay buffs**.

**Storage:** the existing Skill Creator browser key `AdvengerSAGA_SKILL_CREATOR_V1` now has an optional `animations` property, keyed by hero ID and Basic/Skill 1/Skill 2/Ultimate slot. This is exported and imported with the existing JSON backup. Old local saves without the property remain valid. No selected animation changes the original character modules.

## 🌈 Character innate element

Open **👤 สร้างตัวละคร** → select **🌈 ธาตุประจำตัว**. New characters can choose **12 elements** already recognizable from our approved class FX palettes:

| Element ID | Thai | Visual |
|---|---|---|
| water | น้ำ | 💧 |
| fire | ไฟ | 🔥 |
| wind | ลม | 🌪️ |
| lightning | สายฟ้า | ⚡ |
| void | ความมืด | 🌑 |
| arcane | เวทมนตร์ | 🔮 |
| ice | น้ำแข็ง | ❄️ |
| storm | พายุ | ⛈️ |
| nature | ธรรมชาติ | 🌿 |
| earth | ดิน | 🪨 |
| metal | โลหะ | ⚙️ |
| kinetic | พลังงาน | 💠 |

Defaults by class are Saber/Water, Mage/Arcane, Tank/Earth, Gunner/Kinetic. Players can override their **original hero's** element irrespective of profession. The chosen element is stored in the character record and automatically used for skill and animation FX color.

**Provisional, original gameplay rules (not Seven Knights' official elemental damage formula):**

- An innate element with a defined advantage deals **+15% damage**.
- Attacking an element that counters the attacker's element causes **−10% damage**.
- All other matchups deal **normal damage**.
- The relationships are **directional** and data-driven in `js/elements.js`, so they are simple to rebalance later. Example: Water → Fire +15%; Fire → Water −10%; Fire → Nature +15%; Arcane → Void +15%; Void → Arcane −10%. Enemy types have persistent innate elements (Sentinel/Metal, Scout/Wind, Guardian/Earth, Wisp/Arcane, Overlord/Void).
- This affinity modifier is applied in the shared skill damage calculation and also affects normal native attacks since those already call the same `AdvengerSkillEngine.adjustDamage`. It works in training and campaign. It does not alter healing/status chances or cooldown.
- The existing **element-color buttons** on non-custom character battle screens still only change VFX color, **not innate affinity or combat power**. In particular, swapping battle VFX colors is *not* a free elemental damage switch.
- The custom hero's combat element is fixed by Character Creator and the battle color chooser is disabled while using that hero. Save and reload after changing a character's element to use it.

## Technical files

- `js/animation-catalog.js`: 12 strictly whitelisted presets, real class move labels and original-hit capture.
- `js/skill-creator.js`: `assignAnimation`, `animationFor`, `animationAssignments`, local persistence and import/export validation.
- `js/shared-arena.js`: `playReanimated` and visual-only option for `playDatabaseSkill`, reusing existing Canvas FX.
- `js/app.js`: routes equipped slot to its chosen presentation, still enforces skill cooldown, SPD, active-ability conditions and EX.
- `js/elements.js`: element catalog, combat matchup and innate affinity resolution.
- `js/encounter-catalog.js`: elemental affinities for enemies and bosses.
- `js/character-creator.js`: character element, all original 30 stats, sprite and four animation preferences.
- `js/character-creator-ui.js` / `js/skill-creator-ui.js`: user-facing controls.
- `css/animation-element.css`: responsive controls, no extra JS animation loops.
- `tests/animation-element.test.cjs` / `tests/status-ui-smoke.test.cjs`: independent visual/logic checks and headless UI routing.

## Current limits

This release **selects existing finished animations** only; it does not synthesize new moves, upload custom VFX files or provide a frame-by-frame animation editor. Effects are still 2D/lightweight. There is no 3D content and no background GPU renderer. The "choose animation" UI shows names; to see it in motion, equip the selection and use the skill in the battle arena. Some AOE skills have more actual hits than their chosen animation; the engine preserves all actual damage/target/status events and uses the borrowed choreography only as their visual introduction.

Data remains **browser-local** and can be backed up using the creator's JSON tools. Manual mobile and desktop visual/performance review is still recommended even when automated tests pass.
