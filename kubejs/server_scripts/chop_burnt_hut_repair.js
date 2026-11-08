// chop_burnt_hut_repair.js  v0.1.8 (TEST only)  - Chop's Christmas pack, synergy thread
// Josh (2026-11-02): fire may burn colony huts down fully; once per in-game day the colony
// queues a normal MineColonies REPAIR work order (same as the hut's Repair button) for every
// hut that holds burnt blocks, so builders come and rebuild it from the blueprint.
//
// Needs: Burnt + Additions, MineColonies 1405, Colony Autopilot set to
//   tweaks.disableFireTick=false (fire spreads) and autoRepairDamage=false (burnt shells stay
//   until the builders come; otherwise Autopilot instantly refills burnt-away holes).
// How it works:
//   - On each new in-game day (overworld dayTime / 24000), start one sweep.
//   - The sweep walks every active colony's built huts, BUDGET blocks per tick (no lag spike).
//   - Hut with flames inside -> skipped this sweep. Only smouldering/blazing blocks -> skipped once,
//     repaired on the next sweep if they are still there.
//   - Hut with >= MIN_BURNT burnt blocks -> building.requestRepair(BlockPos.ZERO).
//     MineColonies itself refuses a duplicate order for the same hut, and a builder claims it.
//   - Only loaded huts are scanned. Nothing is written to chat (clean-join rule); log lines only.
// v0.1.8: explosions too (Stalker Creepers etc.). A hut that loses >= MIN_BOOM blocks to an explosion gets a
//   repair order on the next daily sweep (Autopilot's own free hole-repair is off for Burnt). No Festivity blame here.
// Op test command: /chopburnt scan  (start a sweep now)   /chopburnt status

// v0.1.5: wrapped in an IIFE - KubeJS 2101 server scripts share one scope (ColonyManager clash).
(function () {
const CBR = {
  // ids from the build thread's jar read (build/burnt/burnt_blockids.txt): mods burnt (422 blocks) + burnt_additions (77)
  BURNT_NAMESPACES: ['burnt', 'burnt_additions'],
  // not damage: barrels, flags, gadgets, flares, volcano/nether blocks, crafted soul-tempered wood
  EXCLUDE: [/_flag$/, /^fire_barrel/, /^blaze_barrel/, /^tar_barrel$/, /^tar_cauldron$/, /^smoke_detector$/,
            /^burnt_envelope$/, /^hand_flare_/, /^sulphur_/, /^geyser_water$/, /^splash$/, /^soul_tempered_/, /^soul_ice/,
            /^nether_weave$/, /^pitch_block$/, /^hot_basalt$/, /^liquid_magma$/, /^fragile_magma$/, /^eruption_block$/, /^tar_fluid$/,
            // ground cover: hut corners include the yard; builders may not re-place terrain, so this would re-order repairs daily
            /grass/, /dirt/, /mycelium/, /^soot_block$/],
  // real flames: hut is skipped this sweep
  FLAMES: [/^firestarter$/, /^blast_leaves$/, /_fire(_\d+)?$/, /^[a-z_]*fire_\d+$/, /flames/, /fire_set_block$/, /^flaming_/],   // copper/wood/stairs/grass/soul/devil fire + flames
  // mid-burn (smouldering/blazing): skipped once; if a hut shows ONLY these on two sweeps in a row, repair anyway
  MID_BURN: [/^blazing_/, /^broken_blazing_/, /^smoldering_/, /^small_smoldering_/, /^burning_/],
  // everything else in those namespaces = burnt damage (burnt_*, ember_*, sooty_*, broken_*, burnt campfires, burnt leaves ...)
  FIRE_IDS: ['minecraft:fire', 'minecraft:soul_fire'],
  MIN_BURNT: 3,                         // ignore a stray block or two
  MIN_BOOM: 3,                          // blocks a hut must lose to one explosion before it counts
  BUDGET: 2048,                         // block reads per tick
  LOG: true
};

if (!(Platform.isLoaded('minecolonies') && Platform.isLoaded('burnt'))) return;
  let ColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager');
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  let BlockPos = Java.loadClass('net.minecraft.core.BlockPos');
  let MutablePos = Java.loadClass('net.minecraft.core.BlockPos$MutableBlockPos');

  let cbr = { lastDay: -1, queue: null, cur: null, stats: null, lastResult: 'no sweep yet' };
  let classCache = {};   // block id -> 0 normal, 1 burnt damage, 2 flames, 3 mid-burn
  let midBurnSeen = {};  // hut id -> true if last sweep skipped it only for mid-burn blocks
  let arsonDone = {};    // hut id -> true once its current burn has been blamed
  let boomed = {};       // hut id -> blocks lost to explosions since the last repair order (v0.1.8)

  function anyMatch(list, path) { for (let r of list) if (r.test(path)) return true; return false; }
  function classify(state) {
    let id = String(BuiltInRegistries.BLOCK.getKey(state.getBlock()));
    let c = classCache[id];
    if (c !== undefined) return c;
    c = 0;
    if (CBR.FIRE_IDS.indexOf(id) >= 0) c = 2;
    else {
      let i = id.indexOf(':'), ns = id.substring(0, i), path = id.substring(i + 1);
      if (CBR.BURNT_NAMESPACES.indexOf(ns) >= 0) {
        if (anyMatch(CBR.FLAMES, path)) c = 2;                 // flames first (grass fires are flames, not ground)
        else if (anyMatch(CBR.EXCLUDE, path)) c = 0;
        else if (anyMatch(CBR.MID_BURN, path)) c = 3;
        else c = 1;
      }
    }
    classCache[id] = c;
    return c;
  }

  // KubeJS 2101 may hide getDayTime(); try the bean property too
  function cbrDayTime(level) {
    try { return Number(level.getDayTime()); } catch (e) {}
    try { return Number(level.dayTime); } catch (e) {}
    return 0;
  }

  function log(msg) { if (CBR.LOG) console.info('[chop_burnt] ' + msg); }

  function startSweep(server, why) {
    let list = [];
    try {
      for (let colony of ColonyManager.getInstance().getAllColonies()) {
        if (!colony.isActive()) continue;
        let level = colony.getWorld(); if (!level) continue;
        for (let b of colony.getServerBuildingManager().getBuildings().values()) {
          if (b.getBuildingLevel() < 1 || b.isDeconstructed()) continue;
          list.push({ colony: colony, level: level, b: b });
        }
      }
    } catch (e) { log('could not list huts: ' + e); return; }
    cbr.queue = list; cbr.cur = null;
    cbr.stats = { huts: list.length, scanned: 0, burning: 0, unloaded: 0, repairs: 0, pending: 0, refused: 0 };
    log('sweep started (' + why + '), ' + list.length + ' huts');
  }

  function openHut(item) {
    let t = item.b.getCorners(), a = t.getA(), c = t.getB();
    let x0 = Math.min(a.getX(), c.getX()), x1 = Math.max(a.getX(), c.getX());
    let y0 = Math.min(a.getY(), c.getY()), y1 = Math.max(a.getY(), c.getY());
    let z0 = Math.min(a.getZ(), c.getZ()), z1 = Math.max(a.getZ(), c.getZ());
    if (!item.level.isLoaded(new BlockPos(x0, y0, z0)) || !item.level.isLoaded(new BlockPos(x1, y0, z1))) return null;
    return { item: item, x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, x: x0, y: y0, z: z0, burnt: 0, mid: 0, fire: false, pos: new MutablePos() };
  }

  function finishHut(h) {
    cbr.stats.scanned++;
    let key = String(h.item.colony.getID()) + '@' + String(h.item.b.getID());
    if (h.fire) { cbr.stats.burning++; midBurnSeen[key] = false; return; }
    if (h.mid > 0) {
      if (!midBurnSeen[key]) { midBurnSeen[key] = true; cbr.stats.burning++; return; }   // still smouldering: wait one more day
      // smouldering blocks unchanged for a whole day (e.g. fire tick off): treat them as damage
    }
    midBurnSeen[key] = false;
    let dmg = h.burnt + h.mid;
    // modded wood (Domum Ornamentum, Macaw, Handcrafted...) has no burnt variant: vanilla fire just deletes it.
    // So a hut near a recorded ignition (chop_festivity_fire.js) gets a repair order even with few burnt blocks.
    let lvl = h.item.level, srv = lvl.server, dim = String(lvl.dimension);   // KubeJS 2101: .dimension / .server are properties
    let nearFire = false;
    if (dmg < CBR.MIN_BURNT && typeof ChopFireLog != 'undefined') {
      try {
        let id = h.item.b.getID();
        nearFire = !!ChopFireLog.latestNear(srv, dim, id.getX(), id.getY(), id.getZ(), ChopFireLog.HUT_WINDOW);
      } catch (e) { nearFire = false; }
    }
    let boom = boomed[key] || 0;
    let burnt = dmg >= CBR.MIN_BURNT || nearFire;
    if (!burnt && boom < CBR.MIN_BOOM) { arsonDone[key] = false; return; }
    let what = h.item.b.getSchematicName() + ' at ' + h.item.b.getID();
    if (boom > 0) delete boomed[key];
    // arson: blame once per burnt episode, whether or not a new order can be queued (never for explosion-only damage)
    if (burnt && !arsonDone[key] && typeof ChopFireLog != 'undefined') {
      arsonDone[key] = true;
      try { ChopFireLog.hutBurnt(srv, dim, h.item.b.getID()); } catch (e) { log('arson check failed: ' + e); }
    }
    // MineColonies silently refuses a second order for the same hut (e.g. Autopilot's upgrade), so look first
    if (hasOrder(h.item.colony, h.item.b.getID())) { cbr.stats.pending++; log('colony ' + h.item.colony.getID() + ': skipped ' + what + ': order pending'); return; }
    try {
      h.item.b.requestRepair(BlockPos.ZERO);
      if (hasOrder(h.item.colony, h.item.b.getID())) {
        cbr.stats.repairs++;
        log('colony ' + h.item.colony.getID() + ': repair queued for ' + what + ' (' + h.burnt + ' burnt, ' + h.mid + ' smouldering' + (nearFire ? ', near a recent fire' : '') + (boom > 0 ? ', ' + boom + ' blocks blown up' : '') + ')');
      } else {
        cbr.stats.refused++;
        log('colony ' + h.item.colony.getID() + ': repair NOT queued for ' + what + ' (MineColonies refused: builder level, range or deconstructed?)');
      }
    } catch (e) { log('repair request failed at ' + what + ': ' + e); }
  }

  function hasOrder(colony, pos) {
    try {
      for (let wo of colony.getWorkManager().getWorkOrders().values()) {
        if (wo.getLocation().equals(pos)) return true;
      }
    } catch (e) { log('work order check failed: ' + e); }
    return false;
  }

  // walk the current hut box, BUDGET reads per tick
  function step() {
    let budget = CBR.BUDGET;
    while (budget > 0) {
      if (!cbr.cur) {
        if (!cbr.queue || cbr.queue.length == 0) {
          if (cbr.queue) {
            let s = cbr.stats;
            cbr.lastResult = s.scanned + '/' + s.huts + ' huts scanned, ' + s.burning + ' still burning, ' + s.unloaded + ' unloaded, ' + s.repairs + ' repairs queued, ' + s.pending + ' already had an order, ' + s.refused + ' refused';
            log('sweep done: ' + cbr.lastResult);
          }
          cbr.queue = null; return;
        }
        let next = cbr.queue.shift();
        let h = null; try { h = openHut(next); } catch (e) { h = null; }
        if (!h) { cbr.stats.unloaded++; continue; }
        cbr.cur = h;
      }
      let h = cbr.cur;
      h.pos.set(h.x, h.y, h.z);
      let k = classify(h.item.level.getBlockState(h.pos));
      if (k == 1) h.burnt++;
      else if (k == 2) h.fire = true;
      else if (k == 3) h.mid++;
      budget--;
      // advance x -> z -> y; stop early once fire is found (hut skipped anyway)
      let done = h.fire;
      if (!done) {
        h.x++;
        if (h.x > h.x1) { h.x = h.x0; h.z++; if (h.z > h.z1) { h.z = h.z0; h.y++; if (h.y > h.y1) done = true; } }
      }
      if (done) { finishHut(h); cbr.cur = null; }
    }
  }

  ServerEvents.tick(event => {
    let server = event.server;
    if (cbr.queue) { step(); return; }
    if (server.tickCount % 100 != 0) return;               // day check every 5 s
    let day = Math.floor(cbrDayTime(server.overworld()) / 24000);
    if (cbr.lastDay < 0) { cbr.lastDay = day; return; }     // no sweep on world load
    if (day != cbr.lastDay) { cbr.lastDay = day; startSweep(server, 'new day ' + day); }
  });

  // v0.1.8: remember huts damaged by explosions (creepers, TNT, fire barrels); repaired on the next sweep
  function boxOf(b) {
    let t = b.getCorners(), a = t.getA(), c = t.getB();
    return [Math.min(a.getX(), c.getX()), Math.max(a.getX(), c.getX()), Math.min(a.getY(), c.getY()), Math.max(a.getY(), c.getY()), Math.min(a.getZ(), c.getZ()), Math.max(a.getZ(), c.getZ())];
  }
  LevelEvents.afterExplosion(event => {
    let blocks = null;
    try { blocks = event.affectedBlocks; } catch (e) {}
    try { if (!blocks) blocks = event.getAffectedBlocks(); } catch (e) {}
    if (!blocks || blocks.size() == 0) return;
    let dim = String(event.level.dimension);
    try {
      for (let colony of ColonyManager.getInstance().getAllColonies()) {
        if (!colony.isActive() || !colony.getWorld() || String(colony.getWorld().dimension) != dim) continue;
        for (let b of colony.getServerBuildingManager().getBuildings().values()) {
          if (b.getBuildingLevel() < 1 || b.isDeconstructed()) continue;
          let box = boxOf(b), n = 0;
          for (let blk of blocks) {
            let p = blk.pos ? blk.pos : blk;      // KubeJS BlockContainerJS or BlockPos
            let x = p.x, y = p.y, z = p.z;
            if (x >= box[0] && x <= box[1] && y >= box[2] && y <= box[3] && z >= box[4] && z <= box[5]) n++;
          }
          if (n == 0) continue;
          let key = String(colony.getID()) + '@' + String(b.getID());
          boomed[key] = (boomed[key] || 0) + n;
          log('colony ' + colony.getID() + ': explosion took ' + n + ' blocks from ' + b.getSchematicName() + ' at ' + b.getID());
        }
      }
    } catch (e) { log('explosion check failed: ' + e); }
  });

  ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event;
    event.register(Commands.literal('chopburnt').requires(s => s.hasPermission(2))
      .then(Commands.literal('scan').executes(ctx => { startSweep(ctx.source.server, 'command'); ctx.source.sendSystemMessage(Text.of('chop_burnt: sweep started')); return 1; }))
      .then(Commands.literal('status').executes(ctx => { ctx.source.sendSystemMessage(Text.of('chop_burnt: ' + (cbr.queue ? 'sweeping, ' + cbr.queue.length + ' huts left' : cbr.lastResult))); return 1; })));
  });

})();
