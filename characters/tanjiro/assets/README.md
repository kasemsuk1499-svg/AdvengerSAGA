# Tanjiro — image drop zone (PNG)

Upload three transparent PNG files into THIS directory with these exact filenames:

| File | Display | Suggested dimensions |
| --- | --- | --- |
| `standing.png` | Full-body sprite, used in the four-character battlefield | ~512×768 (portrait, transparent) |
| `portrait.png` | Party/status UI card, formation selection | ~512×512 (transparent) |
| `cutin.png` | Large cinematic character image during Ultimate | ~1024×768 (transparent) |

These are suggested dimensions rather than strict requirements. The CSS scales images to fit.

**You do not need to edit any game code after uploading those three files.** Tanjiro's `character.js` already points to them. Until PNGs are uploaded, the game uses `standing.svg` as a temporary generic placeholder. This is NOT Tanjiro's final visual.

If the browser shows an old image after uploading, hard-refresh the game or bump Tanjiro's script version in `characters/manifest.js`. The source images can also be cache-busted separately if replaced under identical filenames.

The artwork must be supplied by the user; no artwork from unlicensed sites is bundled in this character package.
