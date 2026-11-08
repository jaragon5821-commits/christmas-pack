// priority: 95
// Festivity tags. Mod ids confirmed from the TEST jars on 2026-11-02 (build thread): festive_delight, seasonsgreetings,
// mcwholidays, christmassgrandmascabinet, merrymaking, snowyspirit, fairylights, winterly, supplementaries, snuffles,
// alpinewhispers, mca, christmas_hearthlight, brewinandchewin. Waddles is not installed.
ServerEvents.tags('item', event => {
  // festive food: Festive Delight, Farmer's Delight cookies, Season's Greetings cocoa, Grandma's Cabinet, Merrymaking
  event.add('chop:festive_food', /^festive_delight:.*/);
  event.add('chop:festive_food', /^seasonsgreetings:.*(cocoa|cookie|gingerbread|eggnog|candy).*/);
  event.add('chop:festive_food', /^christmassgrandmascabinet:.*/);
  event.add('chop:festive_food', ['christmas_hearthlight:gingerbread_man', 'brewinandchewin:cocoa_fudge', 'brewinandchewin:dread_nog', 'brewinandchewin:egg_grog']);
  event.add('chop:festive_food', /^merrymaking:.*(cookie|cocoa|cake|punch|eggnog).*/);
  event.add('chop:festive_food', ['minecraft:cookie', 'minecraft:cake', 'minecraft:pumpkin_pie']);
  event.add('chop:festive_food', '#c:foods/gingerbread_cookie');
  event.add('chop:festive_food', '#c:drinks/hot_cocoa');
  event.add('chop:festive_food', '#c:drinks/eggnog');

  // presents (give-a-present action): Season's Greetings / Supplementaries / Snowy Spirit present blocks as items
  event.add('chop:presents', /^seasonsgreetings:.*present.*/);
  event.add('chop:presents', 'christmas_hearthlight:christmas_gift_box');
  event.add('chop:presents', /^supplementaries:.*present.*/);
  event.add('chop:presents', /^snowyspirit:.*present.*/);

  // gifts that MCA villagers like (gift_villager action)
  event.add('chop:gift', '#chop:festive_food');
  event.add('chop:gift', '#chop:presents');
  event.add('chop:gift', '#minecraft:flowers');
  // letters to Santa (Christmas Hearthlight), used by phase 2 mailbox detection
  event.add('chop:santa_letters', ['christmas_hearthlight:santa_letter', 'christmas_hearthlight:sealed_letter', 'christmas_hearthlight:santa_envelope']);

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
  event.add('chop:decor', '#christmas_hearthlight:decorations');
  event.add('chop:decor', '#christmas_hearthlight:christmas_stockings');
  event.add('chop:decor', '#christmas_hearthlight:gingerbread_blocks');
  event.add('chop:decor', ['christmas_hearthlight:christmas_wreath', 'christmas_hearthlight:pine_garland', 'christmas_hearthlight:string_lights', 'christmas_hearthlight:tall_christmas_tree', 'christmas_hearthlight:giant_candy_cane', 'christmas_hearthlight:wall_giant_candy_cane', 'christmas_hearthlight:christmas_mailbox']);
  event.add('chop:decor', /^supplementaries:.*(candle|present|wreath).*/);
  event.add('chop:decor', ['minecraft:lantern', 'minecraft:soul_lantern']);
  // presents as blocks (for the heist and Santa's doorstep later)
  event.add('chop:present_blocks', /^(seasonsgreetings|supplementaries|snowyspirit):.*present.*/);
  event.add('chop:present_blocks', 'christmas_hearthlight:christmas_gift_box');
});

ServerEvents.tags('entity_type', event => {
  // festive creatures: killing one is -2
  event.add('chop:festive_creatures', /^snuffles:.*/);
  event.add('chop:festive_creatures', /^alpinewhispers:.*reindeer.*/);
  event.add('chop:festive_creatures', /^snowyspirit:.*golem.*/);
  event.add('chop:festive_creatures', 'minecraft:snow_golem');
  // villagers: MCA + vanilla + MineColonies citizens (hurt/kill rules)
  event.add('chop:villagers', ['minecraft:villager', 'minecraft:wandering_trader']);
  event.add('chop:villagers', /^mca:.*villager.*/);
  event.add('chop:colonists', /^minecolonies:(citizen|visitor).*/);
});
