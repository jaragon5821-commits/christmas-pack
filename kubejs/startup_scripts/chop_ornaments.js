// chop_ornaments.js v0.4.0 (Scripts thread, 2026-11-10; v0.3.0 2026-11-05) - startup script: needs a FULL game restart.
// Festivity ornaments, two sets (boss: "Large Ornaments" + small lantern-style ornaments):
//   LARGE: full-size cubes (glossy sides with a gold band, cap + hook drawn on top). They replace gold/iron/raw ore
//          blocks in the Christmas structures, so builds can't be stripped for free metal.
//          chop:large_ornament (silver), chop:gold_large_ornament, chop:<dye>_large_ornament (16 dyes)
//   SMALL: lantern-sized ball with a cap and hook. Stands on a block, or HANGS when placed against a ceiling
//          (blockstate hanging=true, like a lantern). Gives NO light.
//          chop:ornament (silver), chop:gold_ornament, chop:<dye>_ornament (16 dyes)
// Textures/models/blockstates are explicit files in kubejs/assets/chop (Assets kettle v2 lesson: nothing generated here).
const CHOP_ORN_COLORS = ['', 'gold', 'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
function chopOrnName(c) {
  if (c == '') return 'Silver';
  return c.split('_').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
}
// v0.3.0 (boss): 8 real-life ornament styles per colour, swapped at Chipped's Glassblower:
//   chop:<c>_<style>_large_ornament / chop:<c>_<style>_ornament (silver: chop:<style>_large_ornament)
const CHOP_ORN_STYLES = ['', 'striped', 'snowflake', 'glitter', 'ribbed', 'mercury', 'faceted', 'jeweled', 'painted'];
const CHOP_ORN_STYLE_NAMES = { striped: 'Candy Stripe', snowflake: 'Snowflake', glitter: 'Glitter', ribbed: 'Ribbed', mercury: 'Mercury Glass', faceted: 'Faceted', jeweled: 'Jeweled', painted: 'Painted Scene' };
const ChopBSP = Java.loadClass('net.minecraft.world.level.block.state.properties.BlockStateProperties');
const ChopHanging = ChopBSP.HANGING;
// v0.4.0 (boss 11-10): small ornaments mount on a wall bracket when placed against a wall side.
//   attached=true + facing = side the WALL is on (opposite of the clicked face). Model chop:block/<name>_wall.
const ChopAttached = ChopBSP.ATTACHED;
const ChopFacing = ChopBSP.HORIZONTAL_FACING;
const ChopDir = Java.loadClass('net.minecraft.core.Direction');
function chopOrnPlace(e) {
  var f = String(e.clickedFace);
  var side = (f == 'north' || f == 'south' || f == 'east' || f == 'west');
  e.set(ChopHanging, f == 'down');
  e.set(ChopAttached, side);
  e.set(ChopFacing, side ? e.clickedFace.getOpposite() : ChopDir.NORTH);
}

StartupEvents.registry('block', event => {
  CHOP_ORN_COLORS.forEach(c => {
    CHOP_ORN_STYLES.forEach(st => {
      let pre = (c == '' ? '' : c + '_') + (st == '' ? '' : st + '_');
      let nm = chopOrnName(c) + (st == '' ? '' : ' ' + CHOP_ORN_STYLE_NAMES[st]);
      event.create('chop:' + pre + 'large_ornament')
        .displayName('Large ' + nm + ' Ornament')
        .soundType('glass')
        .hardness(0.6)
        .resistance(1.0);
      event.create('chop:' + pre + 'ornament')
        .displayName(nm + ' Ornament')
        .soundType('lantern')
        .hardness(0.5)
        .resistance(1.0)
        .notSolid()
        .box(4, 0, 4, 12, 16, 12, true)
        .property(ChopHanging)
        .property(ChopAttached)
        .property(ChopFacing)
        .defaultState(s => s.set(ChopHanging, false).set(ChopAttached, false).set(ChopFacing, ChopDir.NORTH))
        .placementState(e => chopOrnPlace(e));
    });
  });
});
