# AdvengerSAGA v2.0 — Playable Chronicle RPG Campaign

**A playable first campaign vertical slice**, not just an isolated combat demo. It uses the existing shared party arena, four active fighters + two supports, editable original character, personal custom skills, SPD initiative, statuses, and life/KO/revival engine. This update does not create a separate heavy runtime, use generated temporary art, or alter the approved class animation loops.

## Starting a new game

1. Open **https://kasemsuk1499-svg.github.io/AdvengerSAGA/**, choose **🏰 ผจญภัย**, and read the briefing for **MISSION 00-01**.
2. You can visit **🧩 จัดทีม** first. Choose any four registered main fighters, including the one local original hero created in Character Creator. The team must still have four fighters; narrative solo-recruitment is **not implemented in this first playable chapter**.
3. Press **⚔️ เริ่มภารกิจ** to enter a campaign battle. Enemy initiative uses SPD and interleaves with your allied turns. Choose enemies, use Basic/Skill/Ultimate/custom authored skills, Guard, assistants or consumables.
4. On victory, earn **EXP + Gold once on the first clear**; a stage unlocks the next. Star score is derived from remaining living party members (four = 3 stars, two or three = 2 stars, one = 1 star), and replay can improve stars.
5. EXP raises the persistent party level. Each level adds **+4% ally damage only in story battles**, capped at +60%. The existing training-lab damage remains unchanged.
6. Gold purchases **🧪 Healing Potion** or **🪶 Phoenix Feather** from the hub. A potion heals the most wounded eligible alive party member for **40% of normal Max HP**; a feather revives the first eligible KO member at **40% HP**. Each consumable is spent permanently and consumes the acting hero's **one SPD action** in battle. Soul Death prevents revive.
7. If you close the browser during a battle, use **↩ กลับสู่ภารกิจที่ค้าง** to resume. The encounter, HP, EX, statuses, life triggers and initiative queue are restored from the existing local battle save.
8. On defeat, the same mission is available for retry. Replay never grants the first-clear XP or Gold again; best star rating may still improve.

## Story content in v2.0

**Chapter 00 — พันธสัญญาจากรอยแยก** (3 missions):
- 00-01 เสียงเรียกจากรอยแยก — introductory guardian
- 00-02 ผู้ลาดตระเวนแห่งวอยด์ — fast enemy SPD tutorial
- 00-03 คำสาปบนทางแยก — mage debuff and armored guardian

**Chapter 01 — ป้อมปราการไร้ชื่อ** (3 missions):
- 01-01 ป้อมปราการที่ไร้ชื่อ — full three-enemy encounter
- 01-02 สี่เงาแห่งคำสาบาน — four-enemy tactical battle
- 01-03 ราชันแห่งขอบฟ้าแตกสลาย — Abyss Overlord boss + guardians

Each mission has an original story briefing, objective, authored enemy composition, first-clear EXP/Gold reward and a closing narrative after victory.

## Internal design

- `js/campaign.js` owns original canonical missions, persistent XP/Gold/unlocks/star ratings, inventory and purchases. Progress is stored under `AdvengerSAGA_CAMPAIGN_V1`.
- `js/encounter-catalog.js` defines all six exact campaign enemy groups and original training encounters. The existing `AdvengerBattleCore.spawn/restore` works with story stage IDs.
- `js/app.js` starts and resumes campaign battles, grants rewards only after real victory, isolates lab-only cheats and kit swaps, and exposes a small `AdvengerCampaignBridge` for the UI.
- `js/campaign-ui.js` displays a chapter map, mission briefing, XP gauge, Gold balance, shop, in-battle inventory and results. It never independently manipulates HP/EXP or grants victory.
- `js/skill-engine.js` applies the current campaign-level attack bonus on shared ally damage calculations only when the game is in story mode; training remains unmodified.
- `css/campaign.css` is responsive, using normal HTML and CSS rather than new animation loops or heavy WebGL content.
- `index.html` puts Adventure as the first navigation page, and preserves Formation, Battle, Skill Creator, Character Creator and the encyclopedia.

## Save & balance rules

There are **two different pieces of data** and both are browser-local:
- Campaign progression and inventory (`AdvengerSAGA_CAMPAIGN_V1`).
- Active party composition and partially played battle (`AdvengerSAGA_FORMATION_V1`).

The Skill Creator and Character Creator continue using their previous independent local storage. Progress is not uploaded to GitHub, synced across browsers, or backed up on an account. Export and backup for the character/skill library remain separate from Campaign progression at this stage.

Gold/EXP cannot be farmed by repeatedly clearing the same stage, and stage unlocks require the previous stage to have been cleared. The game does not include monetization, gacha banners or stamina locks.

## Still to build before calling it a full game

This is **a playable campaign vertical slice**, not a full multi-chapter RPG:
- Character-by-character **Story Recruitment** and the intended solo-start intro remain future work; party selection still uses the already-established 4+2 arena with all available characters.
- Branching cutscenes and player-impactful dialogue choices are not yet included. The current storyline is linear with 6 original stages.
- Distinct hand-drawn enemies, character portraits, unique story area backdrops, voice and audio, sprite actions and bespoke ultimate arts require additional assets.
- Individual character XP/level/skill trees, permanent equipment, account login/cloud saves and additional regions are separate future features. Current XP is **shared team level** only.
- Status formulas, passive creators, real official Seven Knights-critical rules and enemy-specific advanced AI are not finalized.
- Automated Node regression and headless fake-DOM tests verify logic and event wiring. Manual browser/mobile art/performance checks are still recommended.

Verify with `node --test tests/*.test.cjs`. Start from the game URL above; no external backend setup is needed.
