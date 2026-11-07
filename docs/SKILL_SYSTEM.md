# AdvengerSAGA v1.0 — Central Skill Database (7K Re:BIRTH reference)

This fan-made feature models selected factual skill parameters from Seven Knights Re:BIRTH. It is **not an official Netmarble API, not a full Seven Knights database, and not a frame-perfect reproduction**.

## Verified starter kits (checked 2026-11-07)

| Hero | Skill 1 | Skill 2 | Passive example | Source |
| --- | --- | --- | --- | --- |
| Rachel | Blazing Strike (84s) | Phoenix Strike (84s) | Weakness Hit Boost and once-per-battle Revive | https://gamewith.net/sevenknights-rebirth/70604 |
| Lucy | Mystic Dance (95s) | Dancer's Prayer (80s) | Poison Immunity | https://gamewith.net/sevenknights-rebirth/70557 |
| Ellen | Keen Arrow (60s) | Enhance Arrows (60s) | Magic Immunity | https://gamewith.net/sevenknights-rebirth/70587 |

## In-game workflow

Open the arena, choose one of the four player heroes, expand **SEVEN KNIGHTS · ฐานข้อมูลสกิล**, select a reference kit, then choose DB Basic, Skill 1, or Skill 2. Each command consumes that hero's action. Kits can be equipped by any playable hero without replacing its original approved Basic/Skill/Ultimate choreography. Changing kits starts a fresh encounter to reset cooldowns and passives while preserving team formation.

Active cooldowns are stored as source **seconds**, but this turn-based game maps **30 seconds to 1 round (rounded up)**, e.g. 84s -> 3 rounds and 95s -> 4 rounds. This conversion and all combat formulas are AdvengerSAGA design choices and are **not** claimed to reproduce the original game's combat math. Data describes targeting, hit counts, chance, duration, and effect type. Damage, Weakness Hit, poison/burn damage-over-time, and mitigation are adapted for this engine.

Current code supports single/three/all enemies, self/all allies, multi-hit, healing, cleanse, buffs, debuffs, cooldowns, and passive start/lethal/basic triggers. The supplied sample kit records also contain reference enhancement metadata; these improvements are not yet active. Full awakenings, special high-end statuses, and effect-resistance formulas need additional runtime handling. Original character VFX and the single shared optimized canvas are unchanged.

## Data and code files

- `js/skill-db.js`: curated starter records and schema validation
- `js/skill-imports.js`: optional extra, reviewed hero skill records
- `js/skill-engine.js`: combat rules, cooldowns, targeting, status effects, passive triggers and saved-state restoration
- `js/app.js`: battle integration and player-selectable kit buttons
- `scripts/import-skill-db.cjs`: reviewed JSON importer; does not scrape websites

To import a user-reviewed JSON file of full skill records (must include https source per hero), run:

```bash
node scripts/import-skill-db.cjs path/to/verified-skill-data.json
```

The importer accepts an array or `{ "heroes": [...] }`, writes `js/skill-imports.js`, and overwrites matching starter kit IDs if the new record passes validation. Commit the generated script. Each hero record must have `id`, `name`, `source`, and a `skills` object with `skill1`, `skill2`, `passive`; `basic` and `awakening` are optional metadata. Each active skill has `name`, `target`, `cooldownSeconds`, and an `effects` array. Example of a fictional original kit (replace URL with actual reviewed source):

```json
[
  {
    "id": "example-kit",
    "name": "Example Knight",
    "source": "https://example.org/verified-facts",
    "role": "Attack",
    "skills": {
      "basic": {
        "name": "Attack",
        "target": "singleEnemy",
        "effects": [
          {
            "type": "damage",
            "attackPct": 1,
            "hits": 1
          }
        ]
      },
      "skill1": {
        "name": "Twin Strike",
        "target": "singleEnemy",
        "cooldownSeconds": 60,
        "effects": [
          {
            "type": "damage",
            "attackPct": 1.1,
            "hits": 2
          }
        ]
      },
      "skill2": {
        "name": "Fortify",
        "target": "allAllies",
        "cooldownSeconds": 90,
        "effects": [
          {
            "type": "status",
            "key": "defenseUp",
            "power": 0.18,
            "turns": 3,
            "chance": 1
          }
        ]
      },
      "passive": {
        "name": "Steadfast",
        "triggers": []
      }
    }
  }
]
```

Run regression tests with `node --test tests/*.test.cjs` (also run by GitHub Actions). These tests do not replace mobile-device performance checks.

Only a **small, verified subset** of Seven Knights Re:BIRTH abilities is presently packaged; expanding to the whole roster requires additional reviewed data and applicable reuse rights. Do not import proprietary art, sound, UI or wholesale site content.
