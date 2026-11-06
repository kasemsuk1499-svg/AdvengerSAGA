# Modular character folders

Each playable character has its own directory:

- `character.js`: identity, role, moves, effect colors and executable Basic/Skill/Ultimate choreography.
- `art.svg`: current standing character artwork. To use a future transparent `sprite.png`, upload it here and edit the `art` property in this directory's `character.js`.
- `lab.html`: original approved standalone optimized animation demo, retained for regression comparison.

Do not paste a new character's skill code into `js/app.js`. Use `AdvengerCharacters.register({ ... })` in a new character folder, then add its script once to the top-level `index.html` load order. The existing roster UI uses the registry automatically.

The current battlefield always displays the four selected main characters at once. The two support slots are a separate system and do not count against the four visible characters.
