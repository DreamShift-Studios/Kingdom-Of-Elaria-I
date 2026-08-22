# Elaria: Rise Against Velymoor — Remastered Edition

A complete, dependency-free 2D action RPG built with HTML5 Canvas, CSS, and vanilla JavaScript.

## Play

Open `index.html` directly in a modern desktop browser. The game supports `file://` launching and does not require a server, package install, build step, framework, or external asset download.

Existing saves continue to use the original `elaria-rise-save-v1` local-storage key. Remaster fields are additive and older save shapes are migrated defensively.

## Default controls

- Move: `WASD` or arrow keys
- Attack / charge: `Space` or left mouse button
- Dodge / perfect dodge: `Shift`
- Interact: `E`
- Potion: `Q`
- Inventory: `I`
- Quest log: `L`
- Character: `C`
- Skill tree: `K`
- Crafting: `R`
- World map / fast travel: `M`
- Codex: `B`
- Pause: `Escape`

Every keyboard action can be rebound from Settings.

## Remaster highlights

- Five distinct realms, an expanded waterfall-cavern annex, puzzles, hidden rooms, a secret boss contract, and four multi-phase story bosses
- Three-hit sword combos, charged and dash attacks, attack canceling, critical feedback, perfect dodges, i-frames, damage numbers, and pooled combat effects
- XP, 50 levels, three skill branches, crafting and cooking, renewable mining and fishing, upgrades, enchantments, achievements, bestiary, lore, completion tracking, maps, and waystone travel
- Eighteen quests including rescue, escort, timed, village-request, treasure, exploration, boss, and hidden-contract objectives, plus two final ending choices
- Dynamic rain, snow, fog, wind, day/night lighting, procedural regional/combat/boss music, ambient sound layers, and living NPC routines
- Fullscreen, complete control rebinding, UI scaling, color-vision modes, high contrast, reduced flashes, particle density, volume, screen-shake, and difficulty settings

## Regression test

`tests/integration-smoke.js` is a dependency-free VM test that loads scripts in browser order and exercises the complete start-to-ending flow, progression, economy, quests, all worlds and bosses, rendering, save migration, corruption handling, game over, and checkpoint retry.


## Nightmare Update
- Fixed potion usage in the Broken Realm and boss fights.
- Hard Mode rebalanced as an extreme challenge.
- Nightmare Mode unlocks after completing Hard.
- Added difficulty-exclusive side quests.
- Added the Mythic sword Eclipsebreaker.
- Nightmare includes elite enemies, reduced healing, darker visuals, and a stronger demonic Velymoor.

## Eclipse Trials Update
- Nightmare Mode now begins the Mythic Eclipsebreaker path in World 0.
- Complete the Trial of Might, Trial of Endurance, and Trial of Spirit in Elaria.
- The three completed runes open an Ancient Eclipse Seal beside Velymoor's fortress in the Final World.
- Enter the Secret Eclipse Chamber and defeat the Eclipse Warden.
- Defeating the Warden grants the Mythic **Eclipsebreaker** sword.

## Visual Challenge Update v1.3.0
- Removed the blue healing/save crystals from every realm. World transitions still become retry checkpoints, but they do not heal you.
- Shop prices now display only the numeric cost in a much larger button.
- Dialogue and shop typography are substantially larger and easier to read.
- Improved terrain texture, path depth, foliage density, building highlights, and crystal glow.
- Velymoor now renders at 5× visual scale with a matching enlarged shadow.
- Velymoor damage scaling: Phase I 1×, Phases II–III 2×, Phase IV 5×.
- Easy, Normal, Hard, and Nightmare were all rebalanced upward so combat remains a real challenge.
