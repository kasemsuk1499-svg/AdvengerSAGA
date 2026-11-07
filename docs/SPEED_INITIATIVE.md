# AdvengerSAGA v1.2 — SPD Initiative

The turn queue in `js/initiative.js` is now the single source of action ordering for main-party characters, enemies and bosses. Class-specific attacks, 7K-inspired database skills and their approved animation renderer remain separate.

## Rules

1. **Start of each round:** read each living combatant's `SPD` from `AdvengerStatDB`, order **highest to lowest**. Even if some combatants are KO, the queue keeps their positions but skips them at execution.
2. **Ties:** allies act before enemies; among allies use original party slot, among enemies use encounter slot. Deterministic for consistent saves.
3. **One action each round:** each living actor gets exactly one command. Increased SPD means an earlier action, **not extra actions**. An ally can use Basic, Skill, Ultimate, Guard or a reference database skill when that ally is NEXT. An enemy acts automatically as its slot arrives.
4. **No manual skipping:** player cannot select a different party member to bypass SPD priority. Enemy turns interrupt the ally sequence normally.
5. **End of round:** skip KO actors; after the final valid actor finishes, resolve skill DoT/status durations **once**, clear Guard, increment round, then calculate a fresh SPD order.
6. **Guard:** halves the incoming damage to that hero for the remainder of the current round, including any enemies acting after Guard. If an enemy acts earlier than the guarding hero, it is too late to Guard against that attack.
7. **Snapshot:** the queue's SPD values are captured at round start. Future SPD buffs/debuffs should affect a subsequent round, unless a new explicit mechanic is designed.

## Baseline speeds

| Class | SPD |
|---|---:|
| Gunner | 120 |
| Saber | 110 |
| Mage | 100 |
| Tank | 75 |

| Enemy type | SPD |
|---|---:|
| Void Scout | 125 |
| Arcane Wisp | 115 |
| Training Sentinel | 95 |
| Abyss Overlord | 90 |
| Iron Guardian | 70 |

**Training example**: `Gunner (120) → Saber (110) → Mage (100) → Sentinel (95) → Tank (75)`.

**Skirmish example**: `Scout (125) → Gunner (120) → Wisp (115) → Saber (110) → Mage (100) → Tank (75) → Guardian (70)`.

These are defaults only. A new character or boss can override SPD with `stats:{ SPD:150 }`, and the queue automatically uses the override. Existing damage values, visual effects and XP have **not** been rebalanced by this update.

## Runtime & persistence

`AdvengerInitiative.begin(state)` creates a sorted round snapshot and clears the action-done markers. `current(state)` reads the next eligible actor, `complete(state, side, id)` marks an exact queue slot consumed, `sync(state)` sets player/enemy phase and active hero, and `restore(state, saved)` recovers a partially played round.

State carries `initiativeOrder` (snapshot with side, id, slot, SPD) and `initiativeDone` (`ally:<id>` or `enemy:<id>` keys). The `battleVersion` is 4. Existing local saves v2/v3 preserve party/HP/EX/skill state and attempt a safe conversion of already spent actions. Enemy attack effects are committed after the attack animation, so a reload during an enemy animation replays the unfinished action instead of silently skipping it.

## Deliberately not implemented

- A time/ATB bar (this is one action each round, not real-time accumulation).
- Extra turns based on SPD, or cast-time priority by skill type.
- Initiative interruption or immediately resorting the middle of an existing round.
- Automatic paralysis/silence effects on combat actions. Status-effect formulas are separate future work.

Run tests: `node --test tests/*.test.cjs`.
