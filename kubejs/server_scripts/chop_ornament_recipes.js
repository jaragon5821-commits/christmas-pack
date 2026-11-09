// chop_ornament_recipes.js v0.5.0 (Scripts thread, 2026-11-09; v0.4.0 2026-11-05) - recipes + tags for the Festivity ornaments.
// Nothing turns back into metal, so builds using ornaments can't be farmed for iron or gold.
// LARGE: 8 glass around 1 iron nugget = 8 Large Silver Ornaments (about 1 glass + 1/8 nugget each).
// SMALL: 1 iron nugget over 1 glass pane = 2 Silver Ornaments.
// Colour (both sets): 8 ornaments around 1 dye = 8 of that colour (like stained glass), or 1 ornament + 1 dye = 1.
// Gold (both sets): 8 ornaments around 1 gold nugget = 8 Gold Ornaments.
// Any ornament can be re-dyed (tags chop:large_ornaments / chop:ornaments).
// v0.5.0 (Josh 21:03): Festivity tree toppers (tag festivity:tree_toppers, Festivity 0.9.34+) are one more Glassblower swap group.
// v0.3.0: 8 styles per colour; Chipped Glassblower swaps a colour's plain + 8 styles (one group per colour and size).
// v0.1.1: every ornament is also in chop:decor (block + item), so Festivity counts placing/breaking them as decorating.
(function () {
  const DYES = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
  const SETS = [{ suf: 'large_ornament', tag: 'chop:large_ornaments' }, { suf: 'ornament', tag: 'chop:ornaments' }];
  const STYLES = ['striped', 'snowflake', 'glitter', 'ribbed', 'mercury', 'faceted', 'jeweled', 'painted'];
  const COLS = [''].concat(['gold'], DYES);
  function plainOf(s) { return ['chop:' + s.suf, 'chop:gold_' + s.suf].concat(DYES.map(d => 'chop:' + d + '_' + s.suf)); }
  function styledOf(s, c) { return STYLES.map(st => 'chop:' + (c == '' ? '' : c + '_') + st + '_' + s.suf); }
  function idsOf(s) { let out = plainOf(s); COLS.forEach(c => { out = out.concat(styledOf(s, c)); }); return out; }

  // v0.5.0: registry check at function top level (KubeJS 2101: no declarations inside nested blocks)
  function chopHasItem(id) { let h = false; try { Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ITEM.keySet().forEach(k => { if (String(k) == id) h = true; }); } catch (e) { console.warn('[chop ornaments] registry check failed: ' + e); } return h; }
  function groupTag(s, c) { return 'chop:chipped/' + (c == '' ? 'silver' : c) + '_' + s.suf; }
  function groupIds(s, c) { return ['chop:' + (c == '' ? '' : c + '_') + s.suf].concat(styledOf(s, c)); }
  function addTags(event) {
    SETS.forEach(s => {
      idsOf(s).forEach(id => { event.add(s.tag, id); event.add('chop:decor', id); });
      COLS.forEach(c => groupIds(s, c).forEach(id => event.add(groupTag(s, c), id)));
    });
  }
  ServerEvents.tags('item', addTags);
  ServerEvents.tags('block', addTags);

  // Chipped 4.0.2 has ONE glassblower recipe listing its group tags; recipes don't merge, so rebuild it with ours added.
  const CHIPPED_GLASS = ['glass', 'glass_pane'].concat(['black', 'blue', 'brown', 'cyan', 'gray', 'green', 'light_blue', 'light_gray', 'lime', 'magenta', 'orange', 'pink', 'purple', 'red', 'white', 'yellow']
    .reduce((a, d) => a.concat([d + '_stained_glass', d + '_stained_glass_pane']), []));
  ServerEvents.recipes(event => {
    if (Platform.isLoaded('chipped')) {
      let ing = CHIPPED_GLASS.map(t => ({ tag: 'chipped:' + t }));
      SETS.forEach(s => COLS.forEach(c => ing.push({ tag: groupTag(s, c) })));
      // v0.4.0 (D114 + D115): carved/clear ice group and the glowing-ornament groups (tags in chop_xmas_blocks_recipes.js)
      ing.push({ tag: 'chop:chipped/ice' });
      SETS.forEach(s => COLS.forEach(c => ing.push({ tag: 'chop:chipped/glowing_' + (c == '' ? 'silver' : c) + '_' + s.suf })));
      // v0.5.0: tree toppers swap group, only when the Festivity jar has them (no empty tag in the bench recipe)
      if (chopHasItem('festivity:topper_comet')) ing.push({ tag: 'festivity:tree_toppers' });
      event.remove({ id: 'chipped:glassblower' });
      event.custom({ type: 'chipped:workbench', ingredients: ing }).id('chipped:glassblower');
    }
    event.shaped(Item.of('chop:large_ornament', 8), ['GGG', 'GNG', 'GGG'], { G: 'minecraft:glass', N: 'minecraft:iron_nugget' }).id('chop:ornament/large_base');
    event.shaped(Item.of('chop:ornament', 2), ['N', 'P'], { N: 'minecraft:iron_nugget', P: 'minecraft:glass_pane' }).id('chop:ornament/small_base');
    SETS.forEach(s => {
      let O = '#' + s.tag;
      event.shaped(Item.of('chop:gold_' + s.suf, 8), ['OOO', 'ONO', 'OOO'], { O: O, N: 'minecraft:gold_nugget' }).id('chop:ornament/' + s.suf + '_gold');
      DYES.forEach(d => {
        let out = 'chop:' + d + '_' + s.suf;
        event.shaped(Item.of(out, 8), ['OOO', 'ODO', 'OOO'], { O: O, D: '#c:dyes/' + d }).id('chop:ornament/' + s.suf + '_' + d + '_8');
        event.shapeless(out, [O, '#c:dyes/' + d]).id('chop:ornament/' + s.suf + '_' + d + '_1');
      });
    });
  });
})();
