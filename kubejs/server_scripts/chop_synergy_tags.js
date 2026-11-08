// Chop's Christmas Spectacular - synergy tags and recipe swaps
// Source: "Synergy Audit" sheet tab, rows 7, 8, 12, 13, 14, 15, 16 (approved Nov 1 2026).
// Item ids were read from the installed jars. Every block is guarded by
// Platform.isLoaded, so a removed mod only skips its lines.
// Install: <instance>/minecraft/kubejs/server_scripts/  (TEST instance first)

const loaded = (mod) => Platform.isLoaded(mod)

// add(event, tag, [ids]) - only ids whose mod is loaded
function add(event, tag, ids) {
  ids.filter(id => loaded(id.split(':')[0])).forEach(id => event.add(tag, id))
}

ServerEvents.tags('item', event => {
  // ---- Rows 8 + 14: one tomato/onion/cabbage/rice/garlic for every recipe ----
  add(event, 'c:crops/tomato',  ['farmersdelight:tomato', 'herbsandharvest:tomato', 'minecolonies:tomato'])
  add(event, 'c:foods/tomato',  ['farmersdelight:tomato', 'herbsandharvest:tomato', 'minecolonies:tomato'])
  add(event, 'c:crops/onion',   ['farmersdelight:onion', 'herbsandharvest:onion', 'minecolonies:onion'])
  add(event, 'c:foods/onion',   ['farmersdelight:onion', 'herbsandharvest:onion', 'minecolonies:onion'])
  add(event, 'c:crops/cabbage', ['farmersdelight:cabbage', 'herbsandharvest:cabbage', 'minecolonies:cabbage'])
  add(event, 'c:foods/cabbage', ['farmersdelight:cabbage', 'herbsandharvest:cabbage', 'minecolonies:cabbage'])
  add(event, 'c:crops/rice',    ['farmersdelight:rice', 'herbsandharvest:rice', 'minecolonies:rice'])
  add(event, 'c:crops/garlic',  ['herbsandharvest:garlic_bulb', 'minecolonies:garlic'])
  add(event, 'c:foods/garlic',  ['herbsandharvest:garlic_bulb', 'minecolonies:garlic'])
  add(event, 'c:crops',         ['minecolonies:tomato', 'minecolonies:onion', 'minecolonies:cabbage', 'minecolonies:rice', 'minecolonies:garlic'])

  // ---- Row 12: ginger ----
  add(event, 'c:crops/ginger',        ['snowyspirit:ginger', 'herbsandharvest:ginger_root', 'merrymaking:ginger_root'])
  add(event, 'c:foods/ground_ginger', ['herbsandharvest:ground_ginger', 'merrymaking:ground_ginger'])

  // ---- Row 13: cinnamon ----
  add(event, 'c:foods/ground_cinnamon', ['festive_delight:cinnamon_powder', 'herbsandharvest:ground_cinnamon'])
  add(event, 'c:crops/cinnamon',        ['festive_delight:cinnamon_sticks', 'herbsandharvest:cinnamon'])

  // ---- Row 15: gingerbread cookies (4 mods) ----
  const gingerCookies = [
    'snowyspirit:gingerbread_cookie',
    'seasonsgreetings:gingerbread_cookie',
    'merrymaking:gingerbread_cookie',
    'festive_delight:gingerbread_man',
    'festive_delight:gingerbread_man_creeper',
    'festive_delight:gingerbread_cookie_flake',
    'festive_delight:gingerbread_cookie_sword'
  ]
  add(event, 'c:foods/gingerbread_cookie', gingerCookies)
  add(event, 'c:foods/cookie', gingerCookies)
  add(event, 'c:foods/cookie', ['herbsandharvest:sugar_cookie', 'herbsandharvest:snickerdoodle_cookie',
    'herbsandharvest:oatmeal_raisin_cookie', 'herbsandharvest:peanut_butter_cookie',
    'merrymaking:tree_christmas_cookie', 'merrymaking:stocking_christmas_cookie', 'merrymaking:mitten_christmas_cookie'])

  // ---- Row 16: hot cocoa (5 mods) and eggnog (4 mods) ----
  const cocoa = ['farmersdelight:hot_cocoa', 'merrymaking:hot_cocoa', 'merrymaking:peppermint_cocoa',
    'seasonsgreetings:hot_cocoa', 'christmassgrandmascabinet:hot_chocolate', 'manyideas_christmas:hot_chocolate']
  const eggnog = ['snowyspirit:eggnog', 'seasonsgreetings:eggnog', 'christmassgrandmascabinet:eggnog']
  add(event, 'c:drinks/hot_cocoa', cocoa)
  add(event, 'c:drinks/eggnog', eggnog)   // Snowy Spirit already defines this tag; we extend it
  add(event, 'c:drinks', cocoa.concat(eggnog))

  // ---- Row 7: colony Baker and Cook learn the Christmas foods ----
  // MineColonies crafters accept a recipe when its output is in <job>_product.
  add(event, 'minecolonies:baker_product', gingerCookies.concat([
    'herbsandharvest:sugar_cookie', 'herbsandharvest:snickerdoodle_cookie', 'herbsandharvest:cinnamon_roll',
    'merrymaking:tree_christmas_cookie', 'merrymaking:stocking_christmas_cookie', 'merrymaking:mitten_christmas_cookie']))
  add(event, 'minecolonies:baker_ingredient', ['merrymaking:cookie_dough', 'merrymaking:gingerbread_dough',
    'festive_delight:gingerbread_dough', 'festive_delight:gingerbread_man_dough'])
  add(event, 'minecolonies:cook_product', cocoa.concat(eggnog))
})

ServerEvents.recipes(event => {
  // Row 12: Snowy Spirit recipes take any ginger; Merrymaking takes either ground ginger
  if (loaded('snowyspirit')) event.replaceInput({ mod: 'snowyspirit' }, 'snowyspirit:ginger', '#c:crops/ginger')
  if (loaded('merrymaking')) event.replaceInput({ mod: 'merrymaking' }, 'herbsandharvest:ground_ginger', '#c:foods/ground_ginger')
  // Row 13: either cinnamon powder works in both mods
  if (loaded('festive_delight')) event.replaceInput({ mod: 'festive_delight' }, 'festive_delight:cinnamon_powder', '#c:foods/ground_cinnamon')
  if (loaded('herbsandharvest')) event.replaceInput({ mod: 'herbsandharvest' }, 'herbsandharvest:ground_cinnamon', '#c:foods/ground_cinnamon')
})
