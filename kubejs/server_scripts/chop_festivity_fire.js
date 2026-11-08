// chop_festivity_fire.js  v0.1.2 (TEST only, PROPOSAL)  - synergy thread, for Festivity + Burnt
// Fire has no attacker, so Festivity never scores fire kills or burnt huts. This add-on remembers
// who lit fires (flint and steel, fire charge, lava bucket) and blames the most recent igniter nearby:
//   - a villager / MCA villager / colonist killed by fire or a fire-barrel blast with no player source
//       -> Festivity 'kill_villager' (-5) for the igniter ("a villager died in your fire")
//   - a colony hut the daily burnt-hut sweep finds burnt (chop_burnt_hut_repair.js calls ChopFireLog.hutBurnt)
//       -> Festivity 'explosion' (-3) once per hut per sweep ("set a colony building on fire")
// priority: 0   (must load after festivity.js, which is priority 50)
// Keys: fire_kill (-5) and arson (-3) from Festivity v0.2.9; falls back to kill_villager / explosion on older Festivity.
// Uses Festivity's own score() (its newcomer shield, caps and griefer brake apply). Igniter must be online.
// Not tracked (limits): Flint Bow arrows, Fire Barrels lit by arrows/redstone, lightning, spread from far away.
// Harmless lighting is ignored: campfires, candles, and anything lit farther than RADIUS from the damage.

// KubeJS 2101: getGameTime() may be hidden; level.time / level.gameTime are the bean forms
function chopGameTime(level) {
  try { return Number(level.getGameTime()); } catch (e) {}
  try { if (level.time !== undefined) return Number(level.time); } catch (e) {}
  try { return Number(level.gameTime); } catch (e) {}
  return 0;
}

const ChopFireLog = {
  RADIUS: 32,                 // blocks between the ignition and the death / hut
  DEATH_WINDOW: 12000,        // game ticks (10 real minutes) an ignition stays "hot" for deaths
  HUT_WINDOW: 72000,          // game ticks (1 real hour; ~2 Better Days days) for burnt huts
  MAX: 200,
  list: [],                   // { name, dim, x, y, z, t }
  add(player, pos) {
    this.list.push({ name: String(player.username), dim: String(player.level.dimension), x: pos.x, y: pos.y, z: pos.z, t: Number(chopGameTime(player.server.overworld())) });
    if (this.list.length > this.MAX) this.list.shift();
  },
  latestNear(server, dim, x, y, z, window) {
    let now = Number(chopGameTime(server.overworld())), r2 = this.RADIUS * this.RADIUS;
    for (let i = this.list.length - 1; i >= 0; i--) {
      let e = this.list[i];
      if (now - e.t > window) break;
      if (e.dim != dim) continue;
      let dx = e.x - x, dy = e.y - y, dz = e.z - z;
      if (dx * dx + dy * dy + dz * dz <= r2) return e;
    }
    return null;
  },
  blame(server, entry, key, reason) {
    if (!entry || typeof Fest == 'undefined') return;
    let p = null; for (let q of server.players) if (String(q.username) == entry.name) { p = q; break; }   // server.getPlayer aborts in 2101
    if (!p) return;                                   // offline: skip (Festivity ledgers need the player)
    let k = key;
    try { if (typeof FEST != 'undefined' && !FEST.ACTIONS[k]) k = (k == 'arson') ? 'explosion' : 'kill_villager'; } catch (e) {}
    try { Fest.score(server, p, k, 1, reason); } catch (e) { console.warn('[chop_fire] score failed: ' + e); }
  },
  // called by chop_burnt_hut_repair.js when it queues a repair for a burnt hut
  hutBurnt(server, dim, pos) {
    let e = this.latestNear(server, String(dim), pos.getX(), pos.getY(), pos.getZ(), this.HUT_WINDOW);
    this.blame(server, e, 'arson', 'arson');
  }
};

(function () {
const IGNITERS = ['minecraft:flint_and_steel', 'minecraft:fire_charge', 'minecraft:lava_bucket'];

BlockEvents.rightClicked(event => {
  let id = String(event.item.id);
  if (IGNITERS.indexOf(id) < 0) return;
  let b = String(event.block.id);
  if (b.indexOf('campfire') >= 0 || b.indexOf('candle') >= 0) return;   // relighting decor, not arson
  ChopFireLog.add(event.player, event.block.pos);
});

EntityEvents.death(event => {
  let e = event.entity, t = String(e.type);
  if (!(t.startsWith('minecolonies:') || t.startsWith('mca:') || t == 'minecraft:villager')) return;
  let src = event.source;
  if (src && src.player) return;                                         // Festivity already scores player kills
  let fiery = false;
  try {
    let DTT = Java.loadClass('net.minecraft.tags.DamageTypeTags');
    fiery = src.is(DTT.IS_FIRE) || src.is(DTT.IS_EXPLOSION);
  } catch (x) { fiery = false; }
  if (!fiery) return;
  let server = e.server;
  let entry = ChopFireLog.latestNear(server, String(e.level.dimension), e.x, e.y, e.z, ChopFireLog.DEATH_WINDOW);
  ChopFireLog.blame(server, entry, 'fire_kill', 'fire kill');
});

})();
