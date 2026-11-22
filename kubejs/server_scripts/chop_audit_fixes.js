// chop_audit_fixes.js v0.1.1 (Rune 2026-11-22: item 1 moved to kubejs/data/hole_filler_mod/recipe/throwable_hole_filler_water.json,
//   which replaces the jar's broken file so the RecipeManager error is gone too; one source per id. Krampus 461.)
// v0.1.0 (Loot audit thread, 2026-11-09) - server script. Recipe gaps found by the pack audit.
// 1) Hole Filler 1.3.0 ships throwable_hole_filler_water with a typo ("iteme"), so the recipe never loads (latest.log
//    RecipeManager error) and the item is uncraftable. Same id, same ingredients as the jar: filler core + 2 water buckets.
// 2) chop:donation_kettle (Assets' kettle, auto-found by chop_donation_bucket.js) is registered but has no recipe and no
//    loot or structure source, so survival players can't get one. Cauldron + red dye + gold nugget.
// KubeJS 2101: IIFE, early returns, no declarations inside nested blocks.
(function () {
  ServerEvents.recipes(event => {
    event.shapeless('chop:donation_kettle', ['minecraft:cauldron', '#c:dyes/red', 'minecraft:gold_nugget'])
      .id('chop:audit/donation_kettle');
  });
})();
