# AdvengerSAGA v1.4 — Death, Immortality, Guts & Revival

**Status:** Implemented and battle-integrated. Original game engine adapted from **Seven Knights Re:BIRTH concepts**, not copied from Netmarble code. Current source references verified November 7, 2026:

- [Official Netmarble accessory effects](https://guide.netmarble.com/tskgb/65) (revive percentages and immortality rings).
- [GameWith status and buffs](https://gamewith.net/sevenknights-rebirth/70436) (Guts, Immortality, Revive, Soul Death, Execution).
- [GameWith Death debuff guide](https://gamewith.net/sevenknights-rebirth/70918) (20% of current HP, 3 turns, second Death = instant KO).
- [Kris skills](https://gamewith.net/sevenknights-rebirth/70600) (Death + 2-turn Immortality).
- [Rosie skills](https://gamewith.net/sevenknights-rebirth/70501) (Death + revive two allies at 40% HP).

## Reusable skill types (9)

| Library ID | Class | Implementation |
|---|---|---|
| `death` | Status | DoT based on current HP, second application KO, KO on expiry. Normal infliction chance and immunity rules apply. |
| `deathImmunity` | Positive status | Prevents Death from being applied while active; not the same as overall damage immunity. |
| `soulDeath` | Negative status | Stops Auto Revive, Immortality and manual Revive while active. Guts is preventive and remains allowed. |
| `revive` | Active skill effect | Revives an already KO teammate with an adjustable HP percentage; the target must still be on their party roster. |
| `autoRevive` | Survival effect | Grants one or more automatic HP restores triggered by lethal damage, with adjustable HP percentage. |
| `guts` | Survival effect | Prevents a lethal hit once (leaves 1 HP by default); it does not revive a KO unit. |
| `immortality` | Survival effect | On lethal damage, restores 1 HP and stays fixed at 1 HP for the configured future rounds; KO when duration expires. |
| `execute` | Active skill effect | KO eligible targets at or below specified Max HP ratio, capped by a caster-attack threshold; it can still trigger Guts/Immortality/Revive. |
| `damageImmunity` | Positive status | Prevents normal damage while active; it does not independently grant resurrection. |

The metadata list is available at `js/life-db.js` (`AdvengerLifeDB.all/get`) and the behavior at `js/life-engine.js` (`AdvengerLifeEngine`). These are not official data tables or exact copies of every Seven Knights effect.

## Rules and ordering

1. A damaging hit routes through the same central life engine for **hero, enemy or boss**; checks damage immunity and immortality first.
2. If HP reaches zero: resolve **Guts** first, then **Soul Death** restriction, then **Immortality**, and then **Auto Revive**. A passive from the current kit can be used once per battle. Unprotected units stay at 0 HP (KO). This order is the project's current deterministic design choice.
3. Manual Revive from an active skill targets KO allies by priority, and can revive all or two allies through target parameters. Revive does not grant an extra action if the rescued actor already spent its SPD turn; if its queue slot has not passed yet, it can act normally.
4. Dead actors cannot receive healing; immaterial actors remain at 1 HP until Immortality expires. Soul Death remains on KO actors until cleansed; it prevents resurrection.
5. At round end, DoT resolves, then Immortality durations advance. It does not lose its first countdown on the same round as the trigger. Once it ends the target enters KO, and battle victory/defeat checks happen after the resolution.
6. Life states, used triggers and pending survival effects are stored in `state.lifeRuntime`, restored with browser saves and reset with encounters. No continuous animation loop was added.

## Two sourced starter kits

Two new curated reference *base kits* are equipable in Battle → SEVEN KNIGHTS:

- **Kris**: Dark Slash = 305% physical attack once + 50% Death for 3 turns. Dark Whispers = all enemies 100% attack once + 25% Death for 3 turns. Passive: on lethal damage, 2 turns of Immortality (once). Shield and KO-triggered team healing from the original are **not yet modeled**.
- **Rosie**: Judgment of Moonlight = 30% magic attack + 7% caster Max HP, twice, + 25% Death for 3 turns. Holy Prayer = revive up to two KO allies at 40% HP, then reduce enemy buff duration by 2 turns. Passive and enhancement effects are **not yet fully modeled**.

The game already has **Rachel**'s single-use self Revive (80% HP) from v1.0, now handled through the same life engine. Selecting a kit resets the encounter for clear once-per-battle usage. Each skill stores effects as an ordered sequence, and per-effect target overrides are available.

## Creating a custom Death / Revive skill

These are original **data schema examples only**. Damage coefficients and chance of Death should be chosen deliberately when designing an actual character:

```js
{
 name:'Example Holy Prayer',
 target:'twoAllies',
 effects:[
  {type:'revive',target:'twoAllies',hpPct:.40},
  {type:'status',target:'allAllies',key:'damageImmunity',turns:2,chance:1}
 ]
}
```

```js
{
 name:'Example Dark Strike',target:'singleEnemy',
 effects:[
  {type:'damage',attackPct:1.5,hits:2},
  {type:'status',key:'death',chance:.25,turns:3,power:.2}
 ]
}
```

```js
// Survivability added through an active skill or passive config:
{type:'guts',target:'self',uses:1}
{type:'autoRevive',target:'self',hpPct:.60,uses:1}
{type:'immortality',target:'self',turns:2,uses:1}
```

For an **enemy/boss** created by `AdvengerEncounters.instantiate`, set `life:{type:'immortality',turns:2}` (or `type:'revive',hpPct:.8`) for an automatic once-per-battle passive. The same `AdvengerLifeEngine.revive(state,side,id,{hpPct:.4})` works for ally/enemy sides.

## In-game Life Lab

Use **Battle → LIFE LAB** to choose one of the four party characters, including KO members. Give Guts/Immortality/Auto Revive, apply Soul Death, simulate lethal damage, remove status, or revive at 40% HP. It is a training/debug tool and consumes **no turn**. Open **About → Death & Revival Library** to read all 9 effect types. Tests: `node --test tests/*.test.cjs`.

## Known gaps

- Full official passive chains, ring slot conflicts, named character awakenings/transcendences, shield generation, HP-based damage formulas beyond the covered subset, on-death teamwide triggers, and damage-nullification-by-hit-count are not modeled in v1.4.
- Chance/resistance stacking uses our **provisional** status formulas, not confirmed original 7K probabilities.
- The current arena has at most 3 enemies and 4 player heroes. `twoAllies` supports reviving two people in the party.
- Manual browser visual/performance testing remains necessary; automated logic and fake-DOM smoke tests are not a substitute.
