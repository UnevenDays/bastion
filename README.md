# Bastion Breach

A browser tower defense game. **Classic** is the main game. **Minigames** holds extra modes.

- **Classic** — roadside towers, upgrades, shovel, and bosses
- **Minigames → Dungeon Crawler** — place traps and monsters on a zigzag road; adventurers fight your monsters and try to escape

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default: `http://localhost:3847`).

## Netlify

The live site is [https://incandescent-kataifi-3629f2.netlify.app](https://incandescent-kataifi-3629f2.netlify.app). Netlify asks for your team login before the game loads.

`netlify.toml` builds with `npm run build` and publishes the `dist` folder. To put this version on that site, download `bastion_breach_site.zip` from the agent artifacts and upload it with [Netlify Drop](https://app.netlify.com/drop) while you are logged in. Drop it onto the existing site so the address stays the same.

From a machine that is logged into Netlify:

```bash
npm install
npm run build
npx netlify-cli deploy --prod --dir=dist --site=incandescent-kataifi-3629f2
```

## How to play

1. Stay on **Classic** for the main game, or open the **Minigames** tab for **Dungeon Crawler**. Pick **Normal** / **Hard**, then start.
2. Select a tower type, then click an empty grass tile to build (path tiles are blocked).
3. Click a placed tower to upgrade **Damage**, **Attack Speed**, or its **Special**. Choose who it attacks: **First** (closest to the exit), **Strong** (most health), **Weak** (least health), **Last** (closest to the entrance), or **Auto** (nearest). **Invert** flips that choice: First becomes Last, Strong becomes Weak, and Auto aims at the farthest enemy.
4. Use the **Shovel** once per wave to move a tower or sell it for 50% of gold invested. Coins still stored in a Midas Bank are returned in full.
5. Press **Start Wave** when you are ready. Survive all 12 waves — wave 12 is the Final Boss.

Mints cost 130 gold and only print gold **between waves**, after the first wave has ended. They stop printing while a wave is running. Income and payout-rate upgrades still raise each tick. **Midas Bank** takes coins off your gold. When the next wave starts it pays 25% of what is stored, and that payout leaves the bank. Selling returns whatever remains.

**Normal mode** enemies regenerate. If a unit takes no damage for 3 seconds, it restores all of its health. A second bar under the health bar fills until the heal.

**Hard mode** still ramps every wave, with a gentler curve than before: more enemy HP/speed/count, slightly faster spawns, 110 starting gold and 17 lives. Bosses leak for a little extra. Hard enemies do not regenerate.

| Tower  | Special upgrade                                      |
|--------|------------------------------------------------------|
| Archer | Hawk Eye — bigger range + attack aura, less shot dmg |
| Cannon | Focus Charge — more damage, shorter range            |
| Frost  | Glacier Field — area freeze. Damage upgrades are refunded |
| Mint   | Midas Bank — deposit coins; each wave pays 25% and that gold leaves the bank |
| Wasp   | Drone Wing — three mini drones that hunt until their target falls |
| Banner | Grand Banner — the same damage and attack-speed buff reaches every tower |

The **Banner** does not shoot. Towers standing in its range gain damage and attack speed (20% each at base; damage and speed upgrades raise that side). **Grand Banner** applies the same buff to every tower on the map. Several banners stack, up to +60% damage and +60% attack speed.

The **Wasp** has no range circle. It flies to one enemy and keeps attacking until that enemy is destroyed, then picks another. **Drone Wing** launches three smaller drones that do the same. They spread out when several enemies are on the path.

| Enemy      | Notes                                         |
|------------|-----------------------------------------------|
| Splitter   | Pink units that split into two on death       |
| Spawner    | Summons extra enemies every few seconds       |
| Boss       | High health; waves 6 and 9                    |
| Final Boss | Much more health; last enemy on wave 12       |

### Dungeon Crawler

Place **Spike Traps**, **Snares**, **Goblins**, and **Ogres** on the zigzag road only. Adventurers walk the path, take trap damage, and stop to fight monsters (they deal damage back). If they reach the exit, you lose lives. Survive 10 waves; the last spawns an Ogre Slayer.

Adventurers are softer than the defenses they walk into: less health, slower hits, and a milder hard-mode bonus. Spikes and snares hit harder, and goblins and ogres have more health and damage. A goblin also attacks one tile ahead of itself, toward the entrance, so adventurers stop and fight before they step on it. Hard ambush starts with 120 gold and 10 lives.

## Build

```bash
npm run build
npm run preview
```
