// chop_xmas_tooltips.js v0.1.0 (Scripts thread, 2026-11-08) - CLIENT script (kubejs/client_scripts).
// Short grey hints on Chop's custom Christmas blocks: where to restyle them and what they do. Text only, no gameplay.
(function () {
  const HINTS = [
    [/^chop:glowing_.*ornament$/, ['Glows. Restyle at the Glassblower.']],
    [/^chop:(?!glowing_).*large_ornament$/, ['Restyle at the Glassblower. Add glowstone to make it glow.']],
    [/^chop:(?!glowing_)(?!.*large_).*ornament$/, ['Hangs under blocks like a lantern.', 'Restyle at the Glassblower. Add glowstone to make it glow.']],
    [/^chop:.*_window_[23]x[23]$/, ['Big picture: fill a square on the world grid.', 'Restyle at the Glassblower.']],
    [/^chop:.*_window$/, ['Connects to matching windows.', 'Restyle at the Glassblower.']],
    [/^chop:.*_wrapping_paper$/, ['Swap patterns at the Loom Table.']],
    [/^chop:.*_sweater_wool$/, ['Swap patterns at the Loom Table.']],
    [/^chop:.*_gift_bow$/, ['Put one on a present.']],
    [/^chop:(carved_ice_.*|clear_ice_bricks|glowing_ice)$/, ['Swap styles at the Glassblower.']],
    [/^chop:.*icing_drip$/, ['Hangs off the side of a block.']],
    [/^chop:advent_calendar$/, ['Dec 1-24: open one door a day for a gift.', 'Door 24 counts double for Festivity.']]
  ];
  ItemEvents.modifyTooltips(event => {
    HINTS.forEach(h => {
      try { event.add(h[0], h[1].map(t => Text.gray(t))); } catch (e) { console.warn('[chop tooltips] ' + h[0] + ': ' + e); }
    });
  });
})();
