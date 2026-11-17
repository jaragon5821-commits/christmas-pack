// chop_letsdo_tabs.js v0.1.0 (Rune, 2026-11-17) - boss Q6: the switched-off duplicate Let's Do stations leave their creative tabs.
// The items stay registered and craftable. Candlelight decor pots/pans/stoves are NOT touched. Pairs with chop_letsdo_to_fd.js.
(function () {
  if (typeof StartupEvents == 'undefined' || !StartupEvents.modifyCreativeTab) return;
  let TABS = { 'farm_and_charm:tab': ['farm_and_charm:cooking_pot', 'farm_and_charm:roaster', 'farm_and_charm:cutting_board'],
               'bakery:tab': ['bakery:small_cooking_pot'] };
  Object.keys(TABS).forEach(tab => {
    try {
      StartupEvents.modifyCreativeTab(tab, event => { TABS[tab].forEach(id => { try { event.remove(id); } catch (e) { console.warn('[chop letsdo] tab ' + id + ': ' + e); } }); });
    } catch (e) { console.warn('[chop letsdo] creative tab ' + tab + ' failed: ' + e); }
  });
})();
