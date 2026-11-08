// Chop's Christmas Spectacular - Snuffles 1.1.2 + Merrymaking fixes (Nov 2 2026, TEST first)
// Snuffles ships pre-1.21 recipe JSON ("result": {"item": ...}) so all 6 recipes fail to load,
// and its snuffles:snuffle_food tag points at #forge:crops/potato, which doesn't exist on NeoForge 1.21.1.
// Recipes below are copied 1:1 from the jar (same ids, shapes, counts, xp, times), in 1.21 form.
if (Platform.isLoaded('snuffles')) {
  ServerEvents.tags('item', event => {
    event.removeAll('snuffles:snuffle_food')                      // drops the broken #forge reference
    event.add('snuffles:snuffle_food', ['#c:crops/potato', 'minecraft:potato', 'minecraft:baked_potato'])
  })

  ServerEvents.recipes(event => {
    event.shaped(Item.of('snuffles:snuffle_fluff_carpet', 3), ['##'], { '#': 'snuffles:snuffle_fluff' })
      .id('snuffles:snuffle_fluff_carpet_from_snuffle_fluff')
    event.shaped(Item.of('snuffles:frosty_fluff_carpet', 3), ['##'], { '#': 'snuffles:frosty_fluff' })
      .id('snuffles:frosty_fluff_carpet_from_frosty_fluff')
    event.shaped(Item.of('snuffles:frosty_fluff', 8), ['###', '#X#', '###'], { '#': 'snuffles:snuffle_fluff', X: 'minecraft:powder_snow_bucket' })
      .id('snuffles:frosty_fluff_from_snuffle_fluff')
    event.shaped(Item.of('snuffles:frosty_fluff_carpet', 8), ['###', '#X#', '###'], { '#': 'snuffles:snuffle_fluff_carpet', X: 'minecraft:powder_snow_bucket' })
      .id('snuffles:frosty_fluff_carpet_from_snuffle_fluff_carpet')
    event.smelting('snuffles:snuffle_fluff', 'snuffles:frosty_fluff').xp(0.1).cookingTime(200)
      .id('snuffles:snuffle_fluff_from_frosty_fluff')
    event.smelting('snuffles:snuffle_fluff_carpet', 'snuffles:frosty_fluff_carpet').xp(0.1).cookingTime(200)
      .id('snuffles:snuffle_fluff_carpet_from_frosty_fluff_carpet')
  })
}

// Merrymaking: the 4 pine mantel recipes need happyhallows pine planks/slabs (Happy Hallows is not in the pack),
// so they never load. Nothing to remove server-side; the items are hidden from JEI in
// client_scripts/chop_hide_items.js. Optional alternative (Josh decides): uncomment to craft the plain
// pine mantel from spruce instead.
// if (Platform.isLoaded('merrymaking')) ServerEvents.recipes(event => {
//   event.shaped('merrymaking:pine_mantel', ['SSS', 'P P', 'P P'], { S: 'minecraft:spruce_slab', P: 'minecraft:spruce_planks' })
//     .id('merrymaking:pine_mantel')
// })
