# Changelog

## 2026.11.09-23
- Cinematic Interaction 0.18.30 (new, both sides) + Cinematic Delight 0.2.0 (new, client) + chop-cinematic-compat 1.0.0 (our patch: works with Easy Magic and Easy Anvils): crafting, furnace, enchanting, anvil and cooking stations play a short first-person scene. Camera shake, screen flashes and letterbox bars OFF; lean and zoom 50%; campfire sit ON; anvil + enchanting scenes ON; lectern scene OFF (lore lecterns keep their normal book screen). PARTIAL: loads clean with and without the compat partner mods, scenes open for table/furnace/enchanting/cooking, kettle donation works, TPS 20. NOT TESTED (hands-on with Josh): enchant with lapis, R reroll, anvil rename with colour codes and 40+ level jobs, campfire sit, shift-click in scenes, requests board, gingerbread house chest
- Better Days 45 min day / 15 min night / half the players to sleep (already in the pack since -22). PASS: measured 44.8 min day, 15.0 min night. NOT TESTED: 1-of-2 players sleeping, colonists waking
- Diorama 0.8.1-chop.2 -> 0.8.1-chop.3: the bed pin now stays when you travel far from your bed (chop.2 dropped it after ~3 s). PASS: far bed (320 blocks) keeps its pin and still has it when you return, sleeping bag does not move it, breaking a bed 2 blocks away clears the pin in 3 s, one Diorama jar loaded

## 2026.11.09-22
- Christmas Village style v3.12 -> v3.13: supply camp beds fixed (both tents one block taller, air above both beds). PASS: camp and ship beds can be slept in

## 2026.11.09-21c
- RoadWeaver roadside villages back on (small villages along roads; checked in a fresh world, no clashes with bridges or towns)

## 2026.11.09-21b
- Road crew in towns now shows as Christmas elves (Townwright roadCrewSkin = elf)
- RoadWeaver road planning settings now match TEST (KNN planning, bidirectional A*, stronger water avoidance; bridges up to 100 blocks, no bridge lamps)

## 2026.11.09-21
- Festivity 0.9.48 -> 0.9.57 (bigger Grand Fireplace with real flames, chimneys that link through floors + 30 toppers, new small Hearths, festive GUI that follows the Festivity bar, Farmer's Delight cooking pot makes 4 per batch). PASS; not tested: Chipped swaps, hitboxes, fireplace burn-out
- Main menu v3 (option A) + festive buttons v3.1 (23_Chops_Festive_Buttons_v3_1). PASS; not tested: button hover effects
- Townwright (Colony Autopilot) chop.48 -> chop.51 (main roads, road crew elves, town bridges, re-dress on level-up). PARTIAL: runs clean, bridges and re-dress seen in the log, bridge not seen in person
- Christmas Structures v42 -> v44 (lore lecterns, roof snow). PARTIAL: loads with no errors, lecterns/hidden chests not checked yet
- Road Bridges 0.12.0 -> 0.13.0; RoadWeaver bridges up to 100 blocks, no bridge lamps. PARTIAL: long ocean crossings skipped, no errors, bridge looks not checked yet
- Glowing small ornaments get wall brackets (chop_xmas_blocks.js v0.2.7). PASS
- Christmas music split into 21 (menu/event) + 21b (ambient). PASS (no missing sounds)
- Packed mud smelts into terracotta. PASS
- Donation kettle test cauldron switched off. PASS

## 2026.11.09-20
- Festivity 0.9.39 -> 0.9.48 (Grand Fireplace tops fixed, chimney/stockings fixes, all models load)
- Diorama 0.7.0-chop.1 -> 0.8.1-chop.2 (bed pin appears on a bed, clears when the bed is broken, sleeping bags do not move it; gpuBaking stays false)
- Townwright (Colony Autopilot) chop.47 -> chop.48
- Christmas Village style v3.8 -> v3.12 (supply ship and supply camp, door hinge/pane/gold-block fixes, full-block paving, melting-snow fix)
- Option A snowy bushy leaves v3 (cull-aware; same look, ~7% faster standing under shaders)
- tectonic flat_terrain_skew 0.1 -> 0.3 (matches TEST and the recorded decision)
- tectonic underground_rivers true -> false (Josh 11-10; only new chunks)

## 2026.11.09-4
- Performance: Diorama map quality FAST, MoreCulling leaves culling amount 1, LambDynamicLights fast mode

## 2026.11.09-3
- Iron's Spells now from Modrinth (same 3.16.3, no longer hosted); colony auto-building (expansion) on; old unused Festivity jars removed from the repo

## 2026.11.09-2
- Fix invisible beds/chests (Chloride fast chests+beds off), Festivity 0.9.8b + Iron's Spells set + winter filter v2, structures v34, botany v3, reindeer ETF, 3 quest chapters, biome replacer v2, Iron Furnaces, Music Delay Reducer, music RP rebuild, MoreCulling DEPTH, no hippos; removed PaperDoll, Spice of Life Onion, FastWorkbench

## 2026.11.09-1
- Friends' default shader settings: Complementary + Euphoria POTATO preset (only on first install; your own shader changes are kept)

## 2026.11.08-8
- Install fix: removed 4 empty config files that GitHub refuses to serve

## 2026.11.08-7
- Install fix: FerriteCore and Multi-Piston had a blank side and failed to download

## 2026.11.08-6
- friend-kit overrides: voice chat on, title-screen join buttons blank

## 2026.11.08-5
- Festivity 0.9.1b, Christmas Structures v30, Large Dungeons v4, Botany Pots crops v1, quests v0.1.1, Colony Autopilot fork chop.5, Christmas music at half volume
- Removed: VanillaBackport, AmbientSounds, TownTalk, Iron Jetpacks, Cucumber, Music Triggers, TIL

## 2026.11.08-4
- Install fix: all CurseForge mods now use direct download links (no manual downloads); MineColonies-family mods now install on clients

## 2026.11.08-3
- update

## 2026.11.08-2
- Festivity 0.4.1 and animation pack v4, large dungeons v2, road bridges 0.10.0, roadside structures 2 per road, EMF animation distance fix

## 2026.11.08-1
- update

