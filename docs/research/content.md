# He is Coming — Content Research Dataset (starter data for a browser clone)

Game: *He is Coming* (Chronocle / Hooded Horse, Steam 2824490). Early Access; latest patch seen 0.9.22 (13 Jul 2026, "Gauntlet" mode added in Patch #15). 1.0 (planned 2026) is announced to add a new PvE biome and **the Demon King himself — he is NOT in the game yet**, so there are no official stats for "He". The Woodland final boss is Leshen → Woodland Abomination; the Swampland final boss is the Swampland Hydra (3 of 4 heads).

**Single hero** (no selectable characters; Kingmaker crowns unlock cosmetic skins only). Player intrinsic stats: 10 max health, 0 attack/armor/speed (all stats come from items).

## Sources (in order of usefulness)
1. **Official wiki via Wayback Machine** (primary; exact text + stat icons). The live wiki (wiki.hoodedhorse.com/He_is_Coming/) is Cloudflare-blocked, but ~400 pages are archived Jul–Sep 2025. Fetch with `https://web.archive.org/web/<ts>id_/https://wiki.hoodedhorse.com/He_is_Coming/<Page>` (responses are gzipped; use `curl --compressed`). Page index: `https://web.archive.org/cdx/search/cdx?url=wiki.hoodedhorse.com/He_is_Coming/*&collapse=urlkey&filter=statuscode:200`.
   - Woodland_items, Swampland_items (full weapon/item/jewelry/food/tome/elixir tables — ~20 Jul 2025 snapshot)
   - Woodland_enemies, Swampland_enemies (enemies per biome L1–L3, bosses with week, Hydra heads)
   - Woodland_itemsets, Swampland_itemsets, Kingmaker_itemsets (sets)
   - Woodland_map, Swampland_map, Kingmaker_map, Beginner's_Guide (structure & locations)
   - Forge_Upgrades, Weapon_modifications, Cauldron (Combined_Food_items), Crone, tag pages (Acid, Poison, Stun, Riptide, Purity, Regeneration, Thorns, Stone, Wood, Water, Jewelry, Sanguine, Ring, Potion…). Tag pages (Aug–Sep 2025) also give **Golden / Diamond** values ("— at Gold: 2, at Diamond: 4").
2. **github.com/eseidel/he_is_coming** — Dart simulator with **machine-readable YAML** (`he_is_coming/lib/data/{items,creatures,sets,edges,blade_oils,triggers,challenges}.yaml`, ~200 items). Only Demo 0.3.5 (Sept 2024) data, so numbers are old, but the schema + battle engine (`lib/src/battle.dart`) are a good reference. Web UI: https://eseidel.github.io/he_is_coming/
3. **github.com/badnewsgoonies-dot/HeIsComing-main1** — `details.json` (375 entries: 259 items, 91 weapons, 25 upgrades; slug/name/effect/tags, mostly no stats) + `heic_sets.js`, `heic_effects.js`, `heic_sim.js` JS simulator. Newer names (full-release era) but effect text looks partly paraphrased; use as a cross-check / name list.
4. Other GitHub: badnewsgoonies-dot/he-is-coming-parity (Python engine skeleton + JSON schemas, Steam patch summary), Intybyte/CustomItems & MrMcDucky/HiCModFramework (BepInEx C# mods — show the game is Unity/C# and moddable), laun-the-warrior/he-is-coming-interface (single HTML compendium).
5. changelog.gg/games/he-is-coming-2824490 (patch notes), worthplaying.com roadmap article (1.0 in 2026 with Demon King).

Local copies in this scratchpad: `wiki/*.txt` (plain-text wiki pages), `tables_items.txt`, `tables_tags.txt` (parsed tables with stat icons), `he_is_coming/` (eseidel clone), `bng_details.json`, `bng_heic_*.js`, `cdx.txt` (archive index), scripts `fetch.py`, `tables.py`.

Caveat: balance changes often (wiki pages differ by snapshot date — e.g. Blackbriar Blade is "Gain 2 attack for each thorn" in July but "Whenever you would gain thorns, gain 1 attack instead" in Aug; Emerald Gemstone changed; Holy Tome is Countdown 4 vs 6). Treat values as a July–Sept 2025 baseline.

---
## Core mechanics (from Beginner's Guide + tag pages)
- **Stats:** Health, Attack (damage per strike), Armor (absorbs damage before health; **replenishes between battles** — i.e. armor from items is "base armor", resets each fight), Speed (higher speed strikes first; **tie → player first**). Negative stats are possible.
- **Turn structure:** fighters alternate turns; each turn: Turn Start triggers → strike(s) → Turn End. Items trigger **in slot order** (left→right); slots are reorderable.
- **Triggers:** Battle Start; Turn Start; Turn End; First Turn; On Hit; **Exposed** (first time your armor reaches 0; once per battle unless modified); **Wounded** (first time you drop below 50% health; once per battle); Every other turn (turns 2,4,6… per wiki; sim found 1st,3rd…); Every N strikes; **Countdown N** (fires when counter reaches 0; tomes); **Symphony** (trigger another random Instrument item); Whenever…; Next boss (one-time after next boss defeat: eggs hatch, Squire/Knight gear upgrades).
- **Status effects:**
  - Thorns: when struck, deal damage equal to thorns; thorns are removed at turn end only if they triggered.
  - Freeze: halves attack while you have stacks; remove 1 at end of turn.
  - Poison: at your turn start, if you have 0 armor take damage = poison; then remove 1 stack.
  - Acid: at your turn start, lose armor = acid stacks (doesn't decay per wiki text).
  - Regeneration: at turn end restore health = stacks, then remove 1.
  - Stun: skip your strike, then remove 1 stack (non-strike items still trigger).
  - Riptide: at end of afflicted unit's turn take 5 damage and remove 1 stack (triggers once/turn).
  - Purity: no decay; when a stack is removed, gain +1 attack and restore 3 health.
- **Item tags:** Stone, Wood, Water, Jewelry, Edge, Sanguine, Ring, Unique, Food, Bomb, Instrument, Tome, Rune, Potion, Crone (cursed), Rose (max 1 equipped), Mythic (all mythics unique).
- **Rarities:** Common, Rare, Heroic, Mythic (+ Cursed in Swampland). **Quality tiers:** Normal / Golden (x2 numbers) / Diamond (x4 numbers). Two identical commons/goldens combine at a Golem into the next tier. Treasure chests: 1/80 golden, 1/500 diamond.
- **Inventory:** 1 weapon slot (picking another weapon destroys the old one, unless a weapon-modification combo applies) + 4 item slots at start, **+2 slots per boss defeated**.
- **Run structure:** a week = 3 days + 3 nights, then a boss. Day = 50 tiles of movement (sight 5), night = 30 tiles (sight 3; enemies that see you chase you). Enemies give 1 gold. Boss can be fought early from the pause menu. Woodland: 2 weeks of bosses + Leshen in week 3 (final). Swampland: weekly bosses + Hydra finale. Kingmaker: async PvP vs other players' builds (5 wins = crown); pick 3 of 6 item bundles.
- **Blade Oils:** +1 Attack, +1 Armor or +1 Speed to weapon (each once per weapon; reset on weapon change).
- **Challenges:** 65 per map (13x5 grid); each unlocks an item into the pool (e.g. "Win against Black Knight for the first time → Iron Rose").

### Map locations
| Location | Effect |
|---|---|
| Treasure Chest | Choose 1 of 3 Common items (1/80 golden, 1/500 diamond) |
| Blade Oil | +1 Attack / Armor / Speed to weapon |
| Campfire | At night: skip to next day, restore 10 health |
| Home | Next to spawn; at night skip to next day, restore all health |
| Crystal Ball | Reveal 1 of 3 locations |
| Forge | Choose 1 of 2 edges for weapon; replacing costs 10 gold |
| Golem | Combine 2 identical common/golden items into golden/diamond |
| Large Golem | Upgrade regular→Golden or Golden→Diamond |
| Lookout Tower | Reveal map in 11-tile radius |
| Traveling Merchant | 5 Rare (3 or 5 gold) + 1 Heroic (10 gold); reroll 1 gold (+1 each time) |
| Waypoint | Fast travel |
| Hero's Grave | Choose 1 of 3 Heroic items (gated area, opens at night) |
| Fairy / Fairy Queen | Transform an item into another of same rarity / all items to higher rarity |
| Jewelry Box | Choose 1 of 3 Jewelry |
| Wishing Well | 5 gold → Golden item, 10 → Diamond item, 20 → permanent boon |
| Cauldron | Combine two Food items |
| Beehive | Honeycomb (super-ingredient for Cauldron), guarded by Honey Bees |
| Ferryman / Sinkhole (Swampland) | Travel to one of 3 islands / random island |
| Bargaining Tent | 2 Rare items for 5 gold; haggle: 75% → 4, 25% → 7 |
| Weapon Pile | Choose 1 of 3 weapons |
| Ancient Tomes | Choose 1 of 3 tomes |
| Rune Stone | Choose Blood Rune / Echo Rune / Iron Rune |
| Woodcutter | Combine 2 items into a random Heroic |
| Large Bonfire | At night: skip to day, restore all health |
| Crone | Choose 1 of 2 Cursed items |
| Junksmith (Kingmaker) | Copy an item |
| Farmer (Kingmaker) | Choose 1 of 3 Food items |

---
## Enemies

### Woodland regular enemies (stats Health/Attack/Armor/Speed per level; level rises each week)
| Enemy | L1 (HP/ATK/ARM/SPD) | L2 | L3 | Trait | Biomes |
|---|---|---|---|---|---|
| Bear | 3/1/2/0 | 5/2/3/1 | 7/3/4/2 | Bear gains 3/4/5 additional attack while the player has armor | Starting Area, Forest |
| Spider | 2/1/0/2 | 3/1/0/3 | 4/1/0/4 | Battle Start: If Spider has more speed than the player, it deals 3/4/5 damage | Starting Area, Flower Glade |
| Wolf | 3/1/0/1 | 6/2/0/2 | 9/2/0/3 | Wolf gains 2/3/4 additional attack while the player has 5 or less health | Starting Area, Rocky Plains |
| Bat | 4/1/0/2 | 6/2/0/3 | 8/3/0/4 | Every other strike Bat gains 1/2/3 health on hit | Forest |
| Hedgehog | 1/1/1/0 | 2/1/2/0 | 7/1/3/0 (wiki; sim data says 3/1/4/0) | Battle Start: Hedgehog gains 3/4/5 thorns | Flower Glade |
| Raven | 3/0/0/2 | 5/0/0/3 | 7/0/0/4 | On hit Raven steals 1/2/3 gold | Rocky Plains |

(Demo-era variant from eseidel data: Crazed Honeybear L2 10/4/6/2, L3 14/6/8/4 — "Bear deals 4/5 additional damage while you have armor".)

### Swampland regular enemies
| Enemy | L1 | L2 | L3 | Trait | Islands |
|---|---|---|---|---|---|
| Snake | 2/1/0/2 | 3/1/0/3 | 4/1/0/4 | First Turn: Snake applies 2/3/4 poison on hit | Starting Island |
| Frog | 2/1/2/0 | 2/2/3/2 | 2/3/4/3 | When exposed Frog gains 1/2/3 armor | Starting Island, Abandoned Quarry, Witch Marsh |
| Beaver | 4/1/0/1 | 6/2/0/2 | 8/3/0/3 | Battle Start: Beaver gains 3/4/5 regeneration | Abandoned Quarry, Glyph Ruins, Golem Home |
| Dragonfly | 2/0/0/3 | 3/0/0/5 | 4/0/0/7 | Battle Start: If Dragonfly has more speed it gains attack equal to the difference | Scorched Hill, Witch Marsh |
| Palace Guard | 2/3/10/0 | 2/6/15/0 | 2/9/20/0 | (none) | Sunken Palace |
| Slime | 2/2/2/0 | 2/2/4/0 | 2/2/6/0 | Battle Start: Give the player 4/6/8 gold | Golem Home, Scorched Hill |
| Turtle | 1/3/15/0 | 1/6/15/0 | 1/9/15/0 | Turtle loses all armor upon taking damage | Glyph Ruins |
| Honey Bee | 6/2/15/2 | 10/2/15/4 | 14/2/15/6 | First Turn: Give the player 3/4/5 poison, 2/3/4 acid and 1/2/3 stun | Lushwood Grove (guards Beehive) |

Kingmaker biomes: Starting Area (Frog, Wolf), Blackrock Battlefield (Dragonfly, Raven), Cauldron Hollow (Bear, Beaver), Elderwood Cemetery (Bat, Snake), Farmland Fields (none), Golem Glade (Hedgehog, Turtle), Petrified Forest (Slime, Spider).

---
## Bosses

### Woodland bosses (one random boss per week; preview with Tab)
| Boss | HP | ATK | ARM | SPD | Trait | Week |
|---|---|---|---|---|---|---|
| Black Knight | 10 | 0 | 5 | 0 | Battle Start: Black Knight gains attack equal to the Player's attack plus 2 | 1 |
| Bloodmoon Werewolf | 20 | 3 | 0 | 1 | While player is below 50% health, Bloodmoon Werewolf has 5 additional attack | 1 |
| Brittlebark Beast | 50 | 3 | 0 | 2 | Whenever Brittlebark Beast takes damage, he takes 3 additional damage | 1 |
| Ironstone Golem | 5 | 4 | 15 | 0 | Exposed: Ironstone Golem loses 3 attack | 1 |
| Razorclaw Grizzly | 10 | 3 | 5 | 2 | Razorclaw Grizzly's attacks ignore armor | 1 |
| Razortusk Hog | 5 | 4 | 0 | 4 | If Razortusk Hog has more speed than you, his first strike deals 10 additional damage | 1 |
| Blackbriar King | 50 | 0 | 0 | 0 | Can't attack but when taking damage it gains 2 thorns and when wounded gains 4 thorns | 2 |
| Frostbite Druid | 10 | 3 | 20 | 4 | On hit: Give the player 1 freeze | 2 |
| Goldwing Monarch | 40 | 3 | 0 | 4 | Wounded: Steals all the player's gold and restores 2 health per gold stolen | 2 |
| Mountain Troll | 20 | 10 | 10 | 0 | Mountain Troll only strikes every other turn | 2 |
| Redwood Treant | 25 | 3 | 15 | 0 | Redwood Treant gains 3 attack if the player has no armor | 2 |
| Swiftstrike Stag | 10 | 3 | 10 | 5 | Swiftstrike Stag strikes 3 times per turn | 2 |
| **Leshen** (final) | 50 | 7 | 0 | 3 | Upon death turns into Woodland Abomination and player recovers health and armor. Lore: "Once a guardian of the forest, now a servant of the Demon King…" | 3 |
| **Woodland Abomination** (Leshen phase 2) | 100 | 0 | 0 | 3 | Woodland Abomination gains 1 attack each turn | 3 |

Demo-era bosses (eseidel creatures.yaml, 0.3.5 — renamed/removed since): Bearserker 20/4/10/2 "Ignores armor"; Hothead 5/4/0/4 "If Hothead has more speed than you, his first strike deals 10 additional damage"; Gentle Giant 40/0/0/0 "Whenever Gentle Giant takes damage he gains 2 thorns. Wounded: Gain 4 thorns instead"; Granite Griffin (Woodland) 10/5/10/0; Stormcloud Druid 20/3/0/2 "If Stormcloud Druid takes damage more than once per turn, stun the player for 1 turn"; Bloodmoon Werewolf 15/3/0/1 "Turn Start: If the player is below 50% health, execute the player".

### Swampland bosses
| Boss | HP | ATK | ARM | SPD | Trait | Week |
|---|---|---|---|---|---|---|
| Carnivorous Slime | 20 | 1 | 5 | 5 | Battle Start: Give 3 acid to the player and convert all player health except 1 to armor | 1 |
| Fungal Giant | 30 | 3 | 0 | 0 | Battle Start: Fungal Giant gains 1 poison for each status effect the player has | 1 |
| Ironshell Snail | 5 | 3 | 50 | -1 | Battle Start: Ironshell Snail gains 5 acid | 1 |
| Stormcloud Druid | 20 | 2 | 0 | 2 | Every Other Strike: Stun the player for 1 turn | 1 |
| Swampsong Siren | 15 | 3 | 0 | 2 | Battle Start: Swampsong Siren gives the player -2 attack | 1 |
| Toxic Miretoad | 20 | 2 | 0 | 3 | Battle Start: Toxic Miretoad steals all of the player's armor and gives them 3 poison | 1 |
| Clearspring Spirit | 30 | 3 | 0 | 2 | Battle Start: Gain 10 purity and on hit randomly decreases it on itself or player | 2 |
| Granite Griffin | 20 | 5 | 10 | 0 | Wounded: Granite Griffin gains 40 armor and gets stunned for 4 turns | 2 |
| Liferoot Experiment | 40 | 3 | 0 | 0 | Battle Start: Liferoot Experiment gains 10 regeneration | 2 |
| Silverscale Shark | 15 | 0 | 10 | 3 | Turn Start: Give the player 2 riptide and gain 1 attack for each riptide the player has | 2 |
| Rockshell Tortoise | 20 | 4 | 10 | 0 | Whenever Rockshell Tortoise is struck, it gains 4 armor | 2 |
| Murkwater Gator (island boss, Murkwater Bayou) | 20 | 4 | 15 | 3 | Battle Start: Murkwater Gator gives the player riptide equal to the player's attack | — |
| Coven Plaguemother (island boss, Coven Lair) | 30 | 3 | 10 | 2 | On Hit: Give the player 2 stacks of a random status effect that they don't already have | — |

### Swampland Hydra (final; player removes 1 of 4 heads, fights the other 3 in order; no heal/status reset between)
| Head | Fight # | HP | ATK | ARM | SPD | Trait |
|---|---|---|---|---|---|---|
| Acid Head | 1 | 10 | 3 | 30 | 4 | On Hit: Give the player 1 acid |
| Riptide Head | 2 | 30 | 5 | 0 | -1 | On Hit: Give the player 1 riptide |
| Poison Head | 3 | 50 | 2 | 0 | 2 | On Hit: Give the player 2 poison |
| Stun Head | 4 | 20 | 5 | 30 | 5 | Battle Start: Give the player 3 stun |

### "He" / the Demon King
Not implemented as of patch 0.9.22 (Jul 2026). Lore: the Demon King's crown is the Kingmaker objective; the 1.0 release (2026) is announced to add "the rumoured but never seen Demon King" plus a new PvE biome. For a clone, design him as an original final boss.

---
## Item sets (need 1 of each listed item equipped)
| Set | Required items | Bonus | Region |
|---|---|---|---|
| Highborn | Any 3 rings | Ring items trigger twice | Both |
| Bloodmoon Strike | Bloodmoon Dagger + Swiftstrike Gauntlet | Wounded: Restore health equal to damage dealt by strikes on your next turn | Woodland |
| Briar Greaves | Assault Greaves + Jagged Edge | Whenever you take damage gain 1 thorn | Woodland |
| Brittlebark Blessing | Brittlebark Club + Brittlebark Armor + Brittlebark Buckler | Brittlebark items have no effect (i.e. negate their drawbacks) | Woodland |
| Elderwood Mask | Elderwood Staff + Elderwood Necklace | Battle Start: Double your base attack, armor and speed | Woodland |
| Hero's Return | Sword of the Hero + Boots of the Hero + Shield of the Hero | Gain 2 attack, armor and speed | Woodland |
| Ironbark Shield | Pinecone Breastplate + Stone Steak | Battle start: If your health is full, gain 1 armor each turn | Woodland |
| Lifeblood Transfusion | Iron Transfusion + Lifeblood Armor | Restore 10 health after every battle | Woodland |
| Raw Hide | Leather Boots + Leather Glove + Leather Vest | Gain 1 attack every other turn | Woodland |
| Redwood Crown | Redwood Rod + Redwood Cloak + Redwood Helmet | Wounded: Restore health to full | Woodland |
| Saffron Talon | Featherweight Blade + Saffron Feather | On Hit: Gain 1 speed | Woodland |
| Steelplated Thorns | Spearshield Lance + Bramble Buckler | Turn Start: If you have less than 10 thorns, double your thorns | Woodland |
| Basilisk's Gaze | Basilisk Fang + Basilisk Scale | Battle Start: Your opponent is stunned for 2 turns | Swampland |
| Champion's Greaves | Champion's Armor + Champion's Blade | Gain 6 speed | Swampland |
| Deadly Toxin | Nerve Poison + Viper Extract | The first time the enemy gains poison give the enemy 2 acid | Swampland |
| Holy Crucifix | Holy Shield + Holy Tome | Negates negative base stats | Swampland |
| Ironstone Crest | Forge Hammer + Forge Gauntlet | Turn Start: Steal 2 armor from the enemy | Swampland |
| Ironstone Fang | Crimson Fang + Venomous Fang | First Turn: Gain 3 armor on hit | Swampland |
| Marble Anvil | Marble Sword + Serpent Lyre | Battle Start: Trigger Exposed | Swampland |
| Marshlight Aria | Marshlight Lantern + Riverflow Violin | Exposed: Trigger Symphony twice | Swampland |
| Twilight Crest | Moonlight Crest + Sunlight Crest | As long as you're below 50% health all healing is doubled | Swampland |
| Vampire Cloak | Sanguine Morphosis + Vampiric Stasis | Turn Start: If you are stunned double healing this turn | Swampland |
| Weaver Medallion | Weaver Armor + Weaver Shield | Gain 5 health | Swampland |
| Seafood Hotpot | Clearspring Watermelon + Silverscale Fish + Sour Lemon | Turn Start: Gain 2 armor for each speed you have | Swampland |
| Crystal Mirror | Marble Mirror + Sinful Mirror | Whenever you gain a status effect, give it to the enemy as well | Kingmaker |
| Iron Chain | Chainmail Sword + Chainmail Armor | Gain 5 armor | Kingmaker |
| Ironstone Arrowhead | Ironstone Spear + Ironstone Sandals | On Hit: Gain 1 armor | Kingmaker |
| Ironstone Ore | Ironstone Bracelet + Petrified Statue | Gain armor equal to minus speed | Kingmaker |
| Sanguine Gemstone | Sanguine Scepter + Ruby Gemstone | If your attack is exactly 1 restore 1 health on hit | Kingmaker |

(Demo-era sets from eseidel: Stone Scales = Petrifying Flask + Razor Scales → "Wounded: Gain 10 armor".)

---
## Weapon upgrades

### Forge edges (1 per weapon; first free, overwrite 10 gold)
| Edge | Effect |
|---|---|
| Agile Edge | Battle Start: Gain 1 additional strike |
| Bleeding Edge | On Hit: Restore 1 health |
| Blunt Edge | On Hit: Gain 1 armor |
| Cleansing Edge | Ignore the first status effect you're afflicted with |
| Cutting Edge | On Hit: Deal 1 damage |
| Featherweight Edge | On Hit: Convert 1 speed to 1 attack |
| Freezing Edge | Battle Start: Give the enemy 3 freeze |
| Gilded Edge | On Hit: If you have less than 10 gold, gain 1 gold |
| Jagged Edge | On Hit: Gain 2 thorns and take 1 damage |
| Oaken Edge | Battle Start: Gain 3 regeneration |
| Oozing Edge | On Hit: If the enemy doesn't have any poison, give them 2 poison |
| Petrified Edge | Double your attack. On Hit: Gain 1 stun |
| Plated Edge | On Hit: Convert 1 speed to 3 armor |
| Razor Edge | Battle Start: Gain 1 attack |
| Stormcloud Edge | Battle Start: Stun the enemy for 1 turn |
| Whirlpool Edge | Every 3 strikes, give the enemy 1 riptide |
(Demo-only: Titan's Edge "Only strike every other turn, but deal double damage"; Smoking Edge, Thieving Edge are challenge unlocks.)

### Weapon modifications (pick up weapon B while holding A → merged Heroic weapon)
| Result | Stats | Effect | Recipe |
|---|---|---|---|
| Brittlebark Blade | atk 12 | On Hit: Lose 2 attack | Brittlebark Club + Brittlebark Bow |
| Galestrike Rapier | atk 2, spd 7 | Battle Start: If you have more speed than the enemy, gain 3 additional strikes. On Hit: Lose 1 speed | Gale Staff + Swiftstrike Rapier |
| Liferoot Dagger | atk 2 | Wounded: Take 2 damage, then gain 3 regeneration and 5 attack | Liferoot Staff + Bloodmoon Dagger |
| Perfect Iceblade | atk 7 | You cannot gain freeze | Melting Iceblade + Frozen Iceblade |
| Boom Spear | atk 1 | On Hit: Gain 2 thorns and deal 2 damage | Boom Stick + Razorthorn Spear |
| Spear of the Hero | atk 3 | Every other turn, gain 1 attack and restore 1 health | Evergrowth Spear + Sword of the Hero |
| Stonesnake Sword | atk 2 | On Hit: Give the enemy 2 poison and gain 2 armor | Stoneslab Sword + Serpent Dagger |
| Bloodlord's Whip | atk 5, hp 4 | Battle Start: Gain 5 max health and steal 5 health from the enemy | Bloodlord's Axe + Leather Whip |
| Pacifist Trident | atk 0 | On Hit: Give the enemy 1 riptide and gain 1 armor and restore 1 health | Pacifist Staff + Silverscale Trident |

---
## Tag membership (from wiki tag pages)
- **Stone:** Ironstone Greatsword, Ironstone Bow, Ironstone Spear, Granite Hammer, Granite Lance, Granite Axe, Stoneslab Sword, Marble Sword, Mountain Cleaver, Grindstone Club, Ironstone Bracelet, Ironstone Sandals, Ironstone Armor, Stone Steak, Granite Crown, Granite Egg, Granite Fungi, Ore Heart, Petrified Statue, Stoneborn Turtle, Granite Thorns, Marble Mirror, Cracked Bouldershield, Cracked Whetstone, Granite Tome, Petrifying Flask, Petrifying Elixir (+ stone cauldron foods)
- **Wood:** Elderwood Staff, Redwood Rod, Brittlebark Bow, Brittlebark Club, Liferoot Staff, Liferoot Hammer, Quickgrowth Spear, Pacifist Staff, Arcane Wand, Woodcutter's Axe, Redwood Cloak, Redwood Helmet, Redwood Roast, Liferoot Gauntlet, Pinecone Breastplate, Heart-shaped Acorn, Oak Heart, Brittlebark Buckler, Brittlebark Armor, Elderwood Necklace, Twisted Root, Treebark Egg, Liferoot Beast, Liferoot Lute, Muscle Growth, Liferoot Tome
- **Water:** Frozen Iceblade, Melting Iceblade, Frostbite Dagger, Icicle Spear, Purelake Staff, Riverflow Rapier, Lakebed Sword, Iceblock Shield, Frostbite Gauntlet, Frostbite Trap, Ice Spikes, Ice Tomb, Frostbite Armor, Frostbite Greaves, Clearspring Feather/Watermelon/Opal/Rose/Cloak/Duck, Purelake Helmet/Armor/Potion/Elixir/Chalice/Tome, Riverflow Talisman, Riverflow Violin
- **Jewelry:** Bejeweled Blade, Gemstone Scepter, Royal Scepter, all Earrings/Crowns/Rings/Gemstones in the Jewelry table
- **Sanguine:** Heart Drinker, Bloodmoon Dagger, Bloodmoon Sickle, Lifeblood Spear, Sanguine Scepter, Bloodlord's Axe, Deviled Egg, Vampiric Wine, Lifeblood Burst, Heart-shaped Potion, Sanguine Rose, Vampire's Tooth, Blood Chain, Crimson Fang, Bloodstone Ring, Crimson Cloak, Lifeblood Armor, Sanguine Imp, Sanguine Morphosis, Sanguine Tome, Vampiric Stasis
- **Ring:** Ring Blades, Emerald Ring, Ruby Ring, Sapphire Ring, Citrine Ring, Gold Ring, Bloodstone Ring, Rusty Ring, Thorn Ring
- **Potion:** Heart-shaped Potion, Ironskin Potion, Lightspeed Potion, Lightning Bottle, Muscle Potion, Nerve Poison, Petrifying Flask, Purelake Potion, Slime Potion, Viper Extract (+ Elixir versions)
- **Bomb:** Cherry Bomb, Kindling Bomb, Iron Shrapnel, Explosive Surprise, Firecracker Belt, Time Bomb, Slime Bomb (inferred from names/effects)
- **Instrument (Symphony):** Royal Horn, Serpent Lyre, Riverflow Violin, Arcane Bell, Liferoot Lute, Stormcloud Drum
- **Tome:** all Countdown items in Tomes table · **Rose (max 1):** Blackbriar/Iron/Sanguine/Toxic/Clearspring Rose · **Rune:** Blood/Echo/Iron Rune · **Egg (Next boss):** Deviled Egg→Sanguine Imp, Granite Egg→Stoneborn Turtle, Treebark Egg→Liferoot Beast, Wet Egg→(water hatchling); Squire's/Knight's gear upgrade after next boss.

Golden/Diamond scaling examples (tag pages): Horned Helmet arm 2/4/8; Slime Armor arm 5/10/20; Sour Lemon spd 3/6/12; Liferoot Gauntlet hp 3/6/12; Rusty Ring acid 1/2/4; Emerald Crown hp 8/16/32 & atk -1/-2/-4; Ruby Ring "Gain 2 attack and take 3 damage" → gold 4/6 → diamond 8/12; Granite Tome armor 6/12/24. Rule of thumb: every number ×2 at Gold, ×4 at Diamond.

---
## Weapons & Items — full tables (wiki, ~20 Jul 2025)
Stats notation: atk/arm/spd/hp = attack/armor/speed/health bonus. "-" = no effect text.

### Woodland items

#### Weapons

| Weapon | Rarity | Stats | Effect |
|---|---|---|---|
| Ironstone Greatsword | Common | atk: 4 / spd: -2 | - |
| Razorthorn Spear | Common | atk: 1 | On Hit: Gain 2 thorns |
| Redwood Rod | Common | atk: 2 / hp: 4 | - |
| Spearshield Lance | Common | atk: 1 / arm: 6 | - |
| Woodcutter's Axe | Common | atk: 1 | Gain 2 attack for each empty equipment slot |
| Boom Stick | Common | atk: 2 | On Hit: Deal 1 damage |
| Heart Drinker | Common | atk: 1 | On Hit: Restore 1 health |
| Sword of the Hero | Common | atk: 3 | - |
| Hidden Dagger | Common | atk: 2 | Gets stronger for every new hidden dagger you find |
| Brittlebark Bow | Common | atk: 4 | After 3 strikes: Lose 2 attack |
| Elderwood Staff | Common | atk: 1 / arm: 1 / spd: 1 | - |
| Featherweight Blade | Common | atk: 2 / spd: 2 | - |
| Blackbriar Blade | Rare | atk: 1 | This weapon gains 2 attack for each stack of thorn you have |
| Bejeweled Blade | Rare | atk: 1 | Gain 2 attack for each equipped jewelry item |
| Ironstone Bow | Rare | atk: 6 / spd: 1 | On Hit: Lose 1 speed. If your speed is 0 or less, only strike every other turn |
| Lifeblood Spear | Rare | atk: 1 | Whenever you restore 3 or more health, gain 1 attack |
| Explosive Sword | Rare | atk: 3 | Whenever a bomb deals 5 or more non-weapon damage, gain 1 additional strike |
| Icicle Spear | Rare | atk: 3 | Exposed: Give the enemy 1 freeze for each equipped water item |
| Bloodmoon Dagger | Rare | atk: 2 | Wounded: Gain 5 attack and take 2 damage |
| Bloodmoon Sickle | Rare | atk: 5 | On Hit: Take 1 damage |
| Frostbite Dagger | Rare | atk: 2 | First turn: Give the enemy freeze equal to your attack on hit |
| Swiftstrike Bow | Rare | atk: 2 | Whenever you gain an additional strike, gain twice as many |
| Swiftstrike Rapier | Rare | atk: 2 | Battle Start: If you have more speed than the enemy, gain 2 additional strikes |
| Battle Axe | Rare | atk: 2 | While the enemy has armor double your attack |
| Gemstone Scepter | Heroic | atk: 2 | Gains On Hit effects from emerald, ruby, sapphire, and citrine items |
| Granite Hammer | Heroic | atk: 2 | On Hit: Convert 1 armor to 2 attack |
| Granite Lance | Heroic | atk: 2 / arm: 2 | Your base armor is doubled |
| Stoneslab Sword | Heroic | atk: 2 | On Hit: Gain 2 armor |
| Frozen Iceblade | Heroic | atk: 7 | Battle start: Gain 3 freeze |
| Royal Scepter | Heroic |  | Attack is always equal to gold. You cannot have more than 10 gold |
| Grindstone Club | Heroic | atk: 1 | The next weapon you equip gains 2 attack |
| Twin Blade | Heroic | atk: 1 | Strike twice |
| Quickgrowth Spear | Heroic | atk: 2 | Every other turn, gain 1 attack and restore 1 health |
| Lifesteal Scythe | Heroic | atk: 1 | On Hit: If the enemy doesn't have any armor, restore health equal to your attack |
| Royal Crownblade | Heroic | atk: 4 | On Hit: Gain 1 gold |
| Brittlebark Club | Heroic | atk: 7 | Exposed & Wounded: Lose 2 attack |
| Bearclaw Blade | Mythic | hp: 5 | Attack is always equal to missing health |
| Mountain Cleaver | Mythic | arm: 2 | Attack always is equal to base armor |
| Tempest Blade | Mythic | spd: 2 | Attack always is equal to speed |

#### Items

| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Horned Helmet | Common | arm: 2 | Battle Start: Gain 1 thorns |
| Ironstone Bracelet | Common | spd: -1 | Enemy strikes deal 1 damage less while you have armor but 1 damage more otherwise |
| Iceblock Shield | Common | arm: 4 | Battle Start: Gain 2 freeze |
| Redwood Cloak | Common | hp: 2 | Battle Start: If your health is not full, restore 2 health |
| Redwood Helmet | Common | hp: 1 / arm: 1 | Exposed: Restore 3 health |
| Lifeblood Helmet | Common |  | First Turn: Restore health equal to damage dealt by strikes |
| Double-plated Armor | Common | arm: 2 / spd: -2 | Exposed: Gain 3 armor |
| Swiftstrike Belt | Common |  | Battle Start: Take 3 damage and gain 1 additional strike |
| Frostbite Gauntlet | Common |  | Battle Start: Give the enemy 1 freeze |
| Frostbite Trap | Common |  | Wounded: Give the enemy 3 freeze |
| Saffron Feather | Common | spd: 1 | Turn Start: Convert 1 speed to restore 2 health |
| Leather Glove | Common | hp: 3 / spd: 1 | - |
| Leather Vest | Common | arm: 2 / spd: 1 | - |
| Loose Change | Common |  | Gain 3 gold at the start of every day |
| Boots of the Hero | Common | spd: 2 | - |
| Shield of the Hero | Common | arm: 3 | - |
| Cracked Whetstone | Common |  | First Turn: Temporarily gain 2 attack |
| Lifeblood Burst | Rare |  | Whenever you restore 3 or more health, deal 3 damage |
| Blackbriar Gauntlet | Rare |  | Gain 2 thorns for each armor removed by the enemy's first strike |
| Blackbriar Rose | Rare |  | Whenever you restore health, gain 2 thorns. You can only equip 1 rose |
| Bramble Belt | Rare |  | Battle Start: Gain 1 thorns and give the enemy 1 additional strike |
| Bramble Buckler | Rare | arm: 2 | Turn Start: Convert 1 armor to 2 thorns |
| Bramble Talisman | Rare |  | Whenever you gain thorns, gain 1 armor |
| Bramble Vest | Rare | hp: 3 | The first time you lose thorns, restore health equal to thorns lost |
| Ice Spikes | Rare |  | Turn Start: If you have freeze, gain 5 thorns |
| Ice Tomb | Rare |  | Turn Start: If you have no armor, gain 3 armor and 1 freeze |
| Leather Boots | Rare |  | Battle Start: If you have more speed than the enemy, gain 2 attack |
| Cracked Bouldershield | Rare |  | Exposed: Gain 7 armor |
| Fortified Gauntlet | Rare |  | Turn Start: If you have armor, gain 1 additional armor |
| Frostbite Curse | Rare |  | Battle Start: Give yourself and the enemy 5 freeze each |
| Ore Heart | Rare |  | Battle Start: Gain 3 armor for each equipped stone item |
| Pinecone Breastplate | Rare |  | Battle Start: If your health is full, gain 1 thorn at turn start for the rest of battle |
| Thorn Ring | Rare |  | Battle Start: Take 5 damage and gain 10 thorns |
| Bomb Bag | Rare |  | Battle Start, Exposed & Wounded: Spend 3 speed to retrigger a random bomb |
| Blacksmith Bond | Rare |  | Exposed can trigger 1 additional time |
| Blastcap Armor | Rare | arm: 8 | Exposed: Take 5 damage |
| Energy Drain | Rare |  | Before any other item triggers, if you have less speed than the enemy, steal all speed from the enemy |
| Firecracker Belt | Rare |  | Exposed: Deal 1 damage 4 times |
| Granite Crown | Rare |  | Battle Start: Gain max health equal to your base armor |
| Iron Rose | Rare |  | Whenever you restore health, gain 1 armor. You can only equip 1 rose |
| Kindling Bomb | Rare |  | Battle Start: Deal 1 damage to the enemy. The damage of the next bomb that triggers is increased by 3 |
| Powder Keg | Rare |  | Battle Start: If you only have 1 bomb item equipped, it triggers 3 times |
| Double-plated Vest | Rare |  | The second time you take damage each turn, gain 2 armor |
| Explosive Powder | Rare |  | The damage of all bomb items increases by 1 |
| Explosive Surprise | Rare |  | Exposed: Deal 6 damage |
| Heart-shaped Acorn | Rare |  | Battle Start: If you have 0 base armor, restore health to full |
| Heart-shaped Potion | Rare |  | When you are reduced to exactly 1 health for the first time, restore health to full |
| Iron Shrapnel | Rare |  | Battle start: Deal 3 damage to the enemy, if they don't have armor, double the damage dealt |
| Oak Heart | Rare |  | Gain 3 max health for each equipped wood item |
| Blood Chain | Rare |  | The first time the enemy becomes wounded, trigger all of your wounded items |
| Ironstone Sandals | Rare | spd: -1 | While you have armor, temporarily gain 3 attack |
| Royal Helmet | Rare | arm: 1 | Exposed: If you have more than 20 gold, gain 10 armor |
| Sanguine Rose | Rare |  | Whenever you restore health, restore 1 additional health. You can only equip 1 rose |
| Featherweight Wings | Rare |  | Battle Start: If you have less speed than the enemy, gain attack equal to your speed |
| Vampire's Tooth | Rare |  | If you have exactly 1 sanguine item, double its healing |
| Brittlebark Buckler | Rare | arm: 10 | Lose all your armor after your enemy's first strike |
| Featherweight Armor | Rare |  | Whenever you gain speed, also gain an equal amount of armor |
| Featherweight Greaves | Rare |  | Turn Start: If you have 0 speed, gain 1 speed |
| Featherweight Helmet | Rare |  | Battle start: Spend 2 armor to gain 3 speed and 1 attack |
| Frostbite Armor | Rare | arm: 2 | The enemy's first strike deals double damage, afterwards they gain 4 freeze |
| Plated Greaves | Rare |  | Exposed: Convert 3 speed to 9 armor |
| Double Explosion | Rare |  | The second time you deal non-weapon damage each turn, deal 3 damage |
| Frostbite Greaves | Rare |  | Whenever you lose speed, give the enemy 1 freeze |
| Blackbriar Armor | Heroic | atk: -1 | Whenever you take damage, gain 2 thorns |
| Cactus Cap | Heroic |  | If the enemy has no armor, thorns deal double damage |
| Ironstone Armor | Heroic | spd: -2 | Enemy strikes deal 2 damage less while you have armor |
| Shield Talisman | Heroic |  | Whenever you gain armor, gain 1 additional armor |
| Moonlight Shield | Heroic |  | Turn Start: If you're below 50% health, gain 2 armor |
| Razor Breastplate | Heroic | arm: 3 | Wounded: Gain thorns equal to enemy attack |
| Brittlebark Armor | Heroic | hp: 12 | Whenever you take damage, take 1 additional damage |
| Druid's Cloak | Heroic |  | Whenever you lose health, gain that much armor. You cannot restore health |
| Studded Gauntlet | Heroic |  | On Hit: Deal 1 damage |
| Sword Talisman | Heroic |  | Whenever you deal non-weapon damage to the enemy, deal 1 additional damage |
| Time Bomb | Heroic |  | Exposed: Deal 1 damage. Turn start: This item gains 2 damage |
| Assault Greaves | Heroic |  | Whenever you take damage, deal 1 damage |
| Ironskin Potion | Heroic |  | Battle Start: Gain armor equal to lost health |
| Crimson Cloak | Heroic |  | Whenever you take damage, restore 1 health |
| Iron Transfusion | Heroic |  | Turn Start: Gain 2 armor and lose 1 health |
| Lifeblood Armor | Heroic |  | Battle Start: Convert 50% of your current health to that amount of armor |
| Royal Shield | Heroic |  | Turn Start: Convert 1 gold to 3 armor |
| Swiftstrike Cloak | Heroic | spd: 1 | Battle Start: If you have more speed than the enemy, gain 1 additional strike |
| Swiftstrike Gauntlet | Heroic |  | Wounded: Gain 2 additional strikes |
| Chainmail Armor | Heroic |  | Wounded: Regain your base armor |
| Elderwood Necklace | Heroic | atk: 1 / arm: 1 / spd: 1 | - |
| Bloodmoon Armor | Mythic | arm: 6 | Whenever you would take damage from your own items, the enemy takes that damage instead |
| Cold Resistance | Mythic |  | Freeze doubles your attack instead of halving it |
| Granite Thorns | Mythic |  | You don't lose any thorns on the enemy's first 3 strikes |
| Razor Scales | Mythic |  | Whenever you lose armor, deal that much damage |
| Chainlink Medallion | Mythic |  | Your On Hit effects trigger twice |
| Twinfuse Knot | Mythic |  | Your bomb items trigger twice |

#### Jewelry

| Item | Rarity | Effect |
|---|---|---|
| Citrine Earring | Common | Gain 1 speed every other turn |
| Emerald Earring | Common | Restore 1 health every other turn |
| Ruby Earring | Common | Deal 1 damage every other turn |
| Sapphire Earring | Common | Gain 1 armor every other turn |
| Emerald Crown | Common | Gain 8 health and lose 1 attack |
| Ruby Crown | Common | Gain 1 attack and lose 1 speed |
| Sapphire Crown | Common | Gain 5 armor and lose 2 health |
| Emerald Ring | Common | Battle Start: Restore 3 health |
| Ruby Ring | Common | Battle Start: Gain 2 attack and take 3 damage |
| Sapphire Ring | Common | Battle Start: Steal 2 armor from the enemy |
| Citrine Ring | Rare | Battle Start: Spend 5 speed to permanently gain 1 additional strike |
| Gold Ring | Rare | Battle Start: Gain 1 gold |
| Citrine Gemstone | Heroic | Your base speed stat is inverted |
| Emerald Gemstone | Heroic | Overhealing is dealt as damage |
| Ruby Gemstone | Heroic | If your attack is exactly 1, deal 4 damage on hit |
| Sapphire Gemstone | Heroic | Whenever you lose armor, restore that much health |

#### Food

| Item | Rarity | Effect | Cooked with honeycomb effect |
|---|---|---|---|
| Cherry Bomb | Common | Battle Start: Deal 1 damage 2 times | Turn Start: Deal 1 damage 3 times |
| Redwood Roast | Common | Gain 5 health | Double your max health |
| Spiny Chestnut | Common | Battle Start: Gain 3 thorns | Battle Start: Gain 3 thorns and thorns do double damage |
| Vampiric Wine | Common | Wounded: Restore 4 health | Wounded: Restore 30 health |
| Stone Steak | Rare | Battle Start: If your health is full, gain 5 armor | Battle Start: Gain 15 armor, if health is full gain another 15 armor |

### Swampland items

#### Weapons

| Weapon | Rarity | Stats | Effect |
|---|---|---|---|
| Liferoot Staff | Common | atk: 2 | Wounded: Gain 3 regeneration |
| Champion's Blade | Common | atk: 6 | - |
| Fungal Rapier | Common | atk: 3 | Battle Start: Gain 1 poison |
| Knight's Blade | Common | atk: 4 | Upgrades after you defeat the next boss |
| Silverscale Dagger | Common | atk: 2 | Battle Start: Give the enemy 1 riptide |
| Squire's Blade | Common | atk: 2 | Upgrades after you defeat the next boss |
| Forge Hammer | Common | atk: 4 | On Hit: Give the enemy 2 armor |
| Grilling Skewer | Common | atk: 1 | Battle Start: Gain 1 additional strike |
| Ironstone Spear | Common | atk: 2 | While you have armor, temporarily gain 2 attack |
| Marble Sword | Common | atk: 1 / arm: 2 | Exposed: Gain 3 attack |
| Stormcloud Spear | Common | atk: 2 | Every 5 strikes, stun the enemy for 2 turns |
| Gale Staff | Common | atk: 2 / spd: 6 | On Hit: Lose 1 speed |
| Pacifist Staff | Common |  | On Hit: Gain 1 armor and restore 1 health |
| Slime Sword | Common | atk: 2 | Battle Start: Give yourself and the enemy 3 acid |
| Basilisk Fang | Rare | atk: 3 | On Hit: Decrease your poison by 2 and give it to the enemy |
| Liferoot Hammer | Rare | atk: 3 | Regeneration that triggers overheal increases max health |
| Bubblegloop Staff | Rare |  | Can't strike. Turn Start: Spend 1 speed to give the enemy 1 acid and 2 poison |
| Lightning Whip | Rare | atk: 3 | Turn Start: If the enemy is stunned, gain 1 additional strike |
| Rusty Sword | Rare | atk: 2 | On hit: If the enemy has no armor, deal additional damage equal to enemy acid |
| Wave Breaker | Rare | atk: -2 | Can't strike. Battle Start: Give the enemy 2 riptide for each negative base attack you have |
| Arcane Wand | Rare |  | Can't attack. Turn Start: Deal 2 damage. Increase the damage by 1 for each tome equipped |
| Granite Axe | Rare | atk: 4 | On Hit: Lose 2 health and gain 4 armor |
| Lightning Rod | Rare | atk: 2 | Turn Start: If you're stunned, gain 1 attack |
| Sanguine Scepter | Rare | atk: 1 | Healing is doubled |
| Ring Blades | Rare | atk: 1 | Battle Start: Steal 1 attack from the enemy |
| Chainmail Sword | Heroic | atk: 2 / arm: 2 | Exposed: Gain armor equal to base armor |
| Serpent Dagger | Heroic | atk: 2 | Every 3 strikes, give the enemy 4 poison |
| Silverscale Trident | Heroic |  | On Hit: Give the enemy 1 riptide |
| Melting Iceblade | Heroic | atk: 7 | On Hit: Lose 1 attack |
| King's Blade | Heroic | atk: 2 | Exposed and Wounded items triggers at battle start instead |
| Moonlight Cleaver | Heroic | atk: 3 | While you are below 50% health, you cannot gain status effects |
| Leather Whip | Heroic | atk: 4 / hp: 5 | Battle Start: Gain 5 max health |
| Bloodlord's Axe | Heroic | atk: 4 | Battle Start: The enemy loses 5 health and you restore 5 health |
| Purelake Staff | Heroic | atk: 1 | Battle Start: Gain 2 purity. On Hit: Remove 1 purity |
| Riverflow Rapier | Heroic | atk: 3 | The first time you gain a new status effect, gain 1 additional strike as well |
| Thunderbound Sabre | Heroic | atk: 6 | Battle start: Stun yourself for 2 turns |
| Ancient Warhammer | Mythic | atk: 5 | On Hit: Remove all of the enemy's armor |
| Dashmaster's Dagger | Mythic | atk: 2 | Battle Start: Gain additional strikes equal to speed |
| Lakebed Sword | Mythic | atk: 5 | Gain double health and attack from purity |
| Cleaver of Wrath | Cursed | atk: 10 | Your max health is always 1 |
| Scepter of Greed | Cursed | atk: 6 | You cannot gain gold |
| Sword of Pride | Cursed | atk: 3 / arm: 3 / spd: 3 | Battle Start: If the enemy has more attack, armor or speed than you, take 3 damage |

#### Items

| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Liferoot Gauntlet | Common | hp: 3 | Battle start: Gain 1 regeneration |
| Champion's Armor | Common | arm: 6 | - |
| Deviled Egg | Common |  | Hatches after you defeat the next boss |
| Knight's Armor | Common | arm: 4 | Upgrades after you defeat the next boss |
| Serpent Lyre | Common |  | Exposed: Give the enemy 3 poison. Symphony |
| Silverscale Fish | Common |  | Exposed: Give the enemy 1 riptide |
| Squire's Armor | Common | arm: 2 | Upgrades after you defeat the next boss |
| Treebark Egg | Common |  | Hatches after you defeat the next boss |
| Venomous Fang | Common |  | First Turn: Give the enemy 2 poison on hit |
| Holy Shield | Common | atk: -1 / arm: 6 / spd: -1 | - |
| Weaver Shield | Common |  | Battle Start: If you have 0 base armor, gain 4 armor |
| Arcane Bell | Common |  | Battle Start: Decrease all countdowns by 1. Symphony |
| Granite Egg | Common |  | Hatches after you defeat the next boss |
| Leather Belt | Common | hp: 3 | If you have 0 base armor, double this items max health |
| Lightspeed Potion | Common | spd: 1 | Battle Start: Restore health equal to speed |
| Rusty Ring | Common |  | Battle Start: Give the enemy 1 acid |
| Clearspring Feather | Common |  | Battle Start: Decrease a random status effect by 1 and give it to the enemy |
| Clearspring Watermelon | Common |  | Battle Start, Exposed & Wounded: Decrease a random status effect by 1 |
| Petrifying Flask | Common |  | Wounded: Gain 10 armor and stun yourself for 2 turns |
| Slime Armor | Common | arm: 5 | Battle Start: Gain 1 acid |
| Muscle Potion | Common |  | Every 3 strikes: Gain 1 attack |
| Purelake Helmet | Common | arm: 2 | Battle Start: Gain 1 Purity |
| Royal Horn | Common |  | Wounded: Gain 2 gold. Symphony |
| Sour Lemon | Common | spd: 3 | Battle Start: Gain 1 acid |
| Wet Egg | Common |  | Hatches after you defeat the next boss |
| Marble Mirror | Rare | spd: -2 | Battle Start: Gain armor equal to your opponent’s armor |
| Spiritual Balance | Rare |  | Battle Start: If your speed is equal to your attack, gain 3 attack |
| Basilisk Scale | Rare |  | Battle Start: Gain 5 armor and 5 poison |
| Crimson Fang | Rare |  | Battle Start: If your health is full, lose 5 health and gain 2 additional strikes |
| Hero's Crossguard | Rare |  | First Turn: Your On Hit effects trigger twice |
| Muscle Growth | Rare |  | While you have regeneration, temporarily gain 3 attack |
| Silver Anchor | Rare | spd: -1 | Whenever you lose speed, give the enemy 1 riptide |
| Stillwater Pearl | Rare |  | Riptide can trigger twice per turn |
| Toxic Algae | Rare |  | The first time riptide triggers, give the enemy 5 poison |
| Toxic Rose | Rare |  | Whenever you restore health, give the enemy 1 poison. You can only equip 1 rose |
| Soap Stone | Rare |  | First turn: Spend 2 speed to temporarily gain 4 attack |
| Moonlight Crest | Rare |  | Turn Start: If you're below 50% health, gain 1 regeneration |
| Mushroom Buckler | Rare | arm: 3 | If you have poison, enemy strikes deal 1 less damage |
| Nerve Poison | Rare |  | The first time the enemy gains poison, stun them for 1 turn |
| Poisonous Mushroom | Rare | atk: 2 | Turn Start: Gain 1 poison |
| Silverscale Armor | Rare |  | Whenever riptide triggers, gain 2 armor |
| Silverscale Greaves | Rare |  | Battle Start: If you have more speed than the enemy, give them 2 riptide |
| Twisted Root | Rare |  | Exposed: Gain 1 regeneration for each equipped wood item |
| Clearspring Cloak | Rare |  | Exposed: Remove all your status effects and gain 1 armor equal to stacks removed |
| Arcane Gauntlet | Rare |  | All countdowns are halved |
| Arcane Lens | Rare |  | If you have exactly 1 tome equipped, it triggers thrice |
| Arcane Shield | Rare |  | Whenever a countdown effect triggers, gain 3 armor |
| Corroded Bone | Rare |  | Battle Start: Convert 50% of the enemy's health into armor |
| Chainmail Cloak | Rare |  | Turn Start: If you have armor, restore 2 health |
| Clearspring Opal | Rare | spd: 2 | Turn Start: If you have any status effects, spend 1 speed to decrease a random status effect by 1 |
| Clearspring Rose | Rare |  | Whenever you restore health, decrease a random status effect by 1. You can only equip 1 rose |
| Forge Gauntlet | Rare | atk: 1 | Battle Start: Give the enemy 5 armor |
| Granite Fungi | Rare |  | Turn End: Gain 2 armor and give the enemy 2 armor |
| Impressive Physique | Rare | spd: 2 | Exposed: Stun the enemy for 1 turn |
| Rusted Plate | Rare |  | Whenever the enemy loses armor to acid, gain that armor |
| Stormcloud Armor | Rare |  | Battle Start: If you have more speed than armor, stun the enemy for 2 turns |
| Stormcloud Curse | Rare |  | Battle Start: Stun the enemy and yourself for 2 turns |
| Leather Waterskin | Rare |  | Exposed: Gain 2 purity. Repeat this for each equipped water item |
| Plated Shield | Rare | spd: -1 | The first time you gain armor, double it |
| Riverflow Talisman | Rare |  | Whenever you gain a status effect, gain 1 additional stack |
| Riverflow Violin | Rare |  | Exposed: Gain 4 armor. Symphony |
| Spiral Shell | Rare |  | Turn Start: If you're stunned, give the enemy 1 riptide |
| Marshlight Lantern | Rare |  | Exposed: Lose 3 health and gain 8 armor |
| Purelake Armor | Rare |  | Exposed: Remove 1 purity to gain 5 armor |
| Purelake Potion | Rare |  | Battle start: Remove all your armor and gain 3 purity |
| Saltcrusted Crown | Rare | hp: 8 | Battle Start: Gain 1 riptide |
| Sinful Mirror | Rare |  | Wounded: Remove all your purity |
| Slime Bomb | Rare |  | When the enemy becomes exposed, remove all their acid and deal 2 damage for each acid removed |
| Slime Booster | Rare |  | Battle Start: Convert 1 acid into 2 attack |
| Slime Heart | Rare |  | Wounded: Remove all your acid and restore 2 health for each acid removed |
| Slime Potion | Rare |  | Wounded: Gain armor equal to lost health and gain 5 acid |
| Lightning Bottle | Rare | atk: 1 / spd: 2 | Battle Start: Stun yourself for 1 turn |
| Vampiric Stasis | Rare |  | Whenever you skip your strike, restore 3 health |
| Friendship Bracelet | Rare | atk: -1 | Battle Start: The enemy loses 1 attack |
| Thunder Cloud | Heroic | atk: -1 | Wounded: Stun the enemy for 3 turns |
| Life Zap | Heroic |  | Battle Start: Lose all your health except 1 and stun the enemy for 2 turns |
| Explosive Arrow | Heroic |  | Turn Start: If the enemy doesn't have any armor, deal 2 damage |
| Liferoot Beast | Heroic |  | Turn Start: If you don't have any regeneration, gain 3 regeneration |
| Liferoot Lute | Heroic |  | Wounded: Gain 3 regeneration. Symphony |
| Noxious Gas | Heroic | arm: 6 | Turn Start: Both you and the enemy gain 1 poison |
| Serpent Mask | Heroic |  | Battle Start: Give the enemy poison equal to your attack |
| Sanguine Imp | Heroic |  | Turn Start: Deal 1 damage and restore 1 health |
| Sanguine Morphosis | Heroic |  | Every 4th turn: Stun yourself for 1 turn and gain 3 regeneration |
| Silverscale Gauntlet | Heroic |  | Give the enemy 1 riptide every other turn |
| Mist Armor | Heroic | hp: 10 / spd: 2 | Enemy strikes ignore armor |
| Petrified Statue | Heroic | spd: -2 | Battle Start: Give the enemy 1 stun for each equipped stone item |
| Weaver Armor | Heroic | atk: -2 | Battle Start: If you have 0 base armor, gain armor equal to current health |
| Acidic Witherleaf | Heroic | spd: 1 | Battle Start: Give the enemy acid equal to your speed |
| Stoneborn Turtle | Heroic |  | Turn start: Restore 1 health. If your health is full, gain 2 armor instead |
| Stormcloud Drum | Heroic |  | Wounded: Stun the enemy for 1 turn. Symphony |
| Blood Rune | Heroic |  | Wounded: Re-trigger the last triggered wounded item |
| Echo Rune | Heroic |  | Wounded: Re-trigger a random battle start item |
| Iron Rune | Heroic |  | If you have exactly 1 item with exposed, it triggers thrice |
| Acid Mutation | Heroic |  | Battle Start: Gain 1 acid. While you have acid, temporarily gain attack equal to acid |
| Bloodstone Ring | Heroic |  | Battle Start: Gain 5 max health and restore 5 health |
| Clearspring Duck | Heroic |  | Turn Start: Gain 1 armor and decrease a random status effect by 1 |
| Purelake Chalice | Heroic |  | Gain 1 purity every other turn |
| Prime Form | Mythic |  | Double attack while your health is full |
| Arcane Cloak | Mythic |  | Reset countdowns after they trigger |
| Grand Crescendo | Mythic |  | Symphony triggers all your other instruments |
| Primordial Soup | Mythic |  | Acid removes health as well |
| Serpent Scalemail | Mythic | arm: 4 | Whenever you lose armor, give the enemy 2 poison |
| Stormtide Anchor | Mythic |  | Whenever riptide triggers, stun the enemy for 1 turn |
| Belt of Gluttony | Cursed | hp: 15 | Your health is hidden |
| Boots of Sloth | Cursed | spd: 6 | You lose more time per step |
| Chest of Lust | Cursed | arm: 8 | Monsters always hunt you |
| Helmet of Envy | Cursed | atk: 3 | Battle Start: Double the enemy's attack |

#### Tomes

| Item | Rarity | Effect |
|---|---|---|
| Granite Tome | Common | Countdown 4: Gain 6 armor |
| Holy Tome | Common | Countdown 4: Gain 3 attack |
| Liferoot Tome | Common | Countdown 4: Gain 3 regeneration |
| Silverscale Tome | Common | Countdown 3: Give the enemy 2 riptide |
| Stormcloud Tome | Common | Countdown 4: Stun the enemy for 1 turn |
| Sanguine Tome | Rare | Countdown 6: Restore health to full |
| Caustic Tome | Rare | Countdown 3: Give the enemy 3 acid. If they don't have any armor, give them 3 poison instead |
| Flameburst Tome | Rare | Countdown 4: Deal 4 damage and reset countdown |
| Purelake Tome | Rare | Countdown 3: If you have purity, remove 1 purity. Otherwise, gain 1 purity. Reset countdown |
| Cookbook | Rare | Replace this item with a random cauldron item after you defeat the next boss |
| Grand Tome | Heroic | Countdown 10: Retrigger all your other tomes |
| Tome of the Hero | Heroic | Countdown 8: Gain 4 attack, 4 armor and 4 speed |
| Sheet Music | Heroic | Countdown 6: Trigger Symphony 3 times |

#### Elixirs

| Item | Rarity | Effect |
|---|---|---|
| Lightspeed Elixir | Common | Battle Start: Gain max health equal to your speed and then restore health equal to your speed |
| Muscle Elixir | Common | Every 3 strikes: Gain 1 attack, 1 armor and 1 speed |
| Petrifying Elixir | Common | Wounded: Gain 10 armor and stun yourself and the enemy for 2 turns |
| Lightning Elixir | Rare | Battle Start: Stun yourself for 2 turns |
| Nerve Elixir | Rare | The first time the enemy gains poison, stun them for 3 turns |
| Purelake Elixir | Rare | Battle start: Lose 5 armor and gain 5 purity |
| Slime Elixir | Rare | Wounded: Gain armor equal to max health and gain 5 acid |
| Viper Elixir | Rare | The first time the enemy gains poison, give them 9 additional poison |

---
## Cauldron recipes (Food + Food, or Food + Honeycomb)
Base food (Woodland): Cherry Bomb, Redwood Roast, Spiny Chestnut, Vampiric Wine, Stone Steak. (Swampland): Clearspring Watermelon, Poisonous Mushroom, Silverscale Fish, Sour Lemon, Grilling Skewer (weapon-food). Honeycomb from Beehives. Patch #14 (Jun 2026) reworked cauldron items, so these are 2025 values.

| Ingredient A | Ingredient B | Result | Effect | Stats |
|---|---|---|---|---|
| Cherry Bomb | Clearspring Watermelon | Melon Bomb | Battle Start, Exposed & Wounded: Decrease a random status effect by 1. Whenever a status effect is decreased, deal 1 damage to the enemy | - |
| Cherry Bomb | Grilling Skewer | Cherry Blade | Battle Start & Exposed: Deal 4 damage | atk: 3 |
| Cherry Bomb | Honeycomb | Sugar Bomb | Turn Start: Deal 1 damage 3 times | - |
| Cherry Bomb | Poisonous Mushroom | Toxic Cherry | Turn Start: Gain 1 poison and deal 1 damage to the enemy | atk: 3 |
| Cherry Bomb | Redwood Roast | Explosive Roast | Battle Start: Deal 1 damage 3 times | hp: 5 |
| Cherry Bomb | Silverscale Fish | Explosive Fish | Battle Start: Give the enemy 1 riptide and deal 2 damage to them for each riptide they have | - |
| Cherry Bomb | Sour Lemon | Combustible Lemon | Turn Start: Spend 1 speed to deal 2 damage | spd: 3 |
| Cherry Bomb | Spiny Chestnut | Trail Mix | Battle Start: Deal 1 damage and gain 1 thorns. Repeat 2 times. | - |
| Cherry Bomb | Stone Steak | Granite Cherry | Battle Start: If your health is full, gain 2 armor and deal 2 damage. Repeat 3 times | - |
| Cherry Bomb | Vampiric Wine | Cherry Cocktail | Battle Start & Wounded: Deal 3 damage and restore 3 health | - |
| Clearspring Watermelon | Grilling Skewer | Melonvine Whip | On Hit: Decrease 1 random status effect | atk: 3 |
| Clearspring Watermelon | Honeycomb | Honeydew Melon | Battle Start: Give all your status effects to the enemy | - |
| Clearspring Watermelon | Poisonous Mushroom | Bitter Melon | Turn Start: Convert 1 stack of another status effect to 1 poison | atk: 3 |
| Clearspring Watermelon | Redwood Roast | Boiled Ham | Battle Start, Exposed & Wounded: Decrease all your status effects by 1 | hp: 5 |
| Clearspring Watermelon | Silverscale Fish | Underwater Watermelon | Battle Start, Exposed & Wounded: Decrease 1 random status effect and give the enemy 1 riptide | - |
| Clearspring Watermelon | Sour Lemon | Melon Lemonade | Battle Start, Exposed & Wounded: Remove all Acid | spd: 3 |
| Clearspring Watermelon | Spiny Chestnut | Horned Melon | Battle Start, Exposed & Wounded: Decrease 2 random status effects by 1 and gain that much thorns | - |
| Clearspring Watermelon | Stone Steak | Mineral Water | Battle Start & Exposed: If your health is full, decrease a random status effect by 2 and gain 5 armor | - |
| Clearspring Watermelon | Vampiric Wine | Melon Wine | Battle Start, Exposed & Wounded: Decrease a random status effect by 1 and restore 3 health | - |
| Grilling Skewer | Honeycomb | Bee Stinger | First Turn: Give the enemy 4 poison, 3 Acid, and 2 stun on hit | atk: 3 |
| Grilling Skewer | Poisonous Mushroom | Deathcap Bow | Battle Start: Gain 3 poison. Turn Start: If you have poison. Gain 1 additional strike | atk: 3 |
| Grilling Skewer | Redwood Roast | Ham Bat | Battle Start: Gain 2 additional strike | atk: 3 hp: 5 |
| Grilling Skewer | Silverscale Fish | Silverscale Swordfish | Battle Start: Gain 1 additional strike. First Turn: Give the enemy 1 riptide on hit | atk: 2 |
| Grilling Skewer | Sour Lemon | Lemontree Branch | On Hit: Spend 2 speed and gain 1 additional strike on your next turn | atk: 2 spd: 4 |
| Grilling Skewer | Spiny Chestnut | Blackbriar Bow | Can't Strike Turn Start: Gain thorns equal to your attack | atk: 4 |
| Grilling Skewer | Stone Steak | Rocksalt Sword | Turn Start: If your health is full, gain 1 additional strike | atk: 2 arm: 6 |
| Grilling Skewer | Vampiric Wine | Broken Winebottle | Wounded: On your next turn, Keep striking the enemy until they're wounded | atk: 2 |
| Honeycomb | Poisonous Mushroom | Honey-glazed Shroom | Turn Start: Give the enemy 2 poison | atk: 4 |
| Honeycomb | Redwood Roast | Honey Ham | Double your max health | - |
| Honeycomb | Silverscale Fish | Honey Caviar | Exposed: Give the enemy 10 riptide | - |
| Honeycomb | Sour Lemon | Lemon Syrup | Battle Start: Double your speed | spd: 3 |
| Honeycomb | Spiny Chestnut | Candied Nuts | Battle Start: Gain 3 thorns. Thorns deal double damage | - |
| Honeycomb | Stone Steak | Rock Candy | Battle start: Gain 15 armor. If your health is full, gain an additional 15 armor | - |
| Honeycomb | Vampiric Wine | Sweet Wine | Wounded: Restore 30 health | - |
| Poisonous Mushroom | Redwood Roast | Moldy Meat | - | atk: 5 hp: -5 |
| Poisonous Mushroom | Silverscale Fish | Poisonous Pufferfish | Battle Start: Gain 3 poison and give the enemy 2 riptide | atk: 3 |
| Poisonous Mushroom | Sour Lemon | Poisonous Lemon | Battle Start: Gain 1 acid and 5 poison | atk: 3 spd: 4 |
| Poisonous Mushroom | Spiny Chestnut | Poisonous Durian | Turn Start: Gain 1 poison and 1 thorns | atk: 3 |
| Poisonous Mushroom | Stone Steak | Marble Mushroom | Battle Start: Gain 3 poison | atk: 4 arm: 6 |
| Poisonous Mushroom | Vampiric Wine | Mushroom Soup | Turn Start: Gain 1 poison and 1 regeneration | atk: 2 |
| Redwood Roast | Silverscale Fish | Shark Roast | Exposed: Give the enemy 2 riptides | hp: 5 |
| Redwood Roast | Sour Lemon | Lemon Roast | Battle Start: Gain 2 acid | hp: 5 spd: 5 |
| Redwood Roast | Spiny Chestnut | Roasted Chestnut | Battle Start: Gain 4 thorns | hp: 5 |
| Redwood Roast | Stone Steak | Rock Roast | - | hp: 6 arm: 6 |
| Redwood Roast | Vampiric Wine | Blood Sausage | Wounded: Restore 1 health 5 times | hp: 5 |
| Silverscale Fish | Sour Lemon | Lemon Shark | Battle Start: Gain 1 Acid Exposed: Give the enemy riptide equal to your acid | spd: 3 |
| Silverscale Fish | Spiny Chestnut | Spiny Snapper | Battle Start: Give the enemy 1 riptide. Whenever riptide triggers, gain 3 thorns | - |
| Silverscale Fish | Stone Steak | Marbled Stonefish | Battle Start & Exposed: If your health is full, gain 5 armor and give the enemy 1 riptide | - |
| Silverscale Fish | Vampiric Wine | Deepsea Wine | Wounded: Give the enemy 1 riptide. Whenever riptide triggers, restore 3 health | - |
| Sour Lemon | Spiny Chestnut | Spiny Kiwifruit | Battle Start: Gain 3 acid and gain thorns equal to acid | spd: 3 |
| Sour Lemon | Stone Steak | Limestone Fruit | Battle Start: Gain 8 armor. If your health is not full, gain 2 acid | spd: 3 |
| Sour Lemon | Vampiric Wine | Blood Orange | Battle Start: Gain 3 acid. Wounded: Convert all your acid to regeneration. | spd: 4 |
| Spiny Chestnut | Stone Steak | Petrified Chestnut | Battle Start: If your health is full, gain 6 thorns and 6 armor | - |
| Spiny Chestnut | Vampiric Wine | Spiked Wine | Wounded: Restore 5 health and gain 5 thorns | - |
| Stone Steak | Vampiric Wine | Bloody Steak | Wounded: Restore 10 health and gain 5 armor | - |