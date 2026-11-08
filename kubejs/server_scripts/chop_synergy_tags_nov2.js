// Chop's Christmas Spectacular - synergy tags, batch 2 (Nov 2 2026)
// Brewin' And Chewin' 4.5.0, New Year's Delight 2.0.0, Christmas Hearthlight. (NYD block fixed Nov 2 after TEST.)
// Ids from the staged jars (item_ids_2026-11-02.txt). Each block runs only if its mod is loaded.
// Load order: needs chop_synergy_tags.js / chop_presents_loot.js in the same folder (same tags).
const on = (mod) => Platform.isLoaded(mod)
const addAll = (event, tag, ns, names) => names.forEach(n => event.add(tag, `${ns}:${n}`))

ServerEvents.tags('item', event => {
  if (on('brewinandchewin')) {
    const bc = 'brewinandchewin'
    addAll(event, 'c:foods/cheese', bc, ['flaxen_cheese_wedge', 'scarlet_cheese_wedge'])
    const booze = ['beer', 'mead', 'rice_wine', 'egg_grog', 'strongroot_ale', 'saccharine_rum', 'pale_jane',
      'salty_folly', 'steel_toe_stout', 'glittering_grenadine', 'bloody_mary', 'red_rum', 'withering_dross',
      'dread_nog', 'vodka']
    addAll(event, 'c:drinks/alcoholic', bc, booze)
    addAll(event, 'c:drinks', bc, booze.concat(['kombucha']))
    addAll(event, 'c:drinks/eggnog', bc, ['egg_grog'])            // festive eggnog-style drink
    addAll(event, 'chop:festive_treats', bc, ['cocoa_fudge'])
    // Colony Cook: only crafting-table/furnace recipes can be learned; keg and cooking-pot ones are skipped by MineColonies
    addAll(event, 'minecolonies:cook_product', bc, ['pizza', 'quiche', 'ham_and_cheese_sandwich', 'vegetable_omelet', 'jerky'])
  }

  // New Year's Delight 2.0.0: mod id is newyearsdelight (1.1.0 was nydelight). Its own tags already
  // cover c:crops/azuki_bean, buckwheat, soybean and c:foods/raw_fish, so only sweets and soups here.
  if (on('newyearsdelight')) {
    const ny = 'newyearsdelight'
    addAll(event, 'chop:festive_treats', ny, ['tsukitate_mochi', 'yaki_mochi', 'kinako_mochi', 'ohagi', 'kagami_mochi', 'kurikinton', 'datemaki'])
    addAll(event, 'c:foods/soup', ny, ['toshikoshi_soba', 'ozoni'])
  }

  if (on('christmas_hearthlight')) {
    event.add('chop:presents', 'christmas_hearthlight:christmas_gift_box')
  }
})
