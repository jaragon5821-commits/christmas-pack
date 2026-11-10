// chop_audit_fixes.js v0.1.0 (Loot audit thread, 2026-11-09) - server script. Recipe gaps found by the pack audit.
// 1) Hole Filler 1.3.0 ships throwable_hole_filler_water with a typo ("iteme"), so the recipe never loads (latest.log
//    RecipeManager error) and the item is uncraftable. Same id, same ingredients as the jar: filler core + 2 water buckets.
// 2) chop:donation_kettle (Assets' kettle, auto-found by chop_donation_bucket.js) is registered but has no recipe and no
//    loot or structure source, so survival players can't get one. Cauldron + red dye + gold nugget.
// KubeJS 2101: IIFE, early returns, no declarations inside nested blocks.
(function () {
  ServerEvents.recipes(event => {
    if (Platform.isLoaded('hole_filler_mod')) {
      event.shapeless('hole_filler_mod:throwable_hole_filler_water',
        ['hole_filler_mod:filler_core', 'minecraft:water_bucket', 'minecraft:water_bucket'])
        .id('hole_filler_mod:throwable_hole_filler_water');
    }
    event.shapeless('chop:donation_kettle', ['minecraft:cauldron', '#c:dyes/red', 'minecraft:gold_nugget'])
      .id('chop:audit/donation_kettle');
  });
})();
