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

1. Stay on **Classic** for the main game, or open the **Minigames** tab for **Dungeon Crawler** or **Sun Lawn**. Pick **Normal**, **Hard**, or (Classic only) **Endless**, then start.
2. Select a tower type, then click an empty grass tile to build (path tiles are blocked).
3. Click a placed tower to upgrade **Damage**, **Attack Speed**, or its **Special**. Choose who it attacks: **First** (closest to the exit), **Strong** (most health), **Weak** (least health), **Last** (closest to the entrance), or **Auto** (nearest). **Invert** flips that choice: First becomes Last, Strong becomes Weak, and Auto aims at the farthest enemy.
4. Use the **Shovel** once per wave to move a tower or sell it for 50% of gold invested. Coins still stored in a Midas Bank are returned in full.
5. Press **Start Wave** when you are ready. Normal and Hard end after 12 waves — wave 12 is the Final Boss. **Endless** keeps going until your lives hit 0.

A **Mint** costs 100 gold. It prints gold only while a wave is running, and it stops between waves. That timer is the same in Normal, Hard, and Endless. Income and payout-rate upgrades still raise each tick. **Midas Bank** is the Mint's special: it takes coins off your gold, and when the next wave starts it pays 25% of what is stored. That payout leaves the bank. Selling returns whatever remains.

**Normal mode** tanks regenerate. If a tank takes no damage for 3 seconds, it restores all of its health. A dashed green ring marks tanks, and a second bar under the health bar fills until the heal. Other enemies do not regenerate. Endless uses the same tank regen.

**Hard mode**, on Classic and both minigames: more enemies, more health, and a steeper ramp. Only true gamers would choose this.

**Endless** is Classic only. There is no victory screen. Buttons on the toolbar set the game speed to **1×, 2×, 5×, or 10×**. Enemy count, health, speed, and bounty use the same ramp shape as before, but each step compounds: 10% of the current total. The steps are still wave 15, wave 20, wave 25, wave 40, then every 15 waves (wave 15 is 110% health, wave 20 is 121%, wave 25 is 133.1%). From wave 30, enemies drop no gold. A normal Mint keeps printing on its usual timer. Only a Midas Bank prints twice as slowly from that wave. Its 25% deposit payout does not change.

| Tower  | Special upgrade                                      |
|--------|------------------------------------------------------|
| Archer | Hawk Eye — bigger range + attack aura, less shot dmg |
| Cannon | Focus Charge — more damage, shorter range            |
| Frost  | Glacier Field — area freeze. Damage upgrades are refunded |
| Mint   | Midas Bank — deposit coins; each wave pays 25% and that gold leaves the bank |
| Wasp   | Drone Wing — three mini drones that hunt until their target falls |
| Banner | Grand Banner — the same damage and attack-speed buff reaches every tower |

The **Banner** does not shoot. Towers standing in its range gain damage and attack speed (20% each at base; damage and speed upgrades raise that side). **Grand Banner** applies the same buff to every tower on the map. Several banners stack, up to +60% damage and +60% attack speed.

The **Wasp** costs 180 gold. It has no range circle. It flies a bit slower than before, hits for less, and stays on one enemy until that enemy is destroyed, then picks another. **Drone Wing** launches three smaller drones that do the same at 30% of the wasp's shot damage. They spread out when several enemies are on the path.

| Enemy      | Notes                                         |
|------------|-----------------------------------------------|
| Splitter   | Pink units that split into two on death       |
| Spawner    | Summons extra enemies every few seconds       |
| Boss       | High health; waves 6 and 9                    |
| Final Boss | Much more health; last enemy on wave 12       |
| Challenger | Endless only. Last enemy on waves 30, 40, 50, and every 10 after. On death, two bosses spawn |

### Dungeon Crawler

Place **Spike Traps**, **Snares**, **Goblins**, and **Ogres** on the zigzag road only. Adventurers walk the path, take trap damage, and stop to fight monsters (they deal damage back). If they reach the exit, you lose lives. Survive 10 waves; the last spawns an Ogre Slayer.

Adventurers are softer than the defenses they walk into: less health and slower hits. Hard mode still adds more of them, with more health and a steeper ramp. Spikes and snares hit harder, and goblins and ogres have more health and damage. A goblin has 260 health and hits everyone standing on the tile ahead of it, toward the entrance. Adventurers attack on that strike tile and do not step onto the goblin to fight. Hard ambush starts with 120 gold and 10 lives.

### Sun Lawn

A lane defense. The first **30 seconds** have no zombies, so you can plant before the first wave. You start with **50 sun** (25 on Hard). The lawn pays **25 sun every 20 seconds**, and each **Sunbloom** (50 sun) pays another 25 on that same timer. **Spitters** cost 100 and shoot the first zombie in their lane. **Bulwarks** (50) are walls zombies stop to chew. **Chillers** (175) slow a lane. **Boomnuts** (150) burst when a zombie steps on them. Survive 8 waves. A zombie that reaches the house costs a life. Dig removes a plant and does not refund sun.

## Build

```bash
npm run build
npm run preview
```
