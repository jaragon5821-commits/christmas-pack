// chop_xmas_chest_loot.js v0.2.0 (Scripts thread, 2026-11-09) - server script, LootJS 3.7.0.
// v0.2.0 (Josh 11-09 live test): 5-7 filled slots per chest IN TOTAL. Main-pool rolls cut so main + the table's bonus pools
//   (rare 0-1, lore book 1) land at 5-7: big dungeon tables 4-5, small 4-6, starter_house / roadside_gifts 5-6, others 5-7.
//   NOTE: chests also stop splitting stacks across empty slots only once the Festivity LootTableNoSplitMixin ships.
// Josh 05:42 UTC Nov 8: Christmas structure chests were overloaded with cookies/candy. Big varied pool, ~5-8 filled slots.
// Rewrites POOL 0 (the main pool) of every chop:chests/* structure + roadside table. Pools 1+ are kept untouched
// (rare bonus pool + Assets' Santy Claws / Nether / End lore-book pools). chop:chests/folklore is NOT touched.
// Every candidate id is checked against the item registry first; unknown ids are skipped and counted in the log.
// Loads after chop_presents_loot.js (alphabetical), which still adds its 10% present / 20% treat roll to all chests.
(function () {
  if (typeof LootJS === 'undefined') { console.warn('[chop loot] LootJS missing - chest loot unchanged'); return; }
  const BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  let have = null;
  function ok(id) {
    if (!have) { have = {}; BuiltInRegistries.ITEM.keySet().forEach(k => { have[String(k)] = true; }); }
    return !!have[id];
  }
  function U(a, b) { return a == b ? a : [a, b]; }   // v0.1.1: LootJS 3.7.0 wants a plain number or [min, max]

  // [id, weight, min, max, flags]  flags: 'ench' = enchant randomly
  const P = {
    basics: [
      ['minecraft:torch', 8, 4, 12], ['minecraft:coal', 7, 3, 8], ['minecraft:iron_nugget', 5, 4, 10], ['minecraft:string', 5, 2, 6],
      ['minecraft:leather', 4, 1, 4], ['minecraft:paper', 4, 2, 6], ['minecraft:flint', 3, 2, 4], ['minecraft:bone', 3, 1, 4],
      ['minecraft:feather', 3, 2, 5], ['minecraft:arrow', 4, 4, 10], ['minecraft:bucket', 2, 1, 1], ['minecraft:lantern', 3, 1, 2],
      ['minecraft:campfire', 2, 1, 1], ['minecraft:spruce_log', 4, 4, 10], ['minecraft:white_wool', 3, 2, 5], ['minecraft:red_wool', 3, 2, 5],
      ['minecraft:snowball', 2, 4, 12], ['minecraft:clay_ball', 2, 3, 8], ['minecraft:glass_bottle', 2, 1, 3], ['minecraft:ink_sac', 2, 1, 3],
      ['supplementaries:rope', 3, 4, 12], ['supplementaries:flax', 2, 2, 5], ['supplementaries:soap', 1, 1, 2], ['supplementaries:candle_holder', 2, 1, 2],
      ['farmersdelight:rope', 3, 4, 10], ['farmersdelight:canvas', 2, 1, 3], ['farmersdelight:straw', 2, 3, 8], ['farmersdelight:tree_bark', 1, 2, 5]
    ],
    tools: [
      ['minecraft:iron_pickaxe', 3, 1, 1], ['minecraft:iron_axe', 3, 1, 1], ['minecraft:iron_shovel', 2, 1, 1], ['minecraft:iron_hoe', 1, 1, 1],
      ['minecraft:shears', 2, 1, 1], ['minecraft:fishing_rod', 2, 1, 1], ['minecraft:flint_and_steel', 2, 1, 1], ['minecraft:compass', 2, 1, 1],
      ['minecraft:clock', 1, 1, 1], ['minecraft:spyglass', 1, 1, 1], ['minecraft:lead', 2, 1, 2], ['minecraft:shield', 2, 1, 1],
      ['minecraft:bow', 2, 1, 1], ['minecraft:crossbow', 1, 1, 1], ['minecraft:brush', 1, 1, 1],
      ['farmersdelight:flint_knife', 2, 1, 1], ['farmersdelight:iron_knife', 2, 1, 1], ['farmersdelight:skillet', 1, 1, 1],
      ['supplementaries:slingshot', 1, 1, 1], ['supplementaries:wrench', 1, 1, 1], ['supplementaries:key', 1, 1, 1],
      ['comforts:sleeping_bag_red', 2, 1, 1], ['comforts:sleeping_bag_green', 1, 1, 1], ['comforts:sleeping_bag_white', 1, 1, 1], ['comforts:hammock_red', 1, 1, 1]
    ],
    gear: [
      ['minecraft:iron_sword', 3, 1, 1, 'ench'], ['minecraft:iron_pickaxe', 2, 1, 1, 'ench'], ['minecraft:diamond_sword', 1, 1, 1, 'ench'],
      ['minecraft:diamond_pickaxe', 1, 1, 1, 'ench'], ['minecraft:bow', 2, 1, 1, 'ench'], ['minecraft:crossbow', 2, 1, 1, 'ench'],
      ['minecraft:chainmail_chestplate', 2, 1, 1], ['minecraft:chainmail_helmet', 2, 1, 1], ['minecraft:chainmail_leggings', 2, 1, 1],
      ['minecraft:chainmail_boots', 2, 1, 1], ['minecraft:iron_chestplate', 1, 1, 1, 'ench'], ['minecraft:iron_boots', 1, 1, 1, 'ench'],
      ['minecraft:spectral_arrow', 2, 4, 10], ['minecraft:shield', 2, 1, 1], ['farmersdelight:diamond_knife', 1, 1, 1, 'ench'],
      ['supplementaries:bomb', 2, 1, 3], ['supplementaries:quiver', 1, 1, 1], ['supplementaries:rope_arrow', 1, 2, 4]
    ],
    valuables: [
      ['minecraft:iron_ingot', 8, 2, 6], ['minecraft:gold_ingot', 6, 1, 4], ['minecraft:copper_ingot', 5, 3, 8], ['minecraft:emerald', 6, 1, 4],
      ['minecraft:diamond', 3, 1, 2], ['minecraft:lapis_lazuli', 5, 3, 9], ['minecraft:redstone', 5, 4, 10], ['minecraft:amethyst_shard', 3, 2, 6],
      ['minecraft:quartz', 3, 2, 6], ['minecraft:experience_bottle', 4, 2, 6], ['minecraft:book', 4, 1, 1, 'ench'], ['minecraft:golden_apple', 3, 1, 1],
      ['minecraft:golden_carrot', 3, 2, 5], ['minecraft:name_tag', 2, 1, 1], ['minecraft:saddle', 2, 1, 1], ['minecraft:ender_pearl', 3, 1, 3],
      ['mca:rose_gold_ingot', 2, 1, 3], ['minecolonies:ancienttome', 1, 1, 1]
    ],
    rare: [
      ['minecraft:diamond', 4, 2, 4], ['minecraft:netherite_scrap', 1, 1, 1], ['minecraft:enchanted_golden_apple', 1, 1, 1],
      ['minecraft:totem_of_undying', 1, 1, 1], ['minecraft:music_disc_cat', 1, 1, 1], ['minecraft:music_disc_far', 1, 1, 1],
      ['minecraft:diamond_horse_armor', 1, 1, 1], ['minecraft:trident', 1, 1, 1, 'ench'], ['minecraft:heart_of_the_sea', 1, 1, 1],
      ['sophisticatedbackpacks:backpack', 2, 1, 1], ['sophisticatedbackpacks:iron_backpack', 1, 1, 1], ['sophisticatedbackpacks:magnet_upgrade', 1, 1, 1],
      ['naturescompass:naturescompass', 1, 1, 1], ['explorerscompass:explorerscompass', 1, 1, 1], ['mca:engagement_ring', 1, 1, 1],
      ['minecolonies:supplycampdeployer', 1, 1, 1], ['minecolonies:supplychestdeployer', 1, 1, 1], ['supplementaries:globe', 1, 1, 1],
      ['supplementaries:hourglass', 1, 1, 1]
    ],
    food: [
      ['minecraft:bread', 6, 2, 5], ['minecraft:baked_potato', 4, 2, 5], ['minecraft:apple', 5, 2, 5], ['minecraft:cooked_beef', 3, 1, 4],
      ['minecraft:cooked_porkchop', 3, 1, 4], ['minecraft:cooked_chicken', 3, 1, 4], ['minecraft:cooked_salmon', 2, 1, 3], ['minecraft:carrot', 4, 2, 6],
      ['minecraft:potato', 4, 2, 6], ['minecraft:beetroot', 2, 2, 5], ['minecraft:wheat', 3, 3, 8], ['minecraft:honey_bottle', 2, 1, 2],
      ['minecraft:sweet_berries', 3, 3, 8], ['minecraft:glow_berries', 2, 2, 5], ['minecraft:dried_kelp', 2, 3, 8], ['minecraft:mushroom_stew', 1, 1, 1],
      ['minecraft:milk_bucket', 1, 1, 1], ['minecraft:egg', 2, 2, 5], ['minecraft:sugar', 2, 2, 5], ['minecraft:cocoa_beans', 2, 2, 5],
      ['farmersdelight:tomato', 3, 2, 5], ['farmersdelight:cabbage', 3, 1, 3], ['farmersdelight:onion', 3, 2, 5], ['farmersdelight:rice', 3, 2, 6],
      ['farmersdelight:wheat_dough', 2, 2, 4], ['farmersdelight:raw_pasta', 2, 1, 3], ['farmersdelight:ham', 1, 1, 1], ['farmersdelight:milk_bottle', 2, 1, 3],
      ['farmersdelight:beef_stew', 2, 1, 1], ['farmersdelight:chicken_soup', 2, 1, 1], ['farmersdelight:vegetable_soup', 2, 1, 1],
      ['farmersdelight:pumpkin_soup', 1, 1, 1], ['farmersdelight:fried_rice', 1, 1, 1], ['farmersdelight:fruit_salad', 1, 1, 1],
      ['farmersdelight:apple_cider', 1, 1, 2], ['farmersdelight:hot_cocoa', 1, 1, 2], ['farmersdelight:stuffed_potato', 1, 1, 2],
      ['supplementaries:pancake', 1, 1, 3], ['snowyspirit:ginger', 2, 1, 3], ['snowyspirit:eggnog', 1, 1, 1],
      // sweets kept deliberately small
      ['minecraft:cookie', 1, 1, 3], ['minecraft:pumpkin_pie', 1, 1, 1], ['snowyspirit:gingerbread_cookie', 1, 1, 3], ['snowyspirit:candy_cane', 1, 1, 2]
    ],
    seeds: [
      ['minecraft:wheat_seeds', 4, 3, 8], ['minecraft:beetroot_seeds', 3, 3, 8], ['minecraft:pumpkin_seeds', 2, 2, 4], ['minecraft:melon_seeds', 2, 2, 4],
      ['minecraft:spruce_sapling', 3, 1, 3], ['minecraft:oak_sapling', 2, 1, 3], ['minecraft:birch_sapling', 2, 1, 3], ['minecraft:bone_meal', 3, 3, 8],
      ['farmersdelight:tomato_seeds', 2, 2, 5], ['farmersdelight:cabbage_seeds', 2, 2, 5], ['supplementaries:flax_seeds', 1, 2, 4],
      ['farmersdelight:rich_soil', 1, 2, 4], ['farmersdelight:organic_compost', 1, 1, 3]
    ],
    festive: [
      ['minecraft:red_candle', 3, 1, 3], ['minecraft:green_candle', 3, 1, 3], ['minecraft:white_candle', 2, 1, 3], ['minecraft:firework_rocket', 3, 2, 6],
      ['minecraft:red_dye', 2, 2, 5], ['minecraft:green_dye', 2, 2, 5], ['minecraft:glowstone_dust', 2, 2, 5], ['minecraft:bell', 1, 1, 1],
      ['chop:ornament', 3, 1, 3], ['chop:red_ornament', 3, 1, 3], ['chop:gold_ornament', 3, 1, 3], ['chop:green_ornament', 2, 1, 3],
      ['chop:red_snowflake_ornament', 1, 1, 2], ['chop:gold_glitter_ornament', 1, 1, 2], ['chop:red_large_ornament', 1, 1, 1],
      ['chop:red_gift_bow', 2, 1, 3], ['chop:white_gift_bow', 2, 1, 3], ['chop:red_ribbon_block', 1, 1, 2],
      ['chop:red_stripes_wrapping_paper', 2, 2, 6], ['chop:green_plaid_wrapping_paper', 2, 2, 6], ['chop:white_snowflakes_wrapping_paper', 1, 2, 6],
      ['fairylights:fairy_light', 2, 1, 3], ['fairylights:paper_lantern', 1, 1, 3], ['fairylights:hanging_lights', 2, 1, 1], ['fairylights:garland', 2, 1, 1],
      ['fairylights:tinsel', 2, 1, 1], ['fairylights:pennant_bunting', 1, 1, 1], ['snowyspirit:wreath', 1, 1, 1],
      ['supplementaries:confetti_popper', 2, 1, 3], ['supplementaries:flute', 1, 1, 1], ['supplementaries:bubble_blower', 1, 1, 1]
    ],
    mail: [
      ['minecraft:paper', 8, 3, 10], ['minecraft:book', 4, 1, 3], ['minecraft:writable_book', 3, 1, 1], ['minecraft:map', 3, 1, 1],
      ['minecraft:feather', 3, 1, 4], ['minecraft:ink_sac', 3, 1, 3], ['minecraft:name_tag', 1, 1, 1], ['minecraft:emerald', 2, 1, 2],
      ['supplementaries:antique_ink', 1, 1, 1], ['minecraft:string', 3, 2, 5]
    ],
    wood: [
      ['minecraft:spruce_log', 8, 6, 16], ['minecraft:oak_log', 5, 4, 12], ['minecraft:birch_log', 4, 4, 12], ['minecraft:dark_oak_log', 3, 4, 10],
      ['minecraft:stick', 5, 4, 12], ['minecraft:spruce_sapling', 4, 2, 4], ['minecraft:stone_axe', 2, 1, 1], ['minecraft:iron_axe', 1, 1, 1, 'ench'],
      ['minecraft:charcoal', 3, 3, 8], ['farmersdelight:tree_bark', 2, 2, 6]
    ],
    fishing: [
      ['minecraft:cod', 6, 2, 6], ['minecraft:salmon', 5, 2, 5], ['minecraft:tropical_fish', 2, 1, 2], ['minecraft:pufferfish', 1, 1, 1],
      ['minecraft:fishing_rod', 3, 1, 1, 'ench'], ['minecraft:string', 3, 2, 6], ['minecraft:kelp', 3, 3, 8], ['minecraft:nautilus_shell', 1, 1, 1],
      ['minecraft:ink_sac', 2, 1, 3], ['minecraft:lily_pad', 2, 1, 3]
    ],
    nether: [
      ['minecraft:blaze_rod', 4, 1, 3], ['minecraft:magma_cream', 3, 1, 3], ['minecraft:quartz', 5, 3, 9], ['minecraft:gold_nugget', 5, 4, 12],
      ['minecraft:ghast_tear', 2, 1, 1], ['minecraft:nether_wart', 4, 2, 6], ['minecraft:glowstone_dust', 4, 3, 8], ['minecraft:crying_obsidian', 2, 1, 3],
      ['minecraft:gilded_blackstone', 2, 1, 2], ['minecraft:soul_lantern', 2, 1, 2], ['minecraft:fire_charge', 3, 1, 4], ['minecraft:golden_carrot', 3, 2, 4],
      ['minecraft:netherite_scrap', 1, 1, 1], ['minecraft:ancient_debris', 1, 1, 1], ['minecraft:obsidian', 3, 2, 5]
    ],
    end: [
      ['minecraft:ender_pearl', 6, 1, 4], ['minecraft:ender_eye', 3, 1, 2], ['minecraft:end_rod', 4, 2, 6], ['minecraft:chorus_fruit', 4, 3, 8],
      ['minecraft:popped_chorus_fruit', 3, 2, 6], ['minecraft:purpur_block', 3, 4, 10], ['minecraft:shulker_shell', 1, 1, 2], ['minecraft:dragon_breath', 2, 1, 3],
      ['minecraft:phantom_membrane', 3, 1, 3], ['minecraft:obsidian', 3, 2, 5]
    ]
  };
  // table -> [[pool, weightMultiplier], ...], rolls [min,max]
  const T = {
    'chop:chests/xmas_dungeon':       { rolls: [4, 5], mix: [['valuables', 3], ['gear', 3], ['rare', 2], ['food', 1], ['basics', 1], ['festive', 1]] },
    'chop:chests/xmas_dungeon_small': { rolls: [4, 6], mix: [['valuables', 2], ['gear', 2], ['rare', 1], ['food', 1], ['basics', 2], ['festive', 1]] },
    'chop:chests/xmas_nether':        { rolls: [4, 5], mix: [['nether', 4], ['valuables', 2], ['gear', 2], ['rare', 1]] },
    'chop:chests/xmas_nether_small':  { rolls: [4, 6], mix: [['nether', 4], ['valuables', 1], ['gear', 1], ['basics', 1]] },
    'chop:chests/xmas_end':           { rolls: [4, 5], mix: [['end', 4], ['valuables', 2], ['gear', 2], ['rare', 2]] },
    'chop:chests/xmas_end_small':     { rolls: [4, 6], mix: [['end', 4], ['valuables', 1], ['gear', 1], ['basics', 1]] },
    'chop:chests/starter_house':      { rolls: [5, 6], mix: [['basics', 3], ['tools', 3], ['food', 2], ['seeds', 2], ['festive', 1], ['valuables', 1]] },
    'chop:chests/starter_pantry':     { rolls: [5, 7], mix: [['food', 5], ['seeds', 2], ['basics', 1]] },
    'chop:chests/roadside_gifts':     { rolls: [5, 6], mix: [['festive', 4], ['food', 1], ['basics', 1], ['valuables', 1]] },
    'chop:chests/roadside_market':    { rolls: [5, 7], mix: [['food', 3], ['seeds', 2], ['valuables', 2], ['tools', 1], ['festive', 1]] },
    'chop:chests/roadside_mail':      { rolls: [5, 7], mix: [['mail', 5], ['festive', 2], ['valuables', 1]] },
    'chop:chests/roadside_woodcutter':{ rolls: [5, 7], mix: [['wood', 5], ['tools', 1], ['basics', 1]] },
    'chop:chests/roadside_fishing':   { rolls: [5, 7], mix: [['fishing', 5], ['food', 1], ['basics', 1]] }
  };

  LootJS.lootTables(event => {
    let kept = {}, skipped = {}, done = 0;
    Object.keys(T).forEach(tid => {
      if (!event.hasLootTable(tid)) { console.warn('[chop loot] missing table ' + tid); return; }
      try {
      let cfg = T[tid], entries = [];
      cfg.mix.forEach(m => P[m[0]].forEach(r => {
        let w = r[1] * m[1];
        if (w <= 0) return;
        if (!ok(r[0])) { skipped[r[0]] = true; return; }
        kept[r[0]] = true;
        let e = LootEntry.of(r[0]).setCount(U(r[2], r[3])).withWeight(w);
        if (r[4] == 'ench') e.enchantRandomly();
        entries.push(e);
      }));
      event.getLootTable(tid).modifyPool(0, pool => {
        pool.rolls(U(cfg.rolls[0], cfg.rolls[1]));
        pool.removeEntry(e => true, true);
        entries.forEach(e => pool.addEntry(e));
      });
      done++;
      } catch (err) { console.warn('[chop loot] ' + tid + ' failed: ' + err); }
    });
    let sk = Object.keys(skipped);
    console.info('[chop loot] rewrote ' + done + ' chest tables, ' + Object.keys(kept).length + ' item ids in use, ' + sk.length + ' skipped');
    if (sk.length) console.info('[chop loot] skipped (not in registry): ' + sk.join(', '));
  });
})();
