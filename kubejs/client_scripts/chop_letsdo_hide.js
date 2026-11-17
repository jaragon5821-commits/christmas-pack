// chop_letsdo_hide.js v0.1.0 (Rune, 2026-11-17) - boss Q6: the switched-off duplicate Let's Do stations are hidden from JEI/EMI.
// The blocks stay registered and craftable (blueprints, structures and MineColonies builders still use them).
// Candlelight cooking pot / pan / stoves are decor and are NOT hidden. Pairs with server_scripts/chop_letsdo_to_fd.js.
(function () {
  if (typeof RecipeViewerEvents == 'undefined') return;
  RecipeViewerEvents.removeEntries('item', event => {
    ['farm_and_charm:cooking_pot', 'farm_and_charm:roaster', 'farm_and_charm:cutting_board', 'bakery:small_cooking_pot']
      .forEach(id => { try { event.remove(id); } catch (e) { console.warn('[chop letsdo] hide ' + id + ' failed: ' + e); } });
  });
})();
