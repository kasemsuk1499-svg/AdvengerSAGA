# AdvengerSAGA v2.3 — OVERLIMIT SKILL CREATOR 😈

**God-tier authored active skills are now playable** in Story Mode and Training on the existing turn-based 4+2 engine. No script execution, heavy renderer or extra attack animation loops are introduced.

## Create a superpowered skill

1. Open **🧪 สร้างสกิล** and enable the **😈 OVERLIMIT MODE · ปลดลิมิตสกิล** checkbox.
2. Optionally press **☄️ สกิลล้างโลก** to load an editable example: **99,999 programmed hits on each of four enemies**, immediate zero-round cooldown, a 999-turn Paralysis check and self ATK +1,000%. There is no artificial chance default for the older **4×4 Paralysis** template, which remains unchanged.
3. Edit the effects in any order. Choose damage/status/heal/cleanse/revive/Guts/auto-revive/immortality/execute; every effect can independently target its own group.
4. Press **บันทึกลงคลัง**, choose hero + slot, then **ติดตั้งสกิลนี้**. It replaces the original Basic/Skill/Ultimate action in that slot; per-hero animation selection continues to work.
5. Play in **⚔️ สนามต่อสู้** or **🏰 ผจญภัย**. A saved Overlimit skill has the same turn cost and EX requirement of its equipped slot as any other authored skill.

## Caps: expanded immensely, not physically infinite

| Feature | Normal | Overlimit |
|---|---:|---:|
| Effects per authored skill | 24 | **128** |
| Damage hits per target in a damage step | 12 | **1,000,000** |
| Each ATK/DEF/MAX_HP damage or heal coefficient | 10,000% | **100,000,000%** |
| Status buff/debuff power | 10,000% authoring (status runtime formerly limited this) | **100,000,000%** |
| Guts / auto-revive / immortality charges | 9 | **999** |
| Cooldown | 0–30 turns | **0–999 turns** |
| Status duration / immortality | 1–999 turns | 1–999 turns (the game's maximum battle timeline) |
| Status chance | 0–100% | 0–100% |
| Total authored skills in local library | 150 | 150 |
| Live target slots | up to 4 enemies, 4 allies | unchanged |

Values still have finite, validated ceilings to avoid crashes, NaN or Infinity, and arbitrary JavaScript, remote asset links or arbitrary code execution remain prohibited. You can **set cooldown to 0** in either mode, so a skill can be used on every one of its actor's SPD turns; it never fires automatically outside its owner's normal turn.

## How million-hit processing avoids lag

An Overlimit damage step with **32 hits or fewer** uses the normal independent per-hit runtime, preserving 4 × 4 = 16 hits exactly. Above that, the engine switches to **lethal-boundary batching**: multiple hits are accounted together until the next potential KO/Guts/auto-revive boundary. This lets repeated Guts charges trigger without running a million JavaScript iterations.

The combat report records **one compact damage event per target**, now including programmed hit count, actual damage, how many hits landed before KO/immunity, **and compact per-hit damage packets** for visual playback. Damage is applied once per batch by the engine, not by the visual renderer. A million hits do not produce a million particle objects. If the target is already KO, later status steps cannot inflict paralysis on a corpse.

**Per-hit status effects:** when a surviving target takes more than 32 grouped landed hits, the engine calculates the probability of at least one proc from the independent per-hit chance and respects effect accuracy/resistance. It efficiently resolves the capped number of meaningful procs (1 for ordinary status refresh, 5 for Bleed stacks, 2 for Death). This preserves the probability distribution of those outcomes, but **does not reproduce every original random roll or each separate on-hit callback**. Normal-size multi-hit skills retain their old exact per-hit behavior.

**v2.4 hit-by-hit visuals:** Standard attacks and authored combos show **one floating damage number per landed hit** (for example 4 targets × 4 successful hits = 16 floating numbers). For big Overlimit attacks, the renderer displays **up to 120 accurate individual hit-damage numbers**, sampled across the actual landed hits. A persistent **HIT landed / programmed counter** progresses during playback and ends on the true landed amount. For example, if a million hits were configured but the enemy died on the third, the screen says **3 / 1,000,000 HIT** and shows only three real damage numbers, not a fabricated million-hit combo. For a target surviving all million hits, the counter reaches **1,000,000 / 1,000,000 HIT** while only a bounded 120 number sprites are created.

The sampled hit numbers use the combat engine's compact **damage packet breakdown**, not the grand total split at random. The engine still resolves game-state effects once, independently of the display. With huge hits, individual per-hit RNG/on-hit trigger simulation remains intentionally compressed; this is a performance-focused approximation, not a claim to simulate every separate RNG roll.

### Original combat rules that still apply

- SPD determines turn order; an Overlimit skill still consumes **one regular active turn**.
- The Ultimate slot still spends **EX 100**.
- Existing damage immunity, Soul Death, status resistance, Silence, KO, revive conditions and other defensive mechanics remain in force unless explicitly designed otherwise.
- Hit counts beyond a target's remaining HP are *programmed*, but not necessarily *landed*; this is especially visible against small training foes.
- Each status has its own semantic rules. Healing and revival still cannot exceed target max HP.
- Elemental advantage/disadvantage and player-created character stats are used in damage calculations as usual.
- Reusing existing native animation presets is presentation-only; it does not multiply the effect's real damage.

## Persistence / implementation

The skill's `overlimit: true` flag is saved inside the existing `AdvengerSAGA_SKILL_CREATOR_V1` browser-local library and JSON exports. Older skills missing this flag load as `overlimit: false`. You can toggle Overlimit for an existing skill and save its revised data. Old skills, animations, character files, teams and campaign saves are not overwritten by this update.

- `js/skill-creator.js`: opt-in Overlimit validation and extreme-power example.
- `js/skill-creator-ui.js` / `index.html` / `css/skill-creator.css`: mode toggle, dynamic limits and 99,999-hit template.
- `js/skill-engine.js`: compact large-hit simulation, KO/Guts packet boundaries, per-hit damage packet metadata and efficient status-probability sampling.
- `js/status-engine.js` / `js/life-engine.js`: persistent status power / 999 protection charges.
- `js/hit-display.js`: deterministic, bounded visualization plan and hit-by-hit sampled amounts.
- `js/shared-arena.js` / `css/hit-display.css`: sequential floating per-hit numbers, actual/programmed HIT meter and restrained effects.
- `tests/skill-creator.test.cjs` and `tests/status-ui-smoke.test.cjs`: large-hit integration, source-preserving normal 4×4, JSON export/import and editor action coverage.

**This is a superpowered game-design sandbox.** It will intentionally trivialize standard story stages. If the skill is too powerful, change its ratios, hits, Guts or cooldown in the same editor. If browser storage fills, export your JSON and consider deleting unused skills; a cloud save is not provided yet.
