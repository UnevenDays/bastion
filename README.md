# Bastion Breach

A browser tower defense game. **Classic** is the main game. **Minigames** holds extra modes.

- **Classic** — roadside towers, upgrades, shovel, and bosses
- **Minigames → Dungeon Crawler** — place traps and monsters on a zigzag road; adventurers fight your monsters and try to escape

## Play

Open the game at [https://unevendays.github.io/bastion/](https://unevendays.github.io/bastion/).

The source lives in [UnevenDays/bastion](https://github.com/UnevenDays/bastion). A push to `main` builds the game and publishes that address. No login is required to play.

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default: `http://localhost:3847`).

## How to play

1. Stay on **Classic** for the main game, open **Minigames** for **Dungeon Crawler** or **Sun Lawn**, or open **Editor** to build a road. On Classic, pick a road: **Road** (12 waves, tufts), **Switchback** (14, stripes), **Marsh** (16, wet grass and water you cannot build on), **Causeway** (18, cobble), **Orchard** (20, blossom), **Quarry** (22, cut stone), **Night Watch** (24, a dark field with glimmering tiles), or **Desert** (26, sand dunes). Each road has three **warrants**. A warrant is that road's enemy pattern, and it sends one, two, three, or four kinds. No two warrants share a mix. Desert's warrants send the **Desert Husk**: a dried shell that cracks at half health and sprints. Bosses still arrive on waves 6 and 9, and the final boss is still the last enemy of the road. Pick **Normal**, **Hard**, or (Classic only) **Endless**, then start. Endless keeps the road and the warrant you picked, and it does not end at that wave count.
2. Classic asks you to choose towers first. The limit is 8. Each tower you add is marked Added, and that list is the only bench in the run. Then pick a road. Select a tower from the bench and click an empty grass tile to build (path tiles are blocked).
3. Click a placed tower to upgrade **Damage**, **Attack Speed**, or its **Special**. Choose who it attacks: **First** (closest to the exit), **Strong** (most health), **Weak** (least health), **Last** (closest to the entrance), or **Auto** (nearest). **Invert** flips that choice: First becomes Last, Strong becomes Weak, and Auto aims at the farthest enemy.
4. Use the **Shovel** once per wave to move a tower or sell it for 50% of gold invested. Coins still stored in a Midas Bank are returned in full.
5. Press **Start Wave** when you are ready. Normal and Hard end on the last wave of the road you picked. The last enemy of that wave is the Final Boss. **Endless** keeps going until your lives hit 0.

A **Mint** costs 100 gold. It prints gold only while a wave is running, and it stops between waves. That timer is the same in Normal, Hard, and Endless. **Income** and **Payout Rate** still raise each tick, and those two upgrades cost more than a normal tower upgrade: 70, then 140, then 210. **Midas Bank** is the Mint's special: it takes coins off your gold, and when the next wave starts it pays 25% of what is stored. That payout leaves the bank. Selling returns whatever remains.

**Normal mode** tanks regenerate. If a tank takes no damage for 3 seconds, it restores all of its health. A dashed green ring marks tanks, and a second bar under the health bar fills until the heal. Other enemies do not regenerate. Endless uses the same tank regen.

Waves 1–5 use the old health curve. From wave 6 the pack's health is multiplied again, and that number is on the wave button. Wave 6 is **1.25×**, wave 9 is **1.85×**, wave 12 is **2.45×**, wave 18 is **4.37×**, and wave 26 is **6.93×**. Killing one of those enemies leaves a weaker enemy with 42% of its health, a slower step, and 1 gold. That weaker enemy does not leave another. Bosses, the final boss, Challengers, and splitters keep their own death rules. An editor level does not use this multiplier.

**Hard mode**, on Classic and both minigames: more enemies, more health, and a steeper ramp. Only true gamers would choose this.

**Endless** is Classic only. There is no victory screen. When the run ends, type a name to save the wave and gold on the leaderboard stored in this browser. The top 10 are ranked by wave, then gold. Buttons on the toolbar set the game speed to **1×, 2×, 5×, or 10×**. Enemy count, health, speed, and bounty use the same ramp shape as before, but each step compounds: 10% of the current total. The steps are still wave 15, wave 20, wave 25, wave 40, then every 15 waves (wave 15 is 110% health, wave 20 is 121%, wave 25 is 133.1%). From wave 15, every five waves alternate a mutator. **Armor** soaks 8 damage off each hit against the pack, and that soak rises slowly later. Bosses are not armored. **Marked** enemies ignore every tower that is not set to **Strongest** with Invert off. From wave 30, enemies drop no gold. A normal Mint keeps printing on its usual timer. Only a Midas Bank prints twice as slowly from that wave. Its 25% deposit payout does not change.

| Tower  | Special upgrade                                      |
|--------|------------------------------------------------------|
| Archer | Hawk Eye — bigger range, less shot damage. The aura does not deal damage. 45 gold |
| Cannon | 80 gold. A tight blast. Area Damage widens it and hits harder. Focus Charge adds damage, shortens range, and fires faster |
| Frost  | Shots slow enemies to 52% speed. Glacier Field costs 180 gold and pulses a chill at 40% speed. Area widens it, Chill lengthens it, and Shorter Cooldown brings the next pulse sooner |
| Mint   | Midas Bank — deposit coins; each wave pays 25% and that gold leaves the bank |
| Wasp   | Drone Wing (264g) — three mini drones at a quarter of the wasp's damage |
| Banner | Grand Banner — the same damage and attack-speed buff reaches every tower |
| Storm  | Cloud Allies — every 15 seconds a cloud fights on the path. 150 gold |
| Pyro   | Inner Flame — smaller radius, and that interior burns everything inside |
| Mace   | Two More Maces — two extra maces join the spin |
| Sniper | Supply Drop — 1 life and 35 gold, once each wave, and the price rises |
| Chomp  | Double Bite — swallows two enemies, then takes one nap |
| Nuke   | Detonates on placement. 200 gold. No upgrade |

The **Chomp** costs 140 gold. It swallows one enemy inside its circle, pays that enemy's bounty, then sleeps for 25 seconds. The area upgrade widens the circle. The sleep upgrade cuts 5 seconds off the nap, down to 10 seconds. **Double Bite** swallows two enemies and then takes a single nap.

The **Sniper** costs 130 gold. It has no range limit. The round is slow and heavy, hard enough that a wave-1 grunt falls in one hit. **Supply Drop** gives 1 life and 35 gold. Each sniper can call it once per wave. The first call costs 50 gold, and every call after that costs 25 more.

The **Mace** costs 90 gold. One mace spins around the tower and strikes every enemy it passes. Damage upgrades and area upgrades both raise how hard it hits and how wide it swings. Area upgrades widen the circle more. Damage upgrades raise the hit more. **Two More Maces** adds two flails, so three maces share the circle.

The **Nuke** costs 200 gold. It explodes the moment you place it, then it is gone. Every enemy on the field is left with a tenth of its health, and at least 1. Towers in the surrounding **3×3** are destroyed, including coins stored in a Midas Bank there. The tile you chose becomes a crater. Nothing can be built on it for the rest of the run. A new run clears the craters.

The **Pyro** costs 60 gold. Its range is shorter than the other shooters. A shot deals fire damage, and a target that is not already burning takes that hit again as extra damage. The burn then ticks for a few seconds. A slow, including Frost, puts the fire out. **Inner Flame** shrinks the radius further and deals burn damage to every enemy in that interior.

The **Storm** costs 45 gold. It has no range circle and no aim. It sticks lightning on random spots across the map. One in four strikes is guaranteed to hit a living enemy; the rest only hurt enemies standing in the splash. **Cloud Allies** costs 150 gold. While a wave is running, the tower summons a cloud at the path entrance every 15 seconds, up to five at once. Each cloud has **200 health** (five times a wave-1 grunt's 40) and hits for **40**, so that grunt falls in one strike. Enemies hit the cloud back. Damage upgrades raise the lightning and the cloud's hits. The 15 second timer does not change. Selling the Storm dismisses its clouds.

The **Banner** does not shoot. Towers standing in its range gain damage and attack speed (20% each at base; damage and speed upgrades raise that side). **Grand Banner** applies the same buff to every tower on the map. Several banners stack, up to +60% damage and +60% attack speed.

The **Wasp** costs 180 gold. It has no range circle. It flies to one enemy and stays until that enemy is destroyed, then picks another. Each damage rank adds 30% of the base shot. **Drone Wing** costs 264 gold and launches three smaller drones that hunt the same way at 25% of the wasp's shot damage. They spread out when several enemies are on the path.

| Enemy      | Notes                                         |
|------------|-----------------------------------------------|
| Splitter   | Pink units that split into two on death       |
| Spawner    | Summons extra enemies every few seconds       |
| Boss       | High health; waves 6 and 9                    |
| Final Boss | Much more health; last enemy on wave 12       |
| Challenger | Endless only. Last enemy on waves 30, 40, 50, and every 10 after. On death, two bosses spawn |
| Thief      | From wave 2. More health than a grunt, and faster than a runner. Steals 1 gold each second. Killing it returns 20% of the gold it took. If it leaks, that gold is gone |
| Sapper     | From wave 4, the first enemy of the wave. It stops beside one tower and shuts that tower off for 4 seconds, then walks on. A full Archer line loses that tower while the pack passes |

### Level editor

The **Editor** tab lays a Classic road. Click tiles in order. Click a tile already on the road to pull the end back. Set starting **gold** and **lives**, then set each wave's enemies: kind, count, health, speed, and the gold they drop. Clearing the last wave wins. The draft stays in this browser.

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
