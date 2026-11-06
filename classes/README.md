# Shared class animation presets

The profession registry in `classes/catalog.js` defines role identities. Each class has a **shared, reusable attack-animation implementation**, stored separately from every playable character:

```text
classes/
  catalog.js
  saber/animations.js      # Basic / Skill / Ultimate
  mage/animations.js
  tank/animations.js
  gunner/animations.js
```

`js/class-animation-registry.js` exposes `AdvengerClassAnimations.register(classId, {basic, skill, ultimate})`.

Every character declares a `classId` in `characters/<id>/character.js`. If the character does not override a move, its Basic, Skill or Ultimate **automatically inherits** the corresponding class animation and its damage/hit timing.

The four presets were migrated from the previously approved demo moves without changing their choreography or damage. Updating one class animation affects all characters **inheriting that particular move**. It does not replace any character-specific move overrides.

To create a new class, register the profession in `classes/catalog.js`, implement the three moves in `classes/<class-id>/animations.js`, and include that animation script in `index.html` before the character registry and manifest loader. This is only needed when introducing a whole new profession—not when adding another character to an existing class.

The battlefield and performance-optimized VFX renderer remain common services, independent of class and character scripts.
