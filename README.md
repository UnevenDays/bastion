# Bastion Breach

A browser tower defense game with two modes:

- **Bastion Defense** — classic roadside towers, upgrades, shovel, and bosses
- **Dungeon Ambush** — place traps and monsters on a zigzag road; adventurers fight your monsters and try to escape

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default: `http://localhost:3847`).

## Permanent hosting (easiest on phone: Netlify Drop)
##Permanent Netlify Link is: https://6ac1155c4f568a9c1195e18f--incandescent-kataifi-3629f2.netlify.app

GitHub’s **mobile app does not show Pages** in Settings. Use Netlify Drop instead:

1. Download `bastion_breach_site.zip` from the agent artifacts (or run `npm run build` and zip the `dist` folder).
2. On your phone open **https://app.netlify.com/drop** in Safari/Chrome.
3. Upload the zip (free signup if asked).
4. You get a permanent link like `https://something.netlify.app`.

### Optional: GitHub Pages (needs desktop site)

After **Create repo** in Cursor, open the repo in Safari → **Request Desktop Website** → **Settings → Pages → Source: GitHub Actions**.

Temporary tunnel links expire when the cloud agent session ends.

## How to play

1. Pick **Bastion Defense** or **Dungeon Ambush**, then **Normal** / **Hard**, and start.
2. Select a tower type, then click an empty grass tile to build (path tiles are blocked).
3. Click a placed tower to upgrade **Damage**, **Attack Speed**, or its **Special**.
4. Use the **Shovel** once per wave to move a tower or sell it for 50% of gold invested. Coins stored in an Investment Bank are returned in full.
5. Press **Start Wave** when you are ready. Survive all 12 waves — wave 12 is the Final Boss.

Mints only print gold **while a wave is running**, not during the build time between waves. Income and payout-rate upgrades still raise each tick. **Investment Bank** lets you deposit extra coins into that mint; when the next wave starts it pays 25% of the stored amount and keeps the deposit.

**Normal mode** enemies regenerate. If a unit takes no damage for 3 seconds, it restores all of its health. A second bar under the health bar fills until the heal.

**Hard mode** still ramps every wave, with a gentler curve than before: more enemy HP/speed/count, slightly faster spawns, 110 starting gold and 17 lives. Bosses leak for a little extra. Hard enemies do not regenerate.

| Tower  | Special upgrade                                      |
|--------|------------------------------------------------------|
| Archer | Hawk Eye — bigger range + attack aura, less shot dmg |
| Cannon | Focus Charge — more damage, shorter range            |
| Frost  | Glacier Field — area freeze aura, no damage          |
| Mint   | Investment Bank — deposit coins; each wave pays 25%  |

| Enemy      | Notes                                         |
|------------|-----------------------------------------------|
| Splitter   | Pink units that split into two on death       |
| Spawner    | Summons extra enemies every few seconds       |
| Boss       | High health; waves 6 and 9                    |
| Final Boss | Much more health; last enemy on wave 12       |

### Dungeon Ambush

Place **Spike Traps**, **Snares**, **Goblins**, and **Ogres** on the zigzag road only. Adventurers walk the path, take trap damage, and stop to fight monsters (they deal damage back). If they reach the exit, you lose lives. Survive 10 waves; the last spawns an Ogre Slayer.

Adventurers are softer than the defenses they walk into: less health, slower hits, and a milder hard-mode bonus. Spikes and snares hit harder, and goblins and ogres have more health and damage. Hard ambush starts with 120 gold and 10 lives.

## Build

```bash
npm run build
npm run preview
```
