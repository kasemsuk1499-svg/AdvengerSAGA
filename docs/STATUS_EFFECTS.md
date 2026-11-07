# AdvengerSAGA v1.3 — Status Effect Skill System

**Reference concepts:** Seven Knights Re:BIRTH. Curated explanations were checked against [GameWith's ailment guide](https://gamewith.net/sevenknights-rebirth/70421), the [Japanese status list](https://gamewith.jp/sevenknights-rebirth/518341), and [Netmarble's official equipment status chance listing](https://guide.netmarble.com/tskgb/65). This is an **original, adapted turn-based combat implementation**, not an official API, a copy of game scripts, or a full in-game mechanical clone.

## Status database

The new `js/status-db.js` exposes 17 reusable ailment entries. A stat boost or immunity like `attackUp`, `poisonImmunity` and `ccImmunity` lives in the same effect-key library but is not counted as an ailment.

| Type | Status ID | Behavior in this engine |
| --- | --- | --- |
| DoT | `burn` | Default 80% caster ATK damage per round; a skill's `power` overrides the default |
| DoT | `dragonFlame` | Default 120% caster ATK per round; burn-family immunity |
| DoT | `bleed` | Default 60% caster ATK per stack per round; up to 5 stacks |
| DoT | `poison` | Default 6% target maximum HP per round, capped at 150% caster ATK |
| DoT | `death` | Default 20% *current* HP damage each round; KO at expiry, or on a second successful application |
| Control | `stun` | Cannot take an action |
| Control | `paralysis` | Cannot take an action; Block Rate reads as 0 |
| Control | `shock` | Cannot act; takes an extra 40% caster ATK whenever struck directly |
| Control | `freeze` | Cannot act; cleared by damage and explodes when removed/expired: lower of 40% target Max HP or 300% caster ATK |
| Control | `petrify` | Cannot act; takes 120% caster ATK when removed/expired |
| Control | `sleep` | Cannot act; wakes on hit for at least 7% Max HP. Guaranteed critical hit effect is **pending** the critical damage formula |
| Control | `fear` | Cannot act; reduces anti-debuff effect-resistance chance to zero in our adapted formula |
| Restriction | `blind` | Basic/counter/follow-up become Fumble: 20% less damage in this engine. Shared critical/fumble formula is pending |
| Restriction | `silence` | Blocks Skill, Skill 1, Skill 2, Ultimate and Awakening; Basic and Guard remain available |
| Restriction | `confusion` | Currently Fumble on basic/counter/follow-up while active; source's specified hit-count consumption needs a future specialized rule |
| Restriction | `healBlock` | Prevents target from receiving healing effects |
| Restriction | `soulDeath` | Disables once-per-battle passive resurrection while active |

Other stat reductions (`attackDown`, `defenseDown`), defense buffs, magic immunity and the new `attackUp` remain separately accessible as skill effects. Unimplemented complex abilities such as bomb transfers, magic reflux, execution and PvP-specific exceptions are **not** claimed complete.

## Sequenced skills / four targets and four hits each

Effects run **strictly in array order**. Each effect may override its target with its own `target`. To roll a status individually for every landed hit produced by the **immediately preceding damage step**, use `eachHit:true`.

A **data-format example**, not an equipped character skill:

```js
{
  name: 'Example only',
  target: 'fourEnemies',
  effects: [
    {type:'damage', attackPct:0.05, hits:4},
    {type:'status', key:'paralysis', turns:2, chance:0.30, eachHit:true},
    {type:'status', key:'attackUp', power:0.40, turns:4, target:'self'}
  ]
}
```


**Important:** The earlier user-approved example established **four enemies, four hits per enemy (up to 16 hits)** and the 40% self ATK buff for 4 turns. It did **not** establish an actual paralysis rate or a damage multiplier. The 30% and 5%-of-ATK numbers above are **illustrative placeholders only** and are not installed into the game's named hero roster. No 4-enemy arena is yet selectable; current encounters contain at most three enemies, but the database and executor already support the fourth.

The final ATK buff starts **after** the 16 hits and does not change them retroactively. It affects later attacks while its duration remains.

## Application chance & immunities

The current game-specific, **provisional** status probability is:

```text
effectiveChance =
  clamp(baseChance + caster.EFFECT_HIT + caster.STATUS_BOOST
        - target.EFFECT_RESIST
        - (crowdControl ? target.CC_RESIST : 0), 0, 1)
```


Values are fractions (`0.4` = 40%). Immunity overrides the roll. Included keys: `statusImmunity`, `ccImmunity`, `poisonImmunity`, `burnImmunity`, `bleedImmunity`. For a debugging application, `ignoreResistance:true` ignores percentage resistance, **not immunity**. This probability is **not** asserted to be the exact official Seven Knights formula and can be revisited during balancing.

## SPD, ticks and timing

- `AdvengerStatusEngine.consumeControl(state,side,id)` processes Stun, Paralysis, Shock, Freeze, Petrify, Sleep and Fear when that combatant's SPD queue slot arrives. One blocked turn consumes **one of the target's future opportunities**, avoiding premature expiration when a slow attacker applies control after an enemy has already acted.
- DoT, buff and restriction effects tick once at the end of the round through `AdvengerSkillEngine.advanceRound`. Status expiry reactions (Petrify / Freeze) and cleanse happen through the shared engine.
- A hit can break Freeze or wake Sleep and can trigger Shock's extra damage. Reactions do **not** recursively trigger themselves.
- Status application, source power, remaining turns and Bleed stacks are stored in `skillStatuses`, retained through browser saves, and restored with validity checks.
- Older starter hero kits (Rachel, Lucy and Ellen) still equip separately and retain their original animations and custom numerical overrides.
- **Not implemented as finalized formulas:** guaranteed critical hits on sleeping targets, full Block and fumble/crit systems, buff stacking ceilings, real 7K-specific dispel priority rules, and all PvP or mode exemptions.

## In-game testing

Open **สนามทดสอบ** → expand **STATUS LAB**. Select any of the 17 statuses, choose a turn duration, and apply it to the currently selected enemy or current allied hero. This is a developer training tool, *does not consume a turn*, bypasses chance resistance, and is deliberately not a real character skill. Observe target status info and log; for control effects observe the SPD initiative queue skipping targets. Open **ข้อมูล** to read the full catalogue.

Tests: `node --test tests/*.test.cjs`. Source artwork, UI, sound, original damage equations and proprietary game assets were not imported.
