// chop_letsdo_to_fd.js v0.1.0 (Rune, 2026-11-17) - ONE kitchen set: Farmer's Delight wins (boss 11-17, D316 + LETSDO_TO_FD_PLAN Q1-Q7).
// Recipes of the duplicate Let's Do stations move onto Farmer's Delight stations, then those station recipe types are removed:
//   F&C cooking pot (pot_cooking), Bakery jam pot (jam_cooking), F&C roaster (roaster)  -> FD cooking pot (farmersdelight:cooking)
//   F&C cutting board (cutting_board)                                                   -> FD cutting board (knife), skipping inputs FD already cuts
//   F&C board assembly (cutting_board_assembly)                                         -> shapeless crafting; the food ones are tagged
//                                                                                          handson_delight:assembled so Hands-On Delight builds them on the FD board
// Stations that stay (boss): F&C stove (baking), crafting bowl, mincer, silo/drying, Bakery cake station, HerbalBrews kettle.
// Q5: Festive Delight Christmas tea moves from the FD pot (kubejs/data festive_delight:tea_craft) to the HerbalBrews kettle.
// Q7: F&C chicken parts / lamb ham inputs use the chop:unify/raw_chicken_cuts / raw_mutton_chops groups (chop_crop_unify.js v0.4.2).
// Data read from the Farm & Charm / Bakery / Candlelight jars (staging-big-update). Every item id is registry-checked; a recipe with a
// missing item is skipped and logged, never half-built. KubeJS 2101: IIFE, no declarations inside nested blocks.
(function () {
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  let reg = null;
  function has(id) {
    if (!reg) { reg = {}; try { BuiltInRegistries.ITEM.keySet().forEach(k => { reg[String(k)] = true; }); } catch (e) {} }
    return reg[id] === true;
  }
  function ok(ings) { return ings.every(i => !i.item || has(i.item)); }
  function rid(src) { return 'chop:letsdo_fd/' + src.replace(':', '/'); }
  // [source id, ingredients, result, count, container or null, xp]
  let POT = [
    ["farm_and_charm:pot_cooking/barley_soup",[{"tag":"farm_and_charm:barley"},{"tag":"farm_and_charm:barley"},{"tag":"farm_and_charm:water_bottles"},{"item":"minecraft:egg"}],"farm_and_charm:barley_soup",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/corn_grits",[{"tag":"farm_and_charm:corn"},{"tag":"farm_and_charm:corn"},{"tag":"farm_and_charm:flour"}],"farm_and_charm:corn_grits",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/goulash",[{"tag":"farm_and_charm:onion"},{"tag":"farm_and_charm:cooked_beef"},{"item":"farm_and_charm:simple_tomato_soup"},{"item":"minecraft:carrot"},{"item":"minecraft:potato"}],"farm_and_charm:goulash",1,null,0.35],
    ["farm_and_charm:pot_cooking/nettle_tea",[{"tag":"farm_and_charm:water_bottles"},{"item":"farm_and_charm:wild_nettle"},{"item":"farm_and_charm:wild_nettle"}],"farm_and_charm:nettle_tea",1,"minecraft:glass_bottle",0.35],
    ["farm_and_charm:pot_cooking/onion_soup",[{"tag":"farm_and_charm:bread"},{"tag":"farm_and_charm:onion"},{"tag":"farm_and_charm:onion"}],"farm_and_charm:onion_soup",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/potato_soup",[{"item":"minecraft:potato"},{"tag":"farm_and_charm:onion"}],"farm_and_charm:potato_soup",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/ribwort_tea",[{"tag":"farm_and_charm:water_bottles"},{"item":"farm_and_charm:wild_ribwort"},{"item":"farm_and_charm:wild_ribwort"}],"farm_and_charm:ribwort_tea",1,"minecraft:glass_bottle",0.35],
    ["farm_and_charm:pot_cooking/simple_tomato_soup",[{"tag":"farm_and_charm:tomato"},{"tag":"farm_and_charm:tomato"},{"item":"minecraft:sugar"}],"farm_and_charm:simple_tomato_soup",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/strawberry_tea",[{"tag":"farm_and_charm:water_bottles"},{"tag":"farm_and_charm:strawberry"},{"tag":"farm_and_charm:strawberry"}],"farm_and_charm:strawberry_tea",1,"minecraft:glass_bottle",0.35],
    ["farm_and_charm:pot_cooking/yeast",[{"item":"minecraft:sugar"},{"tag":"farm_and_charm:water_bottles"},{"item":"minecraft:wheat"}],"farm_and_charm:yeast",12,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/beetroot_soup",[{"item":"minecraft:beetroot"}],"minecraft:beetroot_soup",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/chocolate",[{"item":"minecraft:sugar"},{"item":"minecraft:cocoa_beans"},{"tag":"bakery:milk"}],"bakery:chocolate_truffle",4,null,0.35],
    ["farm_and_charm:pot_cooking/pudding",[{"tag":"bakery:eggs"},{"tag":"bakery:jam"},{"tag":"bakery:milk"}],"bakery:pudding",1,null,0.35],
    ["farm_and_charm:pot_cooking/rabbit_stew",[{"item":"minecraft:potato"},{"item":"minecraft:brown_mushroom"},{"item":"minecraft:carrot"},{"item":"minecraft:rabbit"}],"minecraft:rabbit_stew",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/chicken_teriyaki",[{"item":"candlelight:harvest_plate"},{"tag":"chop:unify/raw_chicken_cuts"},{"tag":"farm_and_charm:cabbage"}],"candlelight:chicken_teriyaki",4,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/chocolate_mousse",[{"item":"minecraft:cocoa_beans"},{"tag":"farm_and_charm:milk"},{"tag":"farm_and_charm:butter"}],"candlelight:chocolate_mousse",4,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/mushroom_soup",[{"tag":"candlelight:mushrooms"},{"tag":"candlelight:red_effect"},{"tag":"farm_and_charm:butter"},{"tag":"farm_and_charm:milk"}],"candlelight:mushroom_soup",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/pasta_with_mozzarella",[{"tag":"farm_and_charm:pasta"},{"item":"minecraft:egg"},{"tag":"candlelight:red_effect"},{"item":"candlelight:mozzarella"}],"candlelight:pasta_with_mozzarella",4,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/potroast",[{"item":"minecraft:beef"},{"item":"minecraft:potato"},{"item":"minecraft:carrot"},{"item":"farm_and_charm:onion"}],"candlelight:potroast",1,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/salmon_on_white_wine",[{"item":"minecraft:salmon"},{"tag":"candlelight:white_effect"},{"tag":"farm_and_charm:butter"}],"candlelight:salmon_on_white_wine",2,"minecraft:bowl",0.35],
    ["farm_and_charm:pot_cooking/tomato_soup",[{"tag":"farm_and_charm:tomato"},{"tag":"farm_and_charm:tomato"},{"tag":"candlelight:red_effect"}],"candlelight:tomato_soup",4,"minecraft:bowl",0.35],
    ["bakery:jam_cooking/apple_jam",[{"item":"minecraft:apple"},{"item":"minecraft:apple"},{"item":"minecraft:sugar"}],"bakery:apple_jam",3,null,1.0],
    ["bakery:jam_cooking/chocolate_jam",[{"tag":"bakery:milk"},{"tag":"bakery:chocolate"},{"item":"minecraft:sugar"}],"bakery:chocolate_jam",3,null,1.0],
    ["bakery:jam_cooking/glowberry_jam",[{"item":"minecraft:glow_berries"},{"item":"minecraft:glow_berries"},{"item":"minecraft:sugar"}],"bakery:glowberry_jam",3,null,1.0],
    ["bakery:jam_cooking/strawberry_jam",[{"item":"farm_and_charm:strawberry"},{"item":"farm_and_charm:strawberry"},{"item":"minecraft:sugar"}],"bakery:strawberry_jam",3,null,1.0],
    ["bakery:jam_cooking/sweetberry_jam",[{"item":"minecraft:sweet_berries"},{"item":"minecraft:sweet_berries"},{"item":"minecraft:sugar"}],"bakery:sweetberry_jam",3,null,1.0],
    ["farm_and_charm:roaster/bacon_with_eggs",[{"item":"farm_and_charm:bacon"},{"item":"farm_and_charm:bacon"},{"item":"minecraft:egg"},{"item":"minecraft:egg"},{"tag":"farm_and_charm:butter"}],"farm_and_charm:bacon_with_eggs",3,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/barley_patties_with_potatoes",[{"tag":"farm_and_charm:barley"},{"tag":"farm_and_charm:barley"},{"item":"minecraft:potato"},{"tag":"farm_and_charm:butter"},{"item":"minecraft:egg"},{"tag":"farm_and_charm:cabbage"}],"farm_and_charm:barley_patties_with_potatoes",2,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/beef_patty_with_vegetables",[{"item":"minecraft:beef"},{"item":"minecraft:carrot"},{"tag":"farm_and_charm:butter"},{"item":"minecraft:potato"},{"item":"minecraft:beetroot"},{"tag":"farm_and_charm:cabbage"}],"farm_and_charm:beef_patty_with_vegetables",2,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/chicken_wrapped_in_bacon",[{"item":"farm_and_charm:bacon"},{"tag":"chop:unify/raw_chicken_cuts"},{"tag":"farm_and_charm:pasta"},{"tag":"farm_and_charm:butter"}],"farm_and_charm:chicken_wrapped_in_bacon",1,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/cooked_cod",[{"item":"minecraft:carrot"},{"tag":"farm_and_charm:cabbage"},{"item":"minecraft:cod"},{"tag":"farm_and_charm:butter"}],"farm_and_charm:cooked_cod",1,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/cooked_salmon",[{"tag":"farm_and_charm:corn"},{"tag":"farm_and_charm:cabbage"},{"item":"minecraft:salmon"},{"tag":"farm_and_charm:butter"}],"farm_and_charm:cooked_salmon",1,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/lamb_with_corn",[{"item":"minecraft:carrot"},{"tag":"farm_and_charm:corn"},{"tag":"chop:unify/raw_mutton_chops"},{"tag":"farm_and_charm:butter"}],"farm_and_charm:lamb_with_corn",1,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/oat_pancake",[{"tag":"farm_and_charm:oat"},{"tag":"farm_and_charm:oat"},{"tag":"farm_and_charm:oat"},{"tag":"farm_and_charm:dough"},{"tag":"farm_and_charm:butter"},{"tag":"farm_and_charm:strawberry"}],"farm_and_charm:oat_pancake",3,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/sausage_with_oat_patty",[{"tag":"farm_and_charm:oat"},{"tag":"farm_and_charm:butter"},{"item":"minecraft:potato"},{"item":"minecraft:carrot"},{"item":"farm_and_charm:minced_beef"},{"item":"farm_and_charm:minced_beef"}],"farm_and_charm:sausage_with_oat_patty",2,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/beef_with_mushroom_in_wine_and_potatoes",[{"item":"minecraft:baked_potato"},{"item":"candlelight:fillet_steak"},{"tag":"candlelight:mushrooms"},{"tag":"candlelight:white_effect"},{"tag":"farm_and_charm:milk"}],"candlelight:beef_with_mushroom_in_wine_and_potatoes",4,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/bolognese",[{"tag":"candlelight:tomato_soups"},{"item":"farm_and_charm:minced_beef"},{"item":"farm_and_charm:bacon"},{"tag":"farm_and_charm:onion"},{"item":"minecraft:carrot"},{"tag":"candlelight:red_effect"}],"candlelight:bolognese",4,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/fillet_steak",[{"item":"minecraft:beef"},{"tag":"farm_and_charm:butter"},{"tag":"candlelight:all_effects"}],"candlelight:fillet_steak",1,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/omelet",[{"item":"minecraft:egg"},{"tag":"farm_and_charm:butter"},{"tag":"farm_and_charm:flour"},{"item":"minecraft:sugar"},{"tag":"farm_and_charm:strawberry"}],"candlelight:omelet",6,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/pasta_broccoli",[{"tag":"farm_and_charm:cabbage"},{"tag":"farm_and_charm:pasta"},{"tag":"candlelight:cheeses"}],"candlelight:pasta_with_lettuce",1,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/pasta_with_bolognese",[{"item":"candlelight:bolognese"},{"tag":"farm_and_charm:pasta"},{"tag":"candlelight:cheeses"}],"candlelight:pasta_with_bolognese",1,"minecraft:bowl",0.35],
    ["farm_and_charm:roaster/roasted_lamb_with_lettuce",[{"tag":"farm_and_charm:cabbage"},{"tag":"chop:unify/raw_mutton_chops"},{"tag":"candlelight:red_effect"}],"candlelight:roasted_lamb_with_lettuce",2,"minecraft:bowl",0.35]
  ];
  // [source id, ingredient, [[result, count], ...]]
  let CUT = [
    ["farm_and_charm:cutting_board/bone_meal",{"item":"minecraft:bone"},[["minecraft:bone_meal",4]]],
    ["farm_and_charm:cutting_board/brown_mushroom",{"item":"minecraft:brown_mushroom_block"},[["minecraft:brown_mushroom",2]]],
    ["farm_and_charm:cutting_board/cyan_dye_from_pitcher_plant",{"item":"minecraft:pitcher_plant"},[["minecraft:cyan_dye",4]]],
    ["farm_and_charm:cutting_board/magenta_dye_from_lilac",{"item":"minecraft:lilac"},[["minecraft:magenta_dye",4]]],
    ["farm_and_charm:cutting_board/melon_seeds",{"item":"minecraft:melon_slice"},[["minecraft:melon_seeds",2]]],
    ["farm_and_charm:cutting_board/pink_dye_from_peony",{"item":"minecraft:peony"},[["minecraft:pink_dye",4]]],
    ["farm_and_charm:cutting_board/pink_dye_from_pink_petals",{"item":"minecraft:pink_petals"},[["minecraft:pink_dye",2]]],
    ["farm_and_charm:cutting_board/red_dye_from_rose_bush",{"item":"minecraft:rose_bush"},[["minecraft:red_dye",4]]],
    ["farm_and_charm:cutting_board/red_mushroom",{"item":"minecraft:red_mushroom_block"},[["minecraft:red_mushroom",2]]],
    ["farm_and_charm:cutting_board/strawberry_seeds",{"item":"farm_and_charm:strawberry"},[["farm_and_charm:strawberry_seeds",4]]],
    ["farm_and_charm:cutting_board/string_from_wool",{"tag":"minecraft:wool"},[["minecraft:string",4]]],
    ["farm_and_charm:cutting_board/sugar",{"item":"minecraft:sugar_cane"},[["minecraft:sugar",2]]],
    ["farm_and_charm:cutting_board/tomato_seeds",{"item":"farm_and_charm:tomato"},[["farm_and_charm:tomato_seeds",4]]],
    ["farm_and_charm:cutting_board/wheat_from_hay_block",{"item":"minecraft:hay_block"},[["minecraft:wheat",9]]],
    ["farm_and_charm:cutting_board/yellow_dye_from_sunflower",{"item":"minecraft:sunflower"},[["minecraft:yellow_dye",4]]]
  ];
  // [source id, ingredients, result, count, food built on the FD board]
  let ASM = [
    ["farm_and_charm:cutting_board_assembly/cat_food",[{"tag":"farm_and_charm:raw_fishes"},{"tag":"farm_and_charm:raw_chicken"},{"tag":"farm_and_charm:cooked_beef"}],"farm_and_charm:cat_food",6,false],
    ["farm_and_charm:cutting_board_assembly/cat_food_bag",[{"item":"farm_and_charm:cat_food"},{"item":"farm_and_charm:cat_food"},{"item":"farm_and_charm:cat_food"},{"item":"farm_and_charm:cat_food"}],"farm_and_charm:cat_food_bag",1,false],
    ["farm_and_charm:cutting_board_assembly/chicken_feed",[{"tag":"farm_and_charm:wheat"},{"item":"minecraft:carrot"},{"item":"minecraft:wheat_seeds"}],"farm_and_charm:chicken_feed",3,false],
    ["farm_and_charm:cutting_board_assembly/chicken_nest",[{"item":"minecraft:wheat"},{"item":"minecraft:wheat"},{"item":"minecraft:wheat"}],"farm_and_charm:chicken_nest",2,false],
    ["farm_and_charm:cutting_board_assembly/compost",[{"item":"farm_and_charm:fertilizer"},{"item":"farm_and_charm:fertilizer"},{"item":"farm_and_charm:fertilizer"},{"item":"farm_and_charm:fertilizer"}],"farm_and_charm:compost",1,false],
    ["farm_and_charm:cutting_board_assembly/dog_food",[{"tag":"farm_and_charm:cooked_beef"},{"tag":"farm_and_charm:raw_beef"},{"tag":"farm_and_charm:bones"}],"farm_and_charm:dog_food",4,false],
    ["farm_and_charm:cutting_board_assembly/dog_food_bag",[{"item":"farm_and_charm:dog_food"},{"item":"farm_and_charm:dog_food"},{"item":"farm_and_charm:dog_food"},{"item":"farm_and_charm:dog_food"}],"farm_and_charm:dog_food_bag",1,false],
    ["farm_and_charm:cutting_board_assembly/horse_fodder",[{"tag":"farm_and_charm:wheat"},{"item":"minecraft:apple"},{"item":"minecraft:carrot"}],"farm_and_charm:horse_fodder",1,false],
    ["farm_and_charm:cutting_board_assembly/rope",[{"item":"minecraft:string"},{"item":"farm_and_charm:barley"},{"item":"minecraft:string"}],"farm_and_charm:rope",6,false],
    ["bakery:cutting_board_assembly/bread_crate",[{"item":"bakery:tray"},{"tag":"bakery:bread"},{"item":"bakery:baguette"},{"item":"bakery:bun"},{"item":"bakery:braided_bread"}],"bakery:bread_crate",1,false],
    ["bakery:cutting_board_assembly/bread_with_jam",[{"tag":"bakery:bread"},{"tag":"bakery:jam"}],"bakery:bread_with_jam",5,true],
    ["bakery:cutting_board_assembly/chocolate_box",[{"item":"minecraft:paper"},{"item":"bakery:chocolate_truffle"},{"item":"bakery:chocolate_truffle"},{"item":"bakery:chocolate_truffle"},{"item":"bakery:chocolate_truffle"}],"bakery:chocolate_box",1,false],
    ["bakery:cutting_board_assembly/grilled_salmon_sandwich",[{"tag":"bakery:bread"},{"item":"minecraft:cooked_salmon"},{"tag":"farm_and_charm:cabbage"}],"bakery:grilled_salmon_sandwich",2,true],
    ["bakery:cutting_board_assembly/sandwich",[{"tag":"bakery:bread"},{"tag":"bakery:cooked_beef"},{"tag":"farm_and_charm:cabbage"}],"bakery:sandwich",2,true],
    ["bakery:cutting_board_assembly/vegetable_sandwich",[{"tag":"bakery:bread"},{"tag":"farm_and_charm:cabbage"},{"tag":"farm_and_charm:tomato"}],"bakery:vegetable_sandwich",2,true],
    ["farm_and_charm:cutting_board_assembly/beef_tartare",[{"item":"farm_and_charm:minced_beef"},{"tag":"farm_and_charm:onion"}],"candlelight:beef_tartare",2,true],
    ["farm_and_charm:cutting_board_assembly/chocolate_box",[{"tag":"candlelight:chocolate"},{"tag":"candlelight:chocolate"},{"tag":"candlelight:chocolate"},{"tag":"candlelight:chocolate"}],"candlelight:chocolate_box",1,false],
    ["farm_and_charm:cutting_board_assembly/flower_crown",[{"item":"candlelight:rose"},{"item":"candlelight:rose"},{"item":"candlelight:rose"},{"item":"candlelight:rose"}],"candlelight:flower_crown",1,false],
    ["farm_and_charm:cutting_board_assembly/harvest_plate",[{"item":"minecraft:carrot"},{"item":"minecraft:potato"},{"tag":"farm_and_charm:tomato"}],"candlelight:harvest_plate",3,true],
    ["farm_and_charm:cutting_board_assembly/tomato_mozzarella_salad",[{"tag":"candlelight:cheeses"},{"tag":"farm_and_charm:tomato"}],"candlelight:tomato_mozzarella_salad",1,true]
  ];
  let ASSEMBLED = {};
  ASM.forEach(a => { if (a[4]) ASSEMBLED[a[2]] = true; });
  let KNIFE = [{ type: 'farmersdelight:item_ability', action: 'knife_dig' }, { tag: 'c:tools/knife' }];

  ServerEvents.tags('item', event => {
    Object.keys(ASSEMBLED).forEach(id => { if (has(id)) event.add('handson_delight:assembled', id); });
  });

  ServerEvents.recipes(event => {
    if (!Platform.isLoaded('farmersdelight') || !Platform.isLoaded('farm_and_charm')) return;
    let n = { pot: 0, cut: 0, asm: 0, skip: 0 };
    POT.forEach(p => {
      if (!has(p[2]) || !ok(p[1]) || (p[4] && !has(p[4]))) { n.skip++; console.info('[chop letsdo] skipped ' + p[0]); return; }
      let j = { type: 'farmersdelight:cooking', ingredients: p[1], result: { id: p[2], count: p[3] }, experience: p[5], cookingtime: 200, recipe_book_tab: 'meals' };
      if (p[4]) j.container = { id: p[4], count: 1 };
      try { event.custom(j).id(rid(p[0])); n.pot++; } catch (e) { n.skip++; console.warn('[chop letsdo] ' + p[0] + ' failed: ' + e); }
    });
    CUT.forEach(c => {
      if (!ok([c[1]]) || c[2].some(o => !has(o[0]))) { n.skip++; console.info('[chop letsdo] skipped ' + c[0]); return; }
      let j = { type: 'farmersdelight:cutting', ingredients: [c[1]], tool: KNIFE, result: c[2].map(o => ({ item: { id: o[0], count: o[1] } })) };
      try { event.custom(j).id(rid(c[0])); n.cut++; } catch (e) { n.skip++; console.warn('[chop letsdo] ' + c[0] + ' failed: ' + e); }
    });
    ASM.forEach(a => {
      if (!has(a[2]) || !ok(a[1])) { n.skip++; console.info('[chop letsdo] skipped ' + a[0]); return; }
      let j = { type: 'minecraft:crafting_shapeless', category: 'misc', ingredients: a[1], result: { id: a[2], count: a[3] } };
      try { event.custom(j).id(rid(a[0])); n.asm++; } catch (e) { n.skip++; console.warn('[chop letsdo] ' + a[0] + ' failed: ' + e); }
    });
    ['farm_and_charm:pot_cooking', 'bakery:jam_cooking', 'farm_and_charm:roaster', 'farm_and_charm:cutting_board', 'farm_and_charm:cutting_board_assembly']
      .forEach(t => { event.remove({ type: t }); });
    // Q5 Christmas tea: HerbalBrews kettle instead of the FD pot (same effect the drink itself gives: Hot Heart, 60 s)
    if (Platform.isLoaded('herbalbrews') && has('festive_delight:christmas_tea')) {
      event.remove({ id: 'festive_delight:tea_craft' });
      event.custom({ type: 'herbalbrews:kettle_brewing', experience: 0.8, crafting_duration: 25, fluid_amount: 10, heat_amount: 40,
        ingredients: [{ item: 'minecraft:honey_bottle' }, { item: 'minecraft:sweet_berries' }, { tag: 'c:foods/ground_cinnamon' }, { item: 'minecraft:glass_bottle' }],
        result: { id: 'festive_delight:christmas_tea' }, effect: 'festive_delight:hot_heart', effect_duration: 1200 }).id('chop:letsdo_fd/christmas_tea_kettle');
    }
    console.info('[chop letsdo] v0.1.0 FD pot ' + n.pot + ', FD board ' + n.cut + ', crafting ' + n.asm + ', skipped ' + n.skip);
  });
})();
