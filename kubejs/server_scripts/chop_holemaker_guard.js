// chop_holemaker_guard.js v0.1.0 - Hole Maker fizzles inside or aimed into a MineColonies colony
(function () {
  var HOLE_MAKER = 'hole_filler_mod:throwable_hole_maker';
  var CM = Java.loadClass('com.minecolonies.api.colony.IColonyManager');
  var inColony = function (level, pos) { try { return CM.getInstance().isCoordinateInAnyColony(level, pos); } catch (e) { console.warn('[HoleMakerGuard] check failed: ' + e); return false; } };
  ItemEvents.rightClicked(HOLE_MAKER, function (event) {
    var p = event.player;
    var hit = p.rayTrace(64, false);
    var target = (hit && hit.block) ? hit.block.pos : null;
    if (!inColony(event.level, p.blockPosition()) && !(target && inColony(event.level, target))) return;
    p.setStatusMessage(Text.red('The Hole Maker fizzles near a colony.'));
    event.cancel();
  });
  console.info('[HoleMakerGuard] v0.1.0 loaded for ' + HOLE_MAKER);
})();
