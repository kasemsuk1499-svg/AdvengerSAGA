# AdvengerSAGA · Universal Stat Database v1.1

The central catalogue is `js/stat-db.js`. It is an original game design schema, not an official or game-exact Seven Knights Re:BIRTH database.

## 30 permanent stats

| Category | Registered stat IDs | Count |
| --- | --- | ---: |
| Core | `MAX_HP`, `P_ATK`, `M_ATK`, `DEF`, `SPD` | 5 |
| Offense | `CRIT_RATE`, `CRIT_DMG`, `WEAK_RATE`, `WEAK_DMG`, `DMG_BOOST`, `DMG_AMP`, `DEF_PEN`, `CRUSH` | 8 |
| Defense | `BLOCK_RATE`, `DMG_REDUCTION`, `RESILIENCE`, `PHYS_RESIST`, `MAG_RESIST`, `EVASION` | 6 |
| Effects | `EFFECT_HIT`, `EFFECT_RESIST`, `STATUS_BOOST`, `CC_RESIST` | 4 |
| Utility | `COUNTER_RATE`, `FOLLOWUP_RATE`, `HEAL_POWER`, `HEAL_RECEIVED`, `LIFESTEAL`, `CD_REDUCTION`, `EX_GAIN` | 7 |

**Correction of the earlier count:** the named attributes actually total 30 (5+8+6+4+7), not 31. The schema includes every specified attribute, and does not invent an extra stat.

All percentage-type stats use **fractions**: 0.40 means +40%. Numbers must be finite and nonnegative. Percentage caps, stacking, damage, turn order and crit/block formulas remain undecided and are not automatically enabled.

Existing characters without an explicit `stats` dictionary inherit the previous prototype's fallback Attack (about 23% MAX_HP), Defense (about 15% MAX_HP), and SPD=100. In legacy modules `maxHP`, `attack`, `magicAttack`, `defense`, `speed` are accepted, with explicitly supplied `stats` values taking precedence.

## Making a character with stats

Write a `stats` object in the character's existing `AdvengerCharacters.register({ ... })` invocation:

```js
stats: {
  MAX_HP: 1200, P_ATK: 320, M_ATK: 220, DEF: 180, SPD: 110,
  CRIT_RATE: 0.25, CRIT_DMG: 0.50,
  EFFECT_HIT: 0.40, EFFECT_RESIST: 0.15, CC_RESIST: 0.10
}
```

All unspecified stats are filled by `AdvengerStatDB.create(character)` and frozen on registration. Both enemy types and boss instances share the same schema; `AdvengerStatDB.forEnemy(enemy)` returns their full stat block.

Public API: `AdvengerStatDB.all()`, `.get('CRIT_RATE')`, `.create({maxHP:1000,stats:{SPD:115}})`, `.forCharacter('saber')`, `.forEnemy(enemy)`.

## 9 in-battle runtime fields

The base stats above do not replace live HP or existing turn state. The shared runtime exposes: HP current/max, EX current/max, SHIELD, BUFFS, DEBUFFS, COOLDOWNS, STACKS, ABILITY_USES, and LIFE_STATE. Existing HP, EX, buffs/debuffs, cooldowns, and revive usage remain authoritative in the battle state. The additional shield, stacks, and counter dictionaries are stored in `state.statRuntime[side][unitId]` with `side='ally'|'enemy'`.

Read a unified snapshot with `AdvengerStatDB.battleView(state,'ally','saber')`. Use `resetRuntime(state)` for a new encounter and `restoreRuntime(state,saved.statRuntime)` after reloading. Old local saves are automatically given empty defaults. The runtime schema is prepared for later skill implementations; a shield value is not yet automatically consumed on damage.

## Sequential effects, kept as a design rule

Effects run in their specified order. The confirmed example is (1) attack up to four enemy targets four hits **each** (up to 16 hits), (2) roll Paralysis independently per eligible hit, duration two turns, (3) increase caster's Attack by 40% for four turns without retroactively changing the first 16 hits. The chance of Paralysis, buff stacking, status refresh, and KO-interruption rules have *not* been chosen. Those are the next phase of the skill-execution design; this update only establishes the stat database and runtime data.

Tests: `node --test tests/*.test.cjs`.
