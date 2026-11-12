// priority: 95
// Festivity tags. Mod ids confirmed from the TEST jars on 2026-11-02 (build thread): festive_delight, seasonsgreetings,
// mcwholidays, christmassgrandmascabinet, merrymaking, snowyspirit, fairylights, winterly, supplementaries, snuffles,
// alpinewhispers, mca, christmas_hearthlight, brewinandchewin. Waddles is not installed.
ServerEvents.tags('item', event => {
  // festive food: Festive Delight, Farmer's Delight cookies, Season's Greetings cocoa, Grandma's Cabinet, Merrymaking
  event.add('chop:festive_food', /^festive_delight:.*/);
  event.add('chop:festive_food', /^seasonsgreetings:.*(cocoa|cookie|gingerbread|eggnog|candy).*/);
  event.add('chop:festive_food', /^christmassgrandmascabinet:.*/);
  event.add('chop:festive_food', chopMigList(['christmas_hearthlight:gingerbread_man']).concat(['brewinandchewin:cocoa_fudge', 'brewinandchewin:dread_nog', 'brewinandchewin:egg_grog']));   // 11-12 migration
  event.add('chop:festive_food', /^merrymaking:.*(cookie|cocoa|cake|punch|eggnog).*/);
  event.add('chop:festive_food', ['minecraft:cookie', 'minecraft:cake', 'minecraft:pumpkin_pie']);
  // 11-12 Festivity migration: the Festivity replacements of every old id the regexes above matched (only those that exist)
  chopMigNewList(['merrymaking:cookie_tray','merrymaking:fruitcake','seasonsgreetings:gingerbread_bricks','seasonsgreetings:gingerbread_door','seasonsgreetings:gingerbread_shingle_stairs','christmassgrandmascabinet:blue_candy_cane','christmassgrandmascabinet:eggnog','christmassgrandmascabinet:green_candy_cane','christmassgrandmascabinet:hot_chocolate','christmassgrandmascabinet:red_candy_cane','festive_delight:candy_cane','festive_delight:christmas_tea','festive_delight:cinnamon_bush','festive_delight:cinnamon_powder','festive_delight:cinnamon_sticks','festive_delight:festive_chicken_block','festive_delight:ginger_bread_base','festive_delight:gingerbread_bricks','festive_delight:gingerbread_cookie','festive_delight:gingerbread_cookie_flake','festive_delight:gingerbread_cookie_sword','festive_delight:gingerbread_door','festive_delight:gingerbread_dough','festive_delight:gingerbread_man','festive_delight:gingerbread_man_creeper','festive_delight:gingerbread_man_dough','festive_delight:gingerbread_pillar','festive_delight:hot_cocoa','festive_delight:longevity_noodle','festive_delight:rolling_pin','festive_delight:salmon_verrines','festive_delight:spring_rolls','festive_delight:sugar_icing_block','merrymaking:cookie_dough','merrymaking:gingerbread_cookie','merrymaking:hot_cocoa','merrymaking:mitten_christmas_cookie','merrymaking:peppermint_cocoa','merrymaking:stocking_christmas_cookie','merrymaking:tree_christmas_cookie','seasonsgreetings:candy_cane','seasonsgreetings:eggnog','seasonsgreetings:gingerbread_cookie','seasonsgreetings:gingerbread_man','seasonsgreetings:hot_cocoa']).forEach(id => event.add('chop:festive_food', id));
  event.add('chop:festive_food', '#c:foods/gingerbread_cookie');
  event.add('chop:festive_food', '#c:drinks/hot_cocoa');
  event.add('chop:festive_food', '#c:drinks/eggnog');

  // presents (give-a-present action): Season's Greetings / Supplementaries / Snowy Spirit present blocks as items
  event.add('chop:presents', /^seasonsgreetings:.*present.*/);
  chopMigList(['christmas_hearthlight:christmas_gift_box']).forEach(id => event.add('chop:presents', id));   // 11-12 migration
  chopMigNewList(['seasonsgreetings:present_red','snowyspirit:present_red']).forEach(id => event.add('chop:presents', id));
  // (old bug: /^seasonsgreetings:.*present.*/ never matched anything; Season's Greetings ids are *_gift_box, listed in chop_presents_loot.js)
  event.add('chop:presents', /^supplementaries:.*present.*/);
  event.add('chop:presents', /^snowyspirit:.*present.*/);

  // gifts that MCA villagers like (gift_villager action)
  event.add('chop:gift', '#chop:festive_food');
  event.add('chop:gift', '#chop:presents');
  event.add('chop:gift', '#minecraft:flowers');
  // letters to Santa (Christmas Hearthlight), used by phase 2 mailbox detection
  event.add('chop:santa_letters', chopMigList(['christmas_hearthlight:santa_letter', 'christmas_hearthlight:sealed_letter', 'christmas_hearthlight:santa_envelope']));   // 11-12 migration

  // things a kidnapped player must not use (phase 2)
  event.add('chop:teleport_items', ['minecraft:ender_pearl', 'minecraft:chorus_fruit']);
  event.add('chop:teleport_items', /^waystones:.*/);
});

ServerEvents.tags('block', event => {
  // Christmas decor (place_decor / break_decor)
  event.add('chop:decor', /^mcwholidays:.*/);          // Macaw's Holidays
  event.add('chop:decor', /^fairylights:.*/);
  event.add('chop:decor', /^winterly:.*/);
  event.add('chop:decor', /^snowyspirit:.*(wreath|garland|light|glow|present|gingerbread).*/);
  event.add('chop:decor', /^seasonsgreetings:.*/);
  if (Platform.isLoaded('christmas_hearthlight')) event.add('chop:decor', '#christmas_hearthlight:decorations');   // 11-12: off once the mod is removed
  if (Platform.isLoaded('christmas_hearthlight')) event.add('chop:decor', '#christmas_hearthlight:christmas_stockings');   // 11-12: off once the mod is removed
  if (Platform.isLoaded('christmas_hearthlight')) event.add('chop:decor', '#christmas_hearthlight:gingerbread_blocks');   // 11-12: off once the mod is removed
  event.add('chop:decor', chopMigList(['christmas_hearthlight:christmas_wreath', 'christmas_hearthlight:pine_garland', 'christmas_hearthlight:string_lights', 'christmas_hearthlight:tall_christmas_tree', 'christmas_hearthlight:giant_candy_cane', 'christmas_hearthlight:wall_giant_candy_cane', 'christmas_hearthlight:christmas_mailbox']).filter(id => chopMigBlockHas(id)));   // 11-12 migration
  chopMigNewList(['mcwholidays:present_doormat','winterly:icicle','mcwholidays:wreath_wall_deco_2','mcwholidays:stocking_wall_deco_1','mcwholidays:garland_colorful_lights','mcwholidays:wreath_wall_deco_1','mcwholidays:colorful_decorated_christmas_tree_base','mcwholidays:colorful_decorated_christmas_tree_bottom','mcwholidays:colorful_decorated_christmas_tree_middle','mcwholidays:colorful_decorated_christmas_tree_top','mcwholidays:pile_of_spruce_wood','mcwholidays:green_present','mcwholidays:red_present','mcwholidays:garland','mcwholidays:blue_present','mcwholidays:wooden_sled','mcwholidays:snowman_with_top_hat','mcwholidays:purple_present','mcwholidays:cyan_present','mcwholidays:yellow_present','seasonsgreetings:peppermint_block','mcwholidays:red_candy_cane_block','seasonsgreetings:gingerbread_bricks','seasonsgreetings:gingerbread_door','seasonsgreetings:gingerbread_shingle_stairs','mcwholidays:big_green_present','mcwholidays:big_red_present','seasonsgreetings:red_gumdrop_block','mcwholidays:big_cyan_present','mcwholidays:pile_of_birch_wood','mcwholidays:couple_red_presents','mcwholidays:red_candy_cane_slim','seasonsgreetings:peppermint_stairs','mcwholidays:couple_bells','mcwholidays:couple_cyan_presents','mcwholidays:big_blue_present','mcwholidays:couple_blue_presents','seasonsgreetings:green_gumdrop_block','seasonsgreetings:orange_gumdrop_block','seasonsgreetings:purple_gumdrop_block','seasonsgreetings:yellow_gumdrop_block','mcwholidays:big_magenta_present','mcwholidays:snowman_with_santa_hat','mcwholidays:standing_shovel','mcwholidays:couple_yellow_presents','mcwholidays:green_candy_cane_slim','mcwholidays:snowman_with_ushanka','mcwholidays:couple_green_presents','mcwholidays:big_purple_present','mcwholidays:couple_magenta_presents','mcwholidays:couple_purple_presents','mcwholidays:green_candy_cane_block','mcwholidays:hay_wheelbarrow','mcwholidays:red_decorated_christmas_tree_base','mcwholidays:red_decorated_christmas_tree_bottom','mcwholidays:red_decorated_christmas_tree_middle','mcwholidays:red_decorated_christmas_tree_top','mcwholidays:snowman_ear_muffs','mcwholidays:big_yellow_present','mcwholidays:pile_of_oak_wood','mcwholidays:red_candy_cane_stairs','mcwholidays:snowman_grinch','mcwholidays:snowman_with_pan','seasonsgreetings:snow_brick_slab','snowyspirit:gingerbread_frosted','winterly:snow_bricks','fairylights:fairy_light','fairylights:garland','fairylights:hanging_lights','fairylights:paper_lantern','fairylights:pennant_bunting','fairylights:tinsel','seasonsgreetings:candy_cane','seasonsgreetings:eggnog','seasonsgreetings:gingerbread_cookie','seasonsgreetings:gingerbread_man','seasonsgreetings:hot_cocoa','seasonsgreetings:present_red','seasonsgreetings:witch_house','snowyspirit:gingerbread','snowyspirit:gingerbread_cookie','snowyspirit:gingerbread_door','snowyspirit:gingerbread_house','snowyspirit:gingerbread_stairs','snowyspirit:present_red','snowyspirit:wreath','winterly:blue_candy_cane','winterly:green_candy_cane','winterly:red_candy_cane'], 'block').forEach(id => event.add('chop:decor', id));   // Festivity twins of the old decor regexes
  event.add('chop:decor', /^supplementaries:.*(candle|present|wreath).*/);
  event.add('chop:decor', ['minecraft:lantern', 'minecraft:soul_lantern']);
  // presents as blocks (for the heist and Santa's doorstep later)
  event.add('chop:present_blocks', /^(seasonsgreetings|supplementaries|snowyspirit):.*present.*/);
  chopMigList(['christmas_hearthlight:christmas_gift_box']).filter(id => chopMigBlockHas(id)).forEach(id => event.add('chop:present_blocks', id));   // 11-12 migration
  chopMigNewList(['seasonsgreetings:present_red','snowyspirit:present_red'], 'block').forEach(id => event.add('chop:present_blocks', id));
});

ServerEvents.tags('entity_type', event => {
  // festive creatures: killing one is -2
  event.add('chop:festive_creatures', /^snuffles:.*/);
  event.add('chop:festive_creatures', /^festivity:frostpuff$/);   // D188: Festivity's Snuffles replacement (regex = safe if absent)
  event.add('chop:festive_creatures', /^alpinewhispers:.*reindeer.*/);
  event.add('chop:festive_creatures', /^snowyspirit:.*golem.*/);
  event.add('chop:festive_creatures', 'minecraft:snow_golem');
  // villagers: MCA + vanilla + MineColonies citizens (hurt/kill rules)
  event.add('chop:villagers', ['minecraft:villager', 'minecraft:wandering_trader']);
  event.add('chop:villagers', /^mca:.*villager.*/);
  event.add('chop:colonists', /^minecolonies:(citizen|visitor).*/);
});
