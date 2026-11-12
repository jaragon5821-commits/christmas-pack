// priority: 28
// FESTIVITY PHASE 4 (DRAFT v11, 2026-11-08: quality pass - reindeer-sighting cleanup no longer kills tamed reindeer, thief drop coords,
// secret santa capped, hunt elves hatless, no stall-steer with the jar, LOG off; v10 2026-11-06) - the EVENT POOL Josh picked (EVENTS_BRAINSTORM.md, all but 21),
// staged Claws Outpost / Claws Spire templates (Assets structures v17c), Santy Claws smashing doors + glass,
// FREED ELVES (Josh 05:47 UTC 11-06): breaking the Cursed Star frees up to 2 nearby Sour Elves (allay 'Freed Elf', gift, fly off).
// Needs festivity.js 0.2.10+, festivity_phase2.js, festivity_phase3.js (presentItem, startLetter, anchor), loot draft4.
// Villager safety: nothing here touches villagers or colonists; every mob is a tagged minion; no block damage to builds
// except Santy Claws on doors/trapdoors/gates/glass (Josh 2026-11-06 02:17) and the melting black-ice patch.

const P4 = {
  NIGHT_CHANCE_LOW: 0.6,       // chance of ONE event per night at <=49
  NIGHT_CHANCE_HIGH: 0.4,      // chance per night at >=60
  NIGHT_CHANCE_QUIET: 0.2,     // 50-59: mild events only
  ADVENT: true,                // real-calendar Dec 1-24: an event every dusk, guaranteed
  OUTPOST_AT: 30, OUTPOST_W: 35,       // weight (of 100) for the Outpost roll when none stands and value <= OUTPOST_AT
  SPIRE_AT: 39, SPIRE_W: 20, SPIRE_MAX: 2,
  STRUCT_MIN: 48, STRUCT_MAX: 128,      // blocks from the anchor player
  OUTPOST_TPL: 'chop:event/claws_outpost_s', OUTPOST_CORE: [[7, 1, 7], [7, 1, 7], [7, 11, 7]], OUTPOST_SIZE: 15,
  SPIRE_TPL: 'chop:event/claws_spire_s', SPIRE_CORE: [[5, 1, 5], [5, 1, 5], [5, 1, 5]], SPIRE_SIZE: 11,
  BOOBY_DAMAGE: 8,                // mystery present burst damage (half hearts)
  HUNT_RANGE: 1000, HUNT_GNOMES: 4, HUNT_ELVES: 2, HUNT_DIST: 20,   // (Josh 05:08) stage 2+ outpost sends a hunting band after one player per night
  OUTPOST_CAP: 14,              // (Build round 5: 30 tagged mobs sat at a stage-3 outpost) no periodic outpost spawns while this many minions are within 32
  FREED_ELVES: 2, FREED_TICKS: 240,   // (Josh 05:47) Sour Elves within 48 of a broken Cursed Star become Freed Elves (invulnerable allays) for 12 s, then leave a gift
  CLAWS_SMASH: true,           // Santy Claws breaks doors, trapdoors, fence gates and glass between him and his target
  CANDY: ['snowyspirit:candy_cane', 'seasonsgreetings:candy_cane', 'festive_delight:candy_cane', 'minecraft:cookie'].map((typeof chopMigOr == 'function' ? chopMigOr : (x => x))),   // 11-12 migration
  COCOA: ['festive_delight:hot_cocoa', 'farm_and_charm:hot_cocoa', 'candlelight:hot_cocoa', 'bakery:hot_cocoa', 'minecraft:mushroom_stew'].map((typeof chopMigOr == 'function' ? chopMigOr : (x => x))),   // 11-12 migration
  SECRET_CAP: 4,                // (v11) Secret Santa: at most this much Festivity per event (+2 per credited gift -> 2 gifts), no uncapped source
  LOG: false, DEBUG_CMDS: false // both false for promotion (v11). LOG true = [Festivity4] console diagnostics, DEBUG_CMDS true = non-silent commands
};
const E4 = Fest;
function e4cmd(server, s) { if (P4.DEBUG_CMDS) { try { return server.runCommand(s); } catch (e) { console.warn('[Festivity] e4cmd fallback: ' + e); } } return E4.cmd(server, s); }
function e4log(s) { if (P4.LOG) console.log('[Festivity4] ' + s); }
function e4json(server, key, fb) { return E4.readJson(server, key, fb); }
function e4save(server, key, obj) { E4.data(server).putString(key, JSON.stringify(obj)); }
function e4night(server) { let t = E4.dayTime(server) % 24000; return t >= 13000 && t <= 23000; }
function e4rnd(a, b) { return a + Math.random() * (b - a); }
function e4over(p) { try { return String(p.level.dimension) == 'minecraft:overworld'; } catch (e) { return true; } }
function e4players(server) { let out = []; for (let p of E4.online(server)) if (e4over(p)) out.push(p); return out; }
function e4pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function e4surface(level, x, z) { return surfaceY(level, x, z); }          // Phase 2 helper (shared scope)
function e4first(ids) { for (let id of ids) { try { if (Item.exists(id)) return id; } catch (e) {} } return ids[ids.length - 1]; }
function e4text(server, t, c) { E4.announce(server, t, c || 'gold'); }
function e4title(server, a, b, c) { e4cmd(server, 'title @a title ' + E4.jsonText(a, c || 'dark_red')); if (b) e4cmd(server, 'title @a subtitle ' + E4.jsonText(b, 'gray')); }
function e4spot(server, minR, maxR) {
  let ps = e4players(server); if (!ps.length) return null;
  let a = e4pick(ps), ang = Math.random() * Math.PI * 2, r = e4rnd(minR, maxR);
  let x = Math.floor(a.x + Math.cos(ang) * r), z = Math.floor(a.z + Math.sin(ang) * r);
  return { x: x, z: z, y: e4surface(server.overworld(), x, z), player: a };
}
function e4dry(server, x, y, z, size) {
  // reject water / big slopes under a template footprint (4 corner probes + centre)
  let lvl = server.overworld(), ys = [], pts = [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1], [Math.floor(size / 2), Math.floor(size / 2)]];
  for (let q of pts) {
    let yy = e4surface(lvl, x + q[0], z + q[1]); ys.push(yy);
    try { let b = lvl.getBlock(x + q[0], yy - 1, z + q[1]); if (b.id.includes('water') || b.id.includes('ice') || b.id.includes('lava')) return false; } catch (e) {}
  }
  return Math.max.apply(null, ys) - Math.min.apply(null, ys) <= 4;
}
// ---- placement safeguards (Josh 2026-11-06 02:41): never over other structures, colonies or player builds ----
// 1) no villager / colonist / MCA / golem / tamed pet within SAFE_ENTITY_R (colonies, villages, homes)
// 2) MineColonies API when reachable: not inside any colony claim
// 3) chunk structure references (any generated structure touching the footprint chunks + 1 chunk margin) -> reject
// 4) block scan of footprint + SAFE_MARGIN, 2 below to 10 above the surface: any BUILT block (denylist) -> reject;
//    also dry (no water/lava/ice under the footprint) and height spread <= 5
// 5) stage upgrades re-scan the margin ring; a new build next door freezes the structure at its stage
P4.SAFE_MARGIN = 8; P4.SAFE_ENTITY_R = 64; P4.SAFE_DEPTH = 2; P4.SAFE_HEIGHT = 10;
var E4_BUILT = /planks|brick|fence|wall$|gate|door|glass|pane|wool|carpet|bed$|chest|barrel|crafting|furnace|smoker|torch|lantern|lamp|rail|stairs|slab|concrete|glazed|cobblestone|path|polished|smooth_|cut_|chiseled|pillar|bookshelf|table|anvil|bell$|campfire|candle|banner|sign|button|pressure_plate|lever|hopper|dispenser|dropper|observer|piston|redstone|iron_block|gold_block|diamond_block|emerald_block|netherite|loom|composter|cauldron|lectern|jukebox|note_block|beacon|scaffolding|ladder|hay_block|bale|present|ornament|gift|stocking|wreath|garland|christmas|decor|chop:|supplementaries:|fairylights|minecolonies:|mcwholidays|mcw|structurize|domum|candlelight:|farm_and_charm:|bakery:|hearth|furniture|spawner|lodestone|soul_soil|blackstone|nether_bricks|quartz|prismarine|purpur|end_stone_bricks|mud_bricks|packed_mud|tnt|rail|minecart|boat/;
var e4_colonyApi = null, e4_colonyApiTried = false;
function e4inColony(server, x, y, z) {
  if (!e4_colonyApiTried) { e4_colonyApiTried = true; try { e4_colonyApi = Java.loadClass('com.minecolonies.api.colony.IColonyManager').getInstance(); e4log('MineColonies colony API reachable'); } catch (e) { e4log('MineColonies colony API not reachable from KubeJS (' + e + '); using entity + block + chunk checks'); } }
  if (!e4_colonyApi) return false;
  try { return !!e4_colonyApi.isCoordinateInAnyColony(server.overworld(), BlockPos(x, y, z)); } catch (e) { return false; }
}
function e4chunkHasStructure(lvl, x, z) {
  try { let refs = lvl.getChunk(x >> 4, z >> 4).getAllReferences(); return refs && !refs.isEmpty(); } catch (e) { return false; }
}
// scans columns [x1..x2] x [z1..z2]; skip = inner box to leave out (ring scan) or null. Returns a reason string or null.
function e4scanBuilt(lvl, x1, z1, x2, z2, skip, dryBox) {
  let ys = [];
  for (let px = x1; px <= x2; px++) for (let pz = z1; pz <= z2; pz++) {
    if (skip && px >= skip.x1 && px <= skip.x2 && pz >= skip.z1 && pz <= skip.z2) continue;
    let sy = e4surface(lvl, px, pz); ys.push(sy);
    for (let dy = -P4.SAFE_DEPTH; dy <= P4.SAFE_HEIGHT; dy++) {
      let id = '';
      try { id = String(lvl.getBlock(px, sy + dy, pz).id); } catch (e) { continue; }
      if (dy < 0 && id == 'minecraft:air') continue;
      if (E4_BUILT.test(id)) return 'built block ' + id + ' at ' + px + ' ' + (sy + dy) + ' ' + pz;
      if (dy == -1 && dryBox && px >= dryBox.x1 && px <= dryBox.x2 && pz >= dryBox.z1 && pz <= dryBox.z2 && (id.includes('water') || id.includes('lava') || id.includes('ice'))) return 'wet ground at ' + px + ' ' + pz;
    }
  }
  if (ys.length && Math.max.apply(null, ys) - Math.min.apply(null, ys) > 5) return 'too steep';
  return null;
}
function e4safe(server, x, y, z, size) {
  let lvl = server.overworld(), m = P4.SAFE_MARGIN, cx = x + Math.floor(size / 2), cz = z + Math.floor(size / 2);
  try {
    let r = P4.SAFE_ENTITY_R;
    for (let e of lvl.getEntitiesWithin(AABB.of(cx - r, y - 32, cz - r, cx + r, y + 48, cz + r))) {
      let t = String(e.type), tame = false; try { tame = !!(e.isTame && e.isTame()); } catch (q) {}
      if (t.includes('minecolonies:') || t.includes('villager') || t.includes('mca:') || t.includes('iron_golem') || tame) { e4log('spot rejected: ' + t + ' within ' + r); return false; }
    }
  } catch (e) {}
  if (e4inColony(server, cx, y, cz)) { e4log('spot rejected: inside a colony claim'); return false; }
  for (let qx = x - 16; qx <= x + size + 16; qx += 16) for (let qz = z - 16; qz <= z + size + 16; qz += 16) if (e4chunkHasStructure(lvl, qx, qz)) { e4log('spot rejected: generated structure in chunk ' + (qx >> 4) + ',' + (qz >> 4)); return false; }
  let why = e4scanBuilt(lvl, x - m, z - m, x + size - 1 + m, z + size - 1 + m, null, { x1: x, z1: z, x2: x + size - 1, z2: z + size - 1 });
  if (why) { e4log('spot rejected: ' + why); return false; }
  return true;
}
function e4ringSafe(server, x, z, size) {   // before a stage upgrade: only the margin ring around the structure
  let m = P4.SAFE_MARGIN, lvl = server.overworld();
  let why = e4scanBuilt(lvl, x - m, z - m, x + size - 1 + m, z + size - 1 + m, { x1: x - 1, z1: z - 1, x2: x + size, z2: z + size }, null);
  if (why && why != 'too steep') { e4log('stage frozen: ' + why); return false; }
  return true;
}
function e4place(server, tpl, x, y, z) { e4cmd(server, 'place template ' + tpl + ' ' + x + ' ' + y + ' ' + z); }
function e4star(server, x, y, z, tag) {
  e4cmd(server, 'setblock ' + x + ' ' + y + ' ' + z + ' minecraft:spawner{SpawnData:{entity:{id:"' + fid('minecraft:endermite') + '",Tags:["fest_minion","' + tag + '"]}},MinSpawnDelay:300,MaxSpawnDelay:600,SpawnCount:2,MaxNearbyEntities:6,RequiredPlayerRange:24,SpawnRange:4}');
}

// (Josh 2026-11-06 05:20) targeting rotation: naughtiest first, but nobody is picked twice until every candidate has had a turn.
// key = persistent list of usernames already picked in this cycle; resets when all current candidates are in it.
// (F4, Josh-approved 2026-11-09) Festivity jar 0.9.18 mirrors fest_naughty <player> (x10, naughty minus nice). Claws spawns, hound packs and
// outpost hunts all pick through e4rotate, so the naughtier player (ledger bad score + fest_naughty/10, nice balance ignored below 0) goes first.
// The rotation still gives everyone a turn. Reads without creating a score.
function e4naughty(server, p) {
  try {
    let sb = server.scoreboard; if (!sb) return 0;
    let obj = sb.getObjective('fest_naughty'); if (!obj) return 0;
    let info = sb.getPlayerScoreInfo(p, obj); if (info == null) return 0;
    return Math.max(0, Number(info.value()) / 10);
  } catch (e) { return 0; }
}
function e4bad(server, p) { let b = 0; try { b = E4.badScore(E4.ledgerOf(server, p).me); } catch (e) {} return b + e4naughty(server, p); }
function e4rotate(server, key, cands) {
  if (!cands.length) return null;
  let done = e4json(server, key, []), left = cands.filter(p => done.indexOf(p.username) < 0);
  if (!left.length) { done = []; left = cands.slice(); }
  let best = null, score = -1;
  for (let p of left) { let sc = e4bad(server, p) + Math.random() * 0.01; if (sc > score) { score = sc; best = p; } }
  done.push(best.username); e4save(server, key, done);
  return best;
}

// ================= EVENT POOL =================
// each: { id, name, bands: ['low'|'high'|'quiet'], w: weight, start(server) -> state object or null, end(server, st) }
var E4_POOL = {};
function e4def(id, name, bands, w, start, end) { E4_POOL[id] = { id: id, name: name, bands: bands, w: w, start: start, end: end }; }

// 1 (Josh) sudden storm
e4def('storm', 'Sudden Storm', ['low'], 12, server => {
  e4cmd(server, 'weather rain 7000');   // 0.9.36: no winter thunder (natural bolts can hit villagers)
  let s = e4spot(server, 20, 30);
  if (s) { summon(server, 'minecraft:wolf', s.x, s.y, s.z, 'Frost Hound', 'fest_t3 fest_hound fest_e4', '{AngerTime:999999}'); summon(server, 'minecraft:wolf', s.x + 2, s.y, s.z, 'Frost Hound', 'fest_t3 fest_hound fest_e4', '{AngerTime:999999}'); }
  for (let i = 0; i < 4; i++) server.scheduleInTicks(40 + i * 60, () => { let q = e4spot(server, 15, 25); if (q) e4cmd(server, 'festivity flash ' + q.x + ' ' + (q.y + 25) + ' ' + q.z); });   // 0.9.36: visual-only flash, no fire/damage/witch   // high in the air: flash + thunder, no fire
  e4cmd(server, 'playsound minecraft:entity.wolf.howl master @a ~ ~ ~ 1 0.6');
  e4title(server, 'A storm rolls in', 'Santy Claws stirs the sky. Stay by the fire.');
  return { weather: true };
}, (server, st) => { e4cmd(server, 'weather clear 6000'); });

// 2 (Josh) mystery present: a tempting present appears beside a player. Opening it gives a treat, coal, or a burst
//   (hurts + knocks, NO block damage). Odds depend on the band. Untouched by dawn: it vanishes.
e4def('booby', 'Mystery Present', ['low', 'quiet', 'high'], 12, server => {
  let s = e4spot(server, 3, 6); if (!s) return null;
  let id = presentItem(), v = E4.value(server);
  let odds = v <= 49 ? { treat: 25, coal: 35, boom: 40 } : v >= 60 ? { treat: 60, coal: 25, boom: 15 } : { treat: 40, coal: 35, boom: 25 };
  e4cmd(server, 'setblock ' + s.x + ' ' + s.y + ' ' + s.z + ' ' + id);
  e4cmd(server, 'particle minecraft:end_rod ' + s.x + ' ' + (s.y + 1) + ' ' + s.z + ' 0.3 0.3 0.3 0.02 30 force');
  e4cmd(server, 'playsound minecraft:block.note_block.bell master ' + s.player.username + ' ' + s.x + ' ' + s.y + ' ' + s.z + ' 1 1.5');
  e4save(server, 'p4_booby', { x: s.x, y: s.y, z: s.z, id: id, odds: odds });
  e4cmd(server, 'tellraw ' + s.player.username + ' ' + E4.jsonText('A present. Just sitting there. For you?', 'gold'));
  return { x: s.x, y: s.y, z: s.z };
}, (server, st) => { let b = e4json(server, 'p4_booby', null); if (b) { try { if (server.overworld().getBlock(b.x, b.y, b.z).id == b.id) e4cmd(server, 'setblock ' + b.x + ' ' + b.y + ' ' + b.z + ' minecraft:air'); } catch (e) {} E4.data(server).remove('p4_booby'); } });
BlockEvents.broken(event => {
  try {
    let p = event.player; if (!p || !p.server) return;
    let server = p.server, b = e4json(server, 'p4_booby', null); if (!b) return;
    if (event.block.x != b.x || event.block.y != b.y || event.block.z != b.z) return;
    E4.data(server).remove('p4_booby');
    let r = Math.random() * (b.odds.treat + b.odds.coal + b.odds.boom), pos = b.x + ' ' + b.y + ' ' + b.z;
    if (r < b.odds.treat) {
      e4cmd(server, 'loot spawn ' + b.x + ' ' + (b.y + 0.5) + ' ' + b.z + ' loot chop:santa_rare');
      e4cmd(server, 'playsound minecraft:entity.player.levelup master @a ' + pos + ' 1 1.4');
      e4text(server, p.username + ' opened a mystery present: a treat!', 'green');
    } else if (r < b.odds.treat + b.odds.coal) {
      dropItem(server, b.x, b.y, b.z, 'minecraft:coal', 1 + Math.floor(Math.random() * 3));
      e4cmd(server, 'give ' + p.username + ' chop:coal_token 1');
      e4cmd(server, 'playsound minecraft:entity.villager.no master @a ' + pos + ' 1 0.8');
      e4text(server, p.username + ' opened a mystery present: coal. Santy Claws laughs somewhere.', 'gray');
    } else {
      server.scheduleInTicks(10, () => {
        e4cmd(server, 'particle minecraft:explosion_emitter ' + pos + ' 0 0 0 0 1 force');
        e4cmd(server, 'playsound minecraft:entity.generic.explode master @a ' + pos + ' 1 1');
        e4cmd(server, 'damage @a[x=' + b.x + ',y=' + b.y + ',z=' + b.z + ',distance=..4] ' + P4.BOOBY_DAMAGE + ' minecraft:explosion');
        e4cmd(server, 'effect give @a[x=' + b.x + ',y=' + b.y + ',z=' + b.z + ',distance=..4] minecraft:levitation 1 2 true');
        e4cmd(server, 'kill @e[type=minecraft:item,x=' + b.x + ',y=' + b.y + ',z=' + b.z + ',distance=..2]');
        dropItem(server, b.x, b.y, b.z, 'minecraft:coal', 3);
      });
      e4text(server, p.username + ' opened a mystery present. It was not a present.', 'dark_red');
    }
    E4.logEvent(server, p.username + ' opened a mystery present');
  } catch (e) { console.warn('[Festivity4] mystery present: ' + e); }
});

// 3 Claws Outpost (staged template), 4 Claws Spire (staged template) - see STRUCTURES below
e4def('outpost', 'Claws Outpost', ['low'], P4.OUTPOST_W, server => startOutpost(server) ? {} : null, null);
e4def('spire', 'Claws Spire', ['low'], P4.SPIRE_W, server => startSpire(server) ? {} : null, null);

// 5 coal rain (30 s), a few hot coals
e4def('coalrain', 'Coal Rain', ['low'], 10, server => {
  e4title(server, 'Coal rain', 'Mind the hot ones.');
  for (let i = 0; i < 30; i++) server.scheduleInTicks(i * 20, () => {
    for (let p of e4players(server)) {
      for (let k = 0; k < 2; k++) dropItem(server, Math.floor(p.x + e4rnd(-6, 6)), Math.floor(p.y + 12), Math.floor(p.z + e4rnd(-6, 6)), 'minecraft:coal', 1);
      if (Math.random() < 0.08) { e4cmd(server, 'damage ' + p.username + ' 1 minecraft:hot_floor'); e4cmd(server, 'playsound minecraft:block.lava.extinguish master ' + p.username + ' ~ ~ ~ 0.6 1.4'); }
    }
  });
  return {};
}, null);

// 6 Frost Hound pack circles the naughtiest player all night
e4def('hounds', 'Frost Hound Pack', ['low'], 10, server => {
  let t = e4rotate(server, 'p4_rot_hounds', e4players(server)); if (!t) return null;
  for (let i = 0; i < 4; i++) { let a = i * Math.PI / 2; summon(server, 'minecraft:wolf', t.x + Math.cos(a) * 12, e4surface(server.overworld(), Math.floor(t.x + Math.cos(a) * 12), Math.floor(t.z + Math.sin(a) * 12)), t.z + Math.sin(a) * 12, 'Frost Hound', 'fest_t3 fest_hound fest_e4', '{AngerTime:999999}'); }
  e4cmd(server, 'playsound minecraft:entity.wolf.howl master @a ~ ~ ~ 1 0.5');
  e4cmd(server, 'tellraw ' + t.username + ' ' + E4.jsonText('Howls close in around you.', 'dark_red'));
  return {};
}, null);

// 7 snow squall: 2 min of fog, slowness, distant bells
e4def('squall', 'Snow Squall', ['low'], 10, server => {
  e4title(server, 'Snow squall', 'Hard to see, hard to walk. Two minutes.');
  for (let i = 0; i < 24; i++) server.scheduleInTicks(i * 100, () => {
    for (let p of e4players(server)) {
      e4cmd(server, 'effect give ' + p.username + ' minecraft:slowness 6 0 true');
      e4cmd(server, 'effect give ' + p.username + ' minecraft:darkness 6 0 true');
      e4cmd(server, 'particle minecraft:snowflake ' + Math.floor(p.x) + ' ' + Math.floor(p.y + 2) + ' ' + Math.floor(p.z) + ' 6 3 6 0.05 300 force');
      if (i % 4 == 0) e4cmd(server, 'playsound minecraft:block.bell.use master ' + p.username + ' ' + Math.floor(p.x + e4rnd(-30, 30)) + ' ' + Math.floor(p.y) + ' ' + Math.floor(p.z + e4rnd(-30, 30)) + ' 1 0.6');
    }
  });
  return {};
}, null);

// 8 lights out: candles / lamps near players go dark for the night (relighting scores decor as usual)
e4def('lightsout', 'Lights Out', ['low'], 8, server => {
  let boxes = [];
  let kinds = ['candle', 'white_candle', 'orange_candle', 'magenta_candle', 'light_blue_candle', 'yellow_candle', 'lime_candle', 'pink_candle', 'gray_candle', 'light_gray_candle', 'cyan_candle', 'purple_candle', 'blue_candle', 'brown_candle', 'green_candle', 'red_candle', 'black_candle'];
  for (let p of e4players(server)) {
    let x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z); boxes.push([x, y, z]);
    e4cmd(server, 'festivity lightsout ' + x + ' ' + y + ' ' + z + ' 24');   // 0.9.36: Java snuffs lit candles only (no lamps, never the Candle of Vigil) and relights exactly those at dawn
    e4cmd(server, 'effect give ' + p.username + ' minecraft:darkness 8 0 true');
  }
  e4cmd(server, 'playsound minecraft:block.fire.extinguish master @a ~ ~ ~ 1 0.5');
  e4title(server, 'The lights go out', 'A cold breath snuffed the candles. Light them again.', 'gray');
  return { boxes: boxes, kinds: kinds };
}, (server, st) => {   // dawn: whatever is still dark comes back on
  for (let b of (st.boxes || [])) {
    let x = b[0], y = b[1], z = b[2], box = (x - 24) + ' ' + (y - 4) + ' ' + (z - 24) + ' ' + (x + 24) + ' ' + (y + 4) + ' ' + (z + 24);
    // 0.9.36: no fills here; the jar relights what it put out
  }
  e4text(server, 'The candles flicker back to life.', 'yellow');
});

// 9 doorstep thief: a Sour Elf Thief with a trinket runs off; kill it for double
e4def('thief', 'Doorstep Thief', ['low'], 10, server => {
  let s = e4spot(server, 5, 9); if (!s) return null;
  let loot = e4pick(['minecraft:emerald', 'minecraft:gold_ingot', 'minecraft:cookie', 'minecraft:cake', 'minecraft:diamond']);
  e4cmd(server, 'summon ' + fid('minecraft:stray') + ' ' + s.x + ' ' + s.y + ' ' + s.z + ' {PersistenceRequired:1b,Tags:["fest_minion","fest_e4","fest_e4thief"],HandItems:[{id:"' + loot + '",count:1},{}],HandDropChances:[0f,0f],active_effects:[{id:"minecraft:speed",amplifier:2,duration:-1}]}');
  e4save(server, 'p4_thief', { loot: loot });
  e4cmd(server, 'tellraw ' + s.player.username + ' ' + E4.jsonText('A Sour Elf snatched something from your doorstep!', 'dark_red'));
  e4cmd(server, 'playsound minecraft:entity.villager.no master ' + s.player.username + ' ' + s.x + ' ' + s.y + ' ' + s.z + ' 1 1.6');
  return {};
}, null);
EntityEvents.death(event => {
  try {
    let e = event.entity; if (!e.tags || !e.tags.contains('fest_e4thief')) return;
    let server = e.server, t = e4json(server, 'p4_thief', null); if (!t) return;
    dropItem(server, Number(e.x.toFixed(1)), Number(e.y.toFixed(1)), Number(e.z.toFixed(1)), t.loot, 2);   // v11: numbers (dropItem adds 0.5 to y)
    E4.data(server).remove('p4_thief');
  } catch (x) {}
});

// 10 stocking stuffed with coal
e4def('stocking', 'Coal in Your Stocking', ['low'], 8, server => {
  e4cmd(server, 'give @a minecraft:coal 3'); e4cmd(server, 'give @a chop:coal_token 1');   // 0.9.36: was 64 coal
  e4title(server, 'Coal in your stocking', 'Santy Claws says you earned it.', 'gray');
  return {};
}, null);

// 11 nutcracker patrol: 3 soldiers march a line past the outskirts, players only
e4def('patrol', 'Nutcracker Patrol', ['low'], 10, server => {
  let s = e4spot(server, 30, 40); if (!s) return null;
  for (let i = 0; i < 3; i++) summon(server, 'minecraft:wither_skeleton', s.x + i * 2, e4surface(server.overworld(), s.x + i * 2, s.z), s.z, 'Nutcracker Soldier', 'fest_t2 fest_e4', '{HandItems:[{id:"minecraft:iron_axe",count:1},{}],ArmorItems:[{},{},{id:"minecraft:iron_chestplate",count:1},{id:"minecraft:iron_helmet",count:1}]}');
  e4cmd(server, 'playsound minecraft:block.note_block.snare master @a ' + s.x + ' ' + s.y + ' ' + s.z + ' 2 0.8');
  e4text(server, 'Drums. A Nutcracker patrol marches near ' + s.player.username + '.', 'red');
  return {};
}, null);

// 12 crooked chimes: creepy disc for 20 s, Coal Gnomes crawl from a soul-soil patch
e4def('chimes', 'Crooked Chimes', ['low'], 8, server => {
  let s = e4spot(server, 10, 14); if (!s) return null;
  e4cmd(server, 'playsound minecraft:music_disc.11 record @a ' + s.x + ' ' + s.y + ' ' + s.z + ' 0.7 0.8');
  server.scheduleInTicks(400, () => e4cmd(server, 'stopsound @a record'));
  e4cmd(server, 'festivity soulpatch ' + s.x + ' ' + s.y + ' ' + s.z);   // 0.9.36: 3x3 soul soil, restored at dawn by the jar
  for (let i = 0; i < 6; i++) server.scheduleInTicks(i * 30, () => summon(server, 'minecraft:endermite', s.x + e4rnd(-1, 1), s.y, s.z + e4rnd(-1, 1), 'Coal Gnome', 'fest_t2 fest_e4', '{Lifetime:0,active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1}]}'));
  return {};
}, null);

// 13 a second letter from S. Claws (Phase 3 dare, bigger stakes handled there)
e4def('letter2', 'Another Letter', ['low'], 6, server => { try { startLetter(server); return {}; } catch (e) { return null; } }, null);

// 14 black ice: an 8x8 patch of ice on open ground near a player, melts at dawn
e4def('blackice', 'Black Ice', ['low'], 8, server => {
  let s = e4spot(server, 6, 14); if (!s) return null;
  let y = s.y - 1, c = s.x + ' ' + y + ' ' + s.z, box = (s.x - 4) + ' ' + y + ' ' + (s.z - 4) + ' ' + (s.x + 3) + ' ' + y + ' ' + (s.z + 3);
  e4cmd(server, 'festivity blackice ' + s.x + ' ' + s.y + ' ' + s.z);   // 0.9.36: packed ice, every block's state recorded and restored at dawn
  e4save(server, 'p4_ice', { box: box });
  e4cmd(server, 'playsound minecraft:block.glass.place master @a ' + c + ' 1 0.5');
  return { box: box };
}, (server, st) => { E4.data(server).remove('p4_ice'); });   // 0.9.36: the jar restores the exact blocks (the old fill turned dirt/podzol/snow into grass)

// 15 gift drop: a present parachutes next to a player; breaking it rolls santa_rare
e4def('giftdrop', 'Gift Drop', ['high', 'quiet'], 14, server => {
  let s = e4spot(server, 3, 6); if (!s) return null;
  // 0.9.5 (Josh 11-09): Festivity Java does the show: sparks climb for 2 s, the present FALLS from 40 blocks up with a snowflake trail,
  // lands filled (Festivity Gift Crate + Santa's Sack). The santa_rare roll on break stays (e4gift). Fallback to the old setblock if the command is missing.
  let r = e4cmd(server, 'festivity skydrop ' + s.x + ' ' + s.y + ' ' + s.z + ' ' + presentItem());
  if (r === 0 || r === false) server.scheduleInTicks(60, () => e4cmd(server, 'setblock ' + s.x + ' ' + s.y + ' ' + s.z + ' ' + presentItem()));
  server.scheduleInTicks(70, () => e4gift(server, s.x, s.y, s.z));
  e4cmd(server, 'tellraw ' + s.player.username + ' ' + E4.jsonText('Something is floating down beside you...', 'gold'));
  return {};
}, null);
function e4gift(server, x, y, z) { let g = e4json(server, 'p4_gifts', []); g.push({ x: x, y: y, z: z }); e4save(server, 'p4_gifts', g); }
BlockEvents.broken(event => {
  try {
    let p = event.player; if (!p || !p.server) return;
    let g = e4json(p.server, 'p4_gifts', []); if (!g.length) return;
    let b = event.block, keep = [], hit = false;
    for (let q of g) { if (q.x == b.x && q.y == b.y && q.z == b.z) hit = true; else keep.push(q); }
    if (!hit) return;
    e4save(p.server, 'p4_gifts', keep);
    e4cmd(p.server, 'loot spawn ' + b.x + ' ' + (b.y + 0.5) + ' ' + b.z + ' loot chop:santa_rare');
    e4cmd(p.server, 'playsound minecraft:entity.player.levelup master @a ' + b.x + ' ' + b.y + ' ' + b.z + ' 1 1.4');
  } catch (e) {}
});

// 16 carolers: three snow golems sing at the town hall; +0.5 if 2+ players listen
// 0.9.9 (Josh): town-hall events need a REAL town hall: the op-set anchor or a MineColonies Town Hall block found by the Festivity jar
// (read-only scan). No player fallback, so the carolers never pop up in the wilderness.
function e4townHall(server) {
  try { let th = Fest.readJson(server, 'townhall', null); if (th) return th; } catch (e) {}
  try {
    let pos = Java.loadClass('com.chop.festivity.compat.TownHallFinder').find(server);
    if (pos) return { x: pos[0] + 2, y: pos[1], z: pos[2] + 2 };
  } catch (e) { console.warn('[Festivity] town hall finder unavailable: ' + e); }
  return null;
}

e4def('carolers', 'Carolers', ['high', 'quiet'], 10, server => {
  let a = e4townHall(server); if (!a) return null;
  let x = a.x + 3, z = a.z + 3, y = e4surface(server.overworld(), x, z);
  for (let i = 0; i < 3; i++) e4cmd(server, 'summon minecraft:snow_golem ' + (x + i) + ' ' + y + ' ' + z + ' {NoAI:1b,Silent:1b,Pumpkin:0b,Tags:["fest_e4","fest_caroler"]}');
  let notes = [0.8, 1.0, 1.2, 1.0, 0.8, 0.9, 1.2, 1.5];
  for (let i = 0; i < 30; i++) server.scheduleInTicks(i * 20, () => e4cmd(server, 'playsound minecraft:block.note_block.chime master @a ' + x + ' ' + y + ' ' + z + ' 2 ' + notes[i % notes.length]));
  server.scheduleInTicks(620, () => {
    let n = 0; for (let p of e4players(server)) { let dx = p.x - x, dz = p.z - z; if (dx * dx + dz * dz < 100) n++; }
    if (n >= 2) { E4.change(server, 0.5, 'event', null, 'carolers'); e4text(server, 'The carolers bow. The town feels warmer.', 'green'); }
    e4cmd(server, 'kill @e[tag=fest_caroler]');
  });
  e4text(server, 'Carolers have gathered near the town hall. Go listen!', 'aqua');
  return {};
}, null);

// 17 aurora night: fireworks over the colony at midnight (colour shift needs the EC2 API: later)
e4def('aurora', 'Aurora Night', ['high'], 10, server => {
  let a = anchor(server); if (!a) return null;
  e4text(server, 'The sky shimmers tonight. Look up at midnight.', 'aqua');
  e4cmd(server, 'festivity fireworks ' + a.x + ' ' + a.y + ' ' + a.z + ' 12 12 15');   // 0.9.5: Java picks OUTDOOR spots only (never inside a house)
  return {};
}, null);

// 18 cocoa hour: everyone online gets a hot cocoa (or Regeneration if no cocoa item exists)
e4def('cocoa', 'Cocoa Hour', ['high', 'quiet'], 10, server => {
  e4cmd(server, 'festivity cocoa 1');   // 0.9.5: Java finds a real hot cocoa item in the pack and hands it to everyone (+ Regeneration 30 s)
  e4title(server, 'Cocoa hour', 'Warm hands, warm hearts.', 'gold');
  return {};
}, null);

// 19 reindeer sighting: a reindeer waits 40-60 blocks away beside a present for 90 s
e4def('reindeer', 'Reindeer Sighting', ['high'], 10, server => {
  let s = e4spot(server, 40, 60); if (!s) return null;
  if (!e4dry(server, s.x, s.y, s.z, 2)) return null;
  e4cmd(server, 'summon ' + fid('minecraft:horse') + ' ' + s.x + ' ' + s.y + ' ' + s.z + ' {NoAI:1b,Silent:1b,Variant:0,Tags:["fest_e4","fest_reindeer"]}');
  e4cmd(server, 'setblock ' + (s.x + 1) + ' ' + s.y + ' ' + (s.z + 1) + ' ' + presentItem()); e4gift(server, s.x + 1, s.y, s.z + 1);
  for (let i = 0; i < 9; i++) server.scheduleInTicks(i * 200, () => e4cmd(server, 'playsound minecraft:block.bell.use master @a ' + s.x + ' ' + s.y + ' ' + s.z + ' 3 1.5'));
  server.scheduleInTicks(1800, () => e4cmd(server, 'kill @e[tag=fest_reindeer,tag=fest_e4]'));   // v11: only the event reindeer (Phase 5 wild/tamed reindeer carry fest_reindeer too)
  let dx = s.x - s.player.x, dz = s.z - s.player.z, dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
  e4cmd(server, 'tellraw ' + s.player.username + ' ' + E4.jsonText('Bells to the ' + dir + '. A reindeer? Follow it before it bolts.', 'gold'));
  return {};
}, null);

// 20 secret Santa: each player gets a target; dropping an item the target picks up today scores +2 each
e4def('secretsanta', 'Secret Santa', ['high', 'quiet'], 8, server => {
  let ps = e4players(server); if (ps.length < 2) return null;
  let names = ps.map(p => p.username), shuffled = names.slice().sort(() => Math.random() - 0.5), map = {};
  for (let i = 0; i < names.length; i++) { let t = shuffled[i] == names[i] ? shuffled[(i + 1) % names.length] : shuffled[i]; map[names[i]] = t; }
  e4save(server, 'p4_secret', map);
  for (let n in map) e4cmd(server, 'tellraw ' + n + ' ' + E4.jsonText('Secret Santa: your person is ' + map[n] + '. Drop them a gift today (any item). Tell no one.', 'light_purple'));
  return {};
}, (server, st) => { E4.data(server).remove('p4_secret'); });
ItemEvents.pickedUp(event => {
  try {
    let p = event.player, server = p.server, map = e4json(server, 'p4_secret', null); if (!map) return;
    let ie = event.itemEntity, owner = null;
    try { owner = ie.owner ? ie.owner.username : null; } catch (e) {}
    if (!owner) { try { let th = ie.nbt.getUUID('Thrower'); for (let q of server.players) if (String(q.uuid) == String(th)) owner = q.username; } catch (e) {} }
    if (!owner || owner == p.username || map[owner] != p.username || map['done_' + owner]) return;
    map['done_' + owner] = true;
    let total = Number(map['_total'] || 0); if (total + 2 > P4.SECRET_CAP) { e4save(server, 'p4_secret', map); return; }   // v11: capped per event
    map['_total'] = total + 2; e4save(server, 'p4_secret', map);
    E4.change(server, 2, 'event', null, 'secret santa');
    e4text(server, owner + ' gave ' + p.username + ' a Secret Santa gift! +2 Festivity.', 'light_purple');
  } catch (e) {}
});

// 22 candy shower (Merry+)
e4def('candy', 'Candy Shower', ['high'], 10, server => {
  let id = e4first(P4.CANDY);
  e4text(server, "Santa's sleigh passes overhead. Candy canes tumble down!", 'aqua');
  e4cmd(server, 'playsound minecraft:block.bell.use master @a ~ ~ ~ 2 1.5');
  for (let i = 0; i < 20; i++) server.scheduleInTicks(i * 20, () => { for (let p of e4players(server)) dropItem(server, Math.floor(p.x + e4rnd(-5, 5)), Math.floor(p.y + 10), Math.floor(p.z + e4rnd(-5, 5)), id, 1); });
  return {};
}, null);

// ================= STRUCTURES (Assets v17c staged templates) =================
function startOutpost(server) {
  if (E4.data(server).contains('outpost')) return false;
  for (let tries = 0; tries < 20; tries++) {
    let s = e4spot(server, P4.STRUCT_MIN, P4.STRUCT_MAX); if (!s) return false;
    let x = s.x - 7, z = s.z - 7, y = s.y;
    if (!e4safe(server, x, y, z, P4.OUTPOST_SIZE)) continue;
    e4cmd(server, 'fill ' + x + ' ' + (y - 1) + ' ' + z + ' ' + (x + 14) + ' ' + (y - 1) + ' ' + (z + 14) + ' minecraft:soul_soil replace #minecraft:replaceable');
    e4place(server, P4.OUTPOST_TPL + '1', x, y, z);
    let c = P4.OUTPOST_CORE[0]; e4star(server, x + c[0], y + c[1], z + c[2], 'fest_swarm');
    p2save(server, 'outpost', { x: x + 7, y: y, z: z + 7, ox: x, oy: y, oz: z, stage: 1, stageDay: E4.dayCount(server), star: (x + c[0]) + ',' + (y + c[1]) + ',' + (z + c[2]), built: E4.nowMs(), lastRaidDay: -1, huntDay: -1 });
    e4save(server, 'p4_star', { star: (x + c[0]) + ',' + (y + c[1]) + ',' + (z + c[2]), x: x + 7, y: y, z: z + 7 });
    e4text(server, 'Sour Elves are building something in the dark, ' + Math.round(Math.sqrt((s.x - s.player.x) * (s.x - s.player.x) + (s.z - s.player.z) * (s.z - s.player.z))) + ' blocks from ' + s.player.username + '. Break its Cursed Star before it grows.', 'red');
    E4.logEvent(server, 'A Claws Outpost is being built at ' + (x + 7) + ' ' + y + ' ' + (z + 7));
    e4cmd(server, 'playsound minecraft:entity.wither.spawn master @a ~ ~ ~ 0.3 0.5');
    return true;
  }
  return false;
}
function outpostGrow(server, o) {
  if (o.stage >= 3) return;
  o.stage++; o.stageDay = E4.dayCount(server);
  e4place(server, P4.OUTPOST_TPL + o.stage, o.ox, o.oy, o.oz);
  let c = P4.OUTPOST_CORE[o.stage - 1];
  if (o.stage == 3) { let old = o.star.split(','); e4cmd(server, 'setblock ' + old[0] + ' ' + old[1] + ' ' + old[2] + ' minecraft:air'); }
  e4star(server, o.ox + c[0], o.oy + c[1], o.oz + c[2], 'fest_swarm');
  o.star = (o.ox + c[0]) + ',' + (o.oy + c[1]) + ',' + (o.oz + c[2]);
  p2save(server, 'outpost', o); e4save(server, 'p4_star', { star: o.star, x: o.x, y: o.y, z: o.z });
  e4text(server, o.stage == 3 ? 'The Claws Outpost is finished. Its watchtower glares at the colony.' : 'The Claws Outpost grows taller.', 'red');
  E4.logEvent(server, 'The Claws Outpost reached stage ' + o.stage);
  e4cmd(server, 'playsound minecraft:block.anvil.use master @a ' + o.x + ' ' + o.y + ' ' + o.z + ' 2 0.6');
}
// Phase 2's auto-tower is disabled two ways: (a) P2.OUTPOST_AT pushed below any value so its outpostTick never builds, and its
// raid cadence pushed out of reach; (b) its outpostTick is replaced by a no-op that only logs. Phase 4's own tick drives outpostTick4.
P2.OUTPOST_AT = -999; P4.RAID_EVERY = P2.RAID_EVERY_N_NIGHTS; P2.RAID_EVERY_N_NIGHTS = 999983;
var e4_overrideSeen = false;
outpostTick = function (server) { if (!e4_overrideSeen) { e4_overrideSeen = true; e4log('outpostTick override active (Phase 2 call reached the Phase 4 no-op)'); } };
function outpostTick4(server) {
  let o = p2json(server, 'outpost', null); if (!o) return;
  if (o.stage === undefined) { o.stage = 3; o.ox = o.x - 2; o.oy = o.y; o.oz = o.z - 2; o.stageDay = E4.dayCount(server); p2save(server, 'outpost', o); }   // an old /fill tower from Phase 2
  if (!e4night(server) || E4.inGrace(server)) return;
  let day = E4.dayCount(server), band = E4.band(server);
  if (o.stage < 3 && o.stageDay != day) { if (e4ringSafe(server, o.ox, o.oz, P4.OUTPOST_SIZE)) outpostGrow(server, o); else { o.stageDay = day; p2save(server, 'outpost', o); } return; }
  if (o.stage >= 2 && o.huntDay != day) { o.huntDay = day; p2save(server, 'outpost', o); outpostHunt(server, o); }
  if (o.stage >= 2 && server.tickCount % 1200 == 0 && e4minionsNear(server, o.x, o.y, o.z, 32) < P4.OUTPOST_CAP) {
    let list = P2.MINIONS[band.id] || P2.MINIONS.bleak;
    for (let m of list) for (let i = 0; i < Math.ceil(m.n / 2); i++) summon(server, m.id, o.x + e4rnd(-8, 8), o.y, o.z + e4rnd(-8, 8), m.name, m.tags, m.nbt);
  }
  if (o.stage == 3 && (band.id == 'clawseve' || band.id == 'clawsnight') && o.lastRaidDay != day && day % P4.RAID_EVERY == 0) {
    o.lastRaidDay = day; p2save(server, 'outpost', o);
    E4.cmd(server, P2.RAID_CMD);
    e4text(server, 'The Outpost sends raiders against the colony tonight!', 'red');
    E4.logEvent(server, 'The Claws Outpost raided the colony');
    e4cmd(server, 'particle minecraft:flame ' + o.x + ' ' + (o.y + 12) + ' ' + o.z + ' 1 3 1 0.1 200');
  }
}
function e4minionsNear(server, x, y, z, r) {
  let n = 0;
  try { for (let e of server.overworld().getEntitiesWithin(AABB.of(x - r, y - 16, z - r, x + r, y + 32, z + r))) if (e.tags && e.tags.contains('fest_minion')) n++; } catch (e) {}
  return n;
}
// (Josh 2026-11-06 05:08) stage 2+: once a night the outpost picks one player within HUNT_RANGE (naughtiest first) and sends a hunting band
function outpostHunt(server, o) {
  try {
    let near = [];
    for (let p of e4players(server)) { let dx = p.x - o.x, dz = p.z - o.z; if (Math.sqrt(dx * dx + dz * dz) <= P4.HUNT_RANGE) near.push(p); }
    let t = e4rotate(server, 'p4_rot_hunt', near); if (!t) return;
    let ang = Math.random() * Math.PI * 2, hx = t.x + Math.cos(ang) * P4.HUNT_DIST, hz = t.z + Math.sin(ang) * P4.HUNT_DIST, lvl = server.overworld();
    for (let i = 0; i < P4.HUNT_GNOMES; i++) summon(server, 'minecraft:endermite', hx + e4rnd(-2, 2), e4surface(lvl, Math.floor(hx), Math.floor(hz)), hz + e4rnd(-2, 2), 'Coal Gnome', 'fest_t2 fest_e4 fest_hunt', '{Lifetime:0,active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1}]}');
    for (let i = 0; i < P4.HUNT_ELVES; i++) summon(server, 'minecraft:stray', hx + e4rnd(-2, 2), e4surface(lvl, Math.floor(hx), Math.floor(hz)), hz + e4rnd(-2, 2), 'Sour Elf', 'fest_t1 fest_e4 fest_hunt', '{HandItems:[{id:"minecraft:stick",count:1},{}],HandDropChances:[0f,0f],active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1}]}');   // v11: no helmet item (hat is in the model)
    e4cmd(server, 'tellraw ' + t.username + ' ' + E4.jsonText('The Outpost has sent hunters after you. Break its Cursed Star to end this.', 'dark_red'));
    e4cmd(server, 'playsound minecraft:entity.wolf.howl master ' + t.username + ' ' + Math.floor(hx) + ' ' + Math.floor(t.y) + ' ' + Math.floor(hz) + ' 1 0.5');
    E4.logEvent(server, 'The Claws Outpost sent a hunting band after ' + t.username);
    e4log('outpost hunt on ' + t.username + ' (' + near.length + ' in range)');
  } catch (e) { console.warn('[Festivity4] hunt: ' + e); }
}
// Cursed Star broken: Phase 2 removes the outpost record and scores it; this cleans the minions AROUND THE OUTPOST
// (Phase 2's kill uses distance from the command origin, not the outpost) and ends any hunt
BlockEvents.broken(event => {
  try {
    let p = event.player; if (!p || !p.server) return;
    let server = p.server, st = e4json(server, 'p4_star', null); if (!st) return;
    if (event.block.x + ',' + event.block.y + ',' + event.block.z != st.star) return;
    starBroken(server, st, p, false);
  } catch (e) {}
});
// shared by the real break (above) and the debug command (/festivity event starbreak, which also does Phase 2's part because a
// scripted block removal fires no BlockEvents.broken)
function starBroken(server, st, p, debug) {
  E4.data(server).remove('p4_star');
  let freed = freeElvesNear(server, st, p);
  e4cmd(server, 'kill @e[tag=fest_minion,tag=!fest_claws,x=' + st.x + ',y=' + st.y + ',z=' + st.z + ',distance=..48]');
  e4cmd(server, 'kill @e[tag=fest_hunt]');
  for (let f of freed) spawnFreedElf(server, f.x, f.y, f.z, p ? p.username : null);   // after the kill sweep so the elves survive it
  E4.data(server).remove('p4_rot_hunt');
  e4log('cursed star broken at ' + st.star + ', outpost cleared' + (debug ? ' (debug)' : ''));
  if (debug) {   // Phase 2's handler did not run: do its part too
    let o = p2json(server, 'outpost', null), c = st.star.split(',');
    E4.data(server).remove('outpost');
    e4cmd(server, 'setblock ' + c[0] + ' ' + c[1] + ' ' + c[2] + ' minecraft:air');
    if (o) { e4cmd(server, 'particle minecraft:explosion ' + o.x + ' ' + (o.y + 7) + ' ' + o.z + ' 1 1 1 0 10'); e4cmd(server, 'playsound minecraft:entity.generic.explode master @a ' + o.x + ' ' + o.y + ' ' + o.z + ' 1 0.7'); }
    if (p) { E4.score(server, p, 'cursed_star', 1, 'broke the Cursed Star'); e4cmd(server, 'give ' + p.username + ' chop:ribbon_token 1'); }
    dropItem(server, Number(c[0]), Number(c[1]), Number(c[2]), 'minecraft:coal', 16);
    e4text(server, (p ? p.username : 'Someone') + ' shattered the Cursed Star. The Outpost is silent.', 'green');
    E4.logEvent(server, (p ? p.username : 'debug') + ' destroyed the Claws Outpost');
  }
}
// ---------- Freed Elves (Josh 05:47 UTC 11-06): the corruption is reversible once the star is gone ----------
// Up to P4.FREED_ELVES Sour Elf strays within 48 of the outpost are replaced by invulnerable 'Freed Elf' allays (no fest_minion tag:
// they are not enemies and give no rescue points). They hover for FREED_TICKS, then leave a present + candy and fly off.
function freeElvesNear(server, st, p) {
  let out = [];
  try {
    let lvl = (p && p.level) || server.overworld();
    for (let e of lvl.getEntitiesWithin(AABB.of(st.x - 48, st.y - 24, st.z - 48, st.x + 48, st.y + 40, st.z + 48))) {
      if (out.length >= P4.FREED_ELVES) break;
      if (!e.tags || !e.tags.contains('fest_minion') || e.tags.contains('fest_claws')) continue;
      if (!f5isType(e, 'minecraft:stray')) continue;
      out.push({ x: e.x, y: e.y, z: e.z });
    }
  } catch (e) { e4log('freeElvesNear failed: ' + e); }
  if (!out.length && p) out.push({ x: p.x + e4rnd(-3, 3), y: p.y + 1, z: p.z + e4rnd(-3, 3) });   // no elf nearby: one still comes out of the rubble
  return out;
}
function spawnFreedElf(server, x, y, z, who) {
  e4cmd(server, 'summon minecraft:allay ' + x.toFixed(1) + ' ' + (y + 1).toFixed(1) + ' ' + z.toFixed(1) + ' {PersistenceRequired:1b,Invulnerable:1b,CanDuplicate:0b,Tags:["fest_elf","fest_e4"],active_effects:[{id:"minecraft:glowing",duration:' + P4.FREED_TICKS + ',show_particles:0b}]}');
  e4cmd(server, 'particle minecraft:end_rod ' + x.toFixed(1) + ' ' + (y + 1).toFixed(1) + ' ' + z.toFixed(1) + ' 0.6 0.8 0.6 0.05 30');
  e4cmd(server, 'playsound minecraft:entity.allay.item_given master @a ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' 1 1');
  if (who) e4cmd(server, 'tellraw ' + who + ' ' + E4.jsonText('A Sour Elf shudders as the star dies... the green drains from its eyes. "The hold is broken here. Thank you! Take this, from the Workshop."', 'green'));
  server.scheduleInTicks(P4.FREED_TICKS, () => {
    try {
      let left = findByTag(server, 'fest_elf', { x: x, z: z }, 64);
      for (let e of left) {
        dropPresent(server, Math.floor(e.x), Math.floor(e.y), Math.floor(e.z));   // heist fix: tagged present
        let candy = e4first(P4.CANDY); if (candy) dropItem(server, Math.floor(e.x), Math.floor(e.y), Math.floor(e.z), candy, 2);
        e4cmd(server, 'particle minecraft:happy_villager ' + e.x.toFixed(1) + ' ' + e.y.toFixed(1) + ' ' + e.z.toFixed(1) + ' 0.8 0.8 0.8 0.1 25');
        e4cmd(server, 'playsound minecraft:entity.allay.ambient_without_item master @a ' + Math.floor(e.x) + ' ' + Math.floor(e.y) + ' ' + Math.floor(e.z) + ' 1 1.2');
        e.discard();
      }
      e4log('freed elves left: ' + left.length);
    } catch (e) { e4log('freed elf cleanup failed: ' + e); e4cmd(server, 'kill @e[tag=fest_elf]'); }
  });
  e4log('freed elf at ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z));
}
function startSpire(server) {
  let list = e4json(server, 'p4_spires', []); if (list.length >= P4.SPIRE_MAX) return false;
  for (let tries = 0; tries < 20; tries++) {
    let s = e4spot(server, P4.STRUCT_MIN, P4.STRUCT_MAX); if (!s) return false;
    let x = s.x - 5, z = s.z - 5, y = s.y;
    if (!e4safe(server, x, y, z, P4.SPIRE_SIZE)) continue;
    e4cmd(server, 'fill ' + x + ' ' + (y - 1) + ' ' + z + ' ' + (x + 10) + ' ' + (y - 1) + ' ' + (z + 10) + ' minecraft:soul_soil replace #minecraft:replaceable');
    e4place(server, P4.SPIRE_TPL + '1', x, y, z);
    let c = P4.SPIRE_CORE[0]; e4star(server, x + c[0], y + c[1], z + c[2], 'fest_spire');
    list.push({ x: x + 5, y: y, z: z + 5, ox: x, oy: y, oz: z, stage: 1, stageDay: E4.dayCount(server), core: (x + c[0]) + ',' + (y + c[1]) + ',' + (z + c[2]) });
    e4save(server, 'p4_spires', list);
    e4text(server, 'A black spire is rising near ' + s.player.username + '. Its Coal Heart sits in the south alcove. Shatter it.', 'red');
    E4.logEvent(server, 'A Claws Spire rose at ' + (x + 5) + ' ' + y + ' ' + (z + 5));
    e4cmd(server, 'playsound minecraft:block.respawn_anchor.charge master @a ~ ~ ~ 1 0.5');
    return true;
  }
  return false;
}
function spireTick(server) {
  let list = e4json(server, 'p4_spires', []); if (!list.length) return;
  let day = E4.dayCount(server), night = e4night(server), changed = false;
  for (let sp of list) {
    if (night && sp.stage < 3 && sp.stageDay != day && !E4.inGrace(server)) {
      if (!e4ringSafe(server, sp.ox, sp.oz, P4.SPIRE_SIZE)) { sp.stageDay = day; changed = true; continue; }
      sp.stage++; sp.stageDay = day; changed = true;
      e4place(server, P4.SPIRE_TPL + sp.stage, sp.ox, sp.oy, sp.oz);
      let c = P4.SPIRE_CORE[sp.stage - 1]; e4star(server, sp.ox + c[0], sp.oy + c[1], sp.oz + c[2], 'fest_spire');
      e4text(server, 'The spire grows.', 'red'); e4cmd(server, 'playsound minecraft:block.respawn_anchor.charge master @a ' + sp.x + ' ' + sp.y + ' ' + sp.z + ' 2 0.4');
    }
    // the heart pulses Slowness on anyone close; stage 3 pulls Festivity down a hair each night it stands
    e4cmd(server, 'effect give @a[x=' + sp.x + ',y=' + sp.y + ',z=' + sp.z + ',distance=..' + (6 + sp.stage * 3) + '] minecraft:slowness 6 0 true');
    e4cmd(server, 'particle minecraft:smoke ' + sp.x + ' ' + (sp.y + sp.stage * 4) + ' ' + sp.z + ' 1 2 1 0.02 20');
    if (sp.stage == 3 && night && server.tickCount % 6000 == 0) E4.change(server, -0.2, 'event', null, 'claws spire');
  }
  if (changed) e4save(server, 'p4_spires', list);
}
BlockEvents.broken(event => {   // Coal Heart shattered
  try {
    let p = event.player; if (!p || !p.server) return;
    let server = p.server, list = e4json(server, 'p4_spires', []); if (!list.length) return;
    let key = event.block.x + ',' + event.block.y + ',' + event.block.z, keep = [], hit = null;
    for (let sp of list) { if (sp.core == key) hit = sp; else keep.push(sp); }
    if (!hit) return;
    e4save(server, 'p4_spires', keep);
    e4cmd(server, 'kill @e[tag=fest_spire,x=' + hit.x + ',y=' + hit.y + ',z=' + hit.z + ',distance=..40]');
    e4cmd(server, 'particle minecraft:explosion ' + hit.x + ' ' + (hit.y + 6) + ' ' + hit.z + ' 1 4 1 0 20');
    e4cmd(server, 'playsound minecraft:block.glass.break master @a ' + hit.x + ' ' + hit.y + ' ' + hit.z + ' 2 0.5');
    E4.score(server, p, 'cursed_star', 1, 'shattered a Coal Heart');
    dropItem(server, event.block.x, event.block.y, event.block.z, 'minecraft:coal', 8);
    e4text(server, p.username + ' shattered the Coal Heart. The spire is dead stone now.', 'green');
    E4.logEvent(server, p.username + ' destroyed a Claws Spire');
  } catch (e) {}
});

// ================= SANTY CLAWS smashes doors, trapdoors, gates and glass on his way in =================
// runs from Phase 4's own tick (does not depend on overriding Phase 2's clawsTick)
var e4_smashSeen = false, e4_steerSeen = false, e4_clawsLast = null;
function clawsSmash(server) {
  if (!P4.CLAWS_SMASH) return;
  try {
    let c = p2json(server, 'claws', null); if (!c || c.carrying) { e4_clawsLast = null; return; }
    let bear = clawsEntity(server); if (!bear) { e4_clawsLast = null; return; }
    let t = findPlayer(server, c.target); if (!t) { t = worstOnline(server) || e4players(server)[0]; if (!t) return; }
    let dx = t.x - bear.x, dz = t.z - bear.z, h = Math.sqrt(dx * dx + dz * dz);
    // stall guard (Build round 4: Claws sat 32 blocks out for 70 s). Phase 2 only glides him while its tick runs (night, no grace,
    // not frozen, band with minions). If he has not moved ~0.5 block in 5 s while a target exists, Phase 4 steers him the same way.
    let now = server.tickCount, lp = e4_clawsLast;
    if (lp && Math.abs(lp.x - bear.x) + Math.abs(lp.z - bear.z) > 0.5) { e4_clawsLast = { x: bear.x, z: bear.z, t: now }; }
    else if (!lp) e4_clawsLast = { x: bear.x, z: bear.z, t: now };
    else if (now - lp.t >= 100 && h > 2.2 && !(typeof F5_MOD != 'undefined' && F5_MOD)) {   // v11: with the Festivity jar the Java chase goal moves him; no tp fights
      if (!e4_steerSeen) { e4_steerSeen = true; e4log('claws stalled ' + Math.round(h) + ' blocks from ' + t.username + ' (Phase 2 tick gated?), Phase 4 steering'); }
      let step = Math.min(P2.CLAWS_SPEED, h - 1.5), nx = bear.x + dx / h * step, nz = bear.z + dz / h * step;
      let ny = e4surface(server.overworld(), Math.floor(nx), Math.floor(nz)); if (Math.abs(ny - bear.y) > 6) ny = bear.y;
      e4cmd(server, 'tp @e[tag=fest_claws,limit=1] ' + nx.toFixed(2) + ' ' + ny + ' ' + nz.toFixed(2));
      e4_clawsLast = { x: nx, z: nz, t: lp.t };   // our own move does not count as 'unstuck'; if Phase 2 moves him too, the guard resets
      if (now % 60 == 0) e4cmd(server, 'playsound minecraft:block.chain.step master ' + t.username + ' ' + Math.floor(bear.x) + ' ' + Math.floor(bear.y) + ' ' + Math.floor(bear.z) + ' 1 0.5');
    }
    if (h > 7) return;
    if (!e4_smashSeen) { e4_smashSeen = true; e4log('claws within 7 of ' + t.username + ', smash active'); }
    // step down to the target's floor once he is close (surfaceY would keep him on the roof)
    if (h <= 3 && Math.abs(t.y - bear.y) > 1.5) e4cmd(server, 'tp @e[tag=fest_claws,limit=1] ' + bear.x.toFixed(2) + ' ' + Math.floor(t.y) + ' ' + bear.z.toFixed(2));
    let lvl = server.overworld(), broke = 0, ty = Math.floor(t.y), tx = Math.floor(t.x), tz = Math.floor(t.z), ux = h > 0 ? dx / h : 0, uz = h > 0 ? dz / h : 0;
    let cols = {};
    for (let s = 1; s <= Math.min(3, Math.ceil(h)); s++) { let cx = Math.floor(bear.x + ux * s), cz = Math.floor(bear.z + uz * s); for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) cols[(cx + ox) + ',' + (cz + oz)] = 1; }   // the path
    for (let ox = -2; ox <= 2; ox++) for (let oz = -2; oz <= 2; oz++) cols[(tx + ox) + ',' + (tz + oz)] = 1;   // the walls around the target
    for (let k in cols) {
      let xz = k.split(','), x = Number(xz[0]), z = Number(xz[1]);
      for (let oy = -1; oy <= 2; oy++) {
        let y = ty + oy, id = '';
        try { id = String(lvl.getBlock(x, y, z).id); } catch (e) { continue; }
        if (id == 'minecraft:air') continue;
        if (id.endsWith('_door') || id.endsWith('_trapdoor') || id.endsWith('_fence_gate') || id.includes('glass') || id.endsWith('_pane') || id.includes('window')) {
          e4cmd(server, 'setblock ' + x + ' ' + y + ' ' + z + ' minecraft:air destroy'); broke++;
        }
      }
    }
    if (broke) { e4log('claws smashed ' + broke + ' block(s) near ' + t.username); e4cmd(server, 'playsound minecraft:entity.zombie.break_wooden_door master @a ' + Math.floor(bear.x) + ' ' + Math.floor(bear.y) + ' ' + Math.floor(bear.z) + ' 2 0.6'); e4cmd(server, 'playsound minecraft:block.glass.break master @a ' + Math.floor(bear.x) + ' ' + Math.floor(bear.y) + ' ' + Math.floor(bear.z) + ' 2 0.7'); }
  } catch (e) { console.warn('[Festivity4] claws smash: ' + e); }
}

// ================= NIGHTLY ROLL + CLEANUP =================
function e4pool(server) {
  let v = E4.value(server), band = v <= 49 ? 'low' : v >= 60 ? 'high' : 'quiet', out = [];
  for (let id in E4_POOL) {
    let e = E4_POOL[id]; if (e.bands.indexOf(band) < 0) continue;
    if (id == 'outpost' && (v > P4.OUTPOST_AT || E4.data(server).contains('outpost'))) continue;
    if (id == 'spire' && (v > P4.SPIRE_AT || e4json(server, 'p4_spires', []).length >= P4.SPIRE_MAX)) continue;
    out.push(e);
  }
  return { band: band, list: out };
}
function e4isAdvent() { if (!P4.ADVENT) return false; let d = new Date(); return d.getMonth() == 11 && d.getDate() >= 1 && d.getDate() <= 24; }
function startEvent4(server, id, forced) {
  let e = E4_POOL[id]; if (!e) return false;
  let st = null;
  try { st = e.start(server); } catch (x) { console.warn('[Festivity4] ' + id + ' failed: ' + x); return false; }
  if (!st) { e4log(id + ' found no spot'); return false; }
  st.id = id; st.day = E4.dayCount(server); st.start = E4.dayTime(server);
  let list = e4json(server, 'p4_events', []); list.push(st); e4save(server, 'p4_events', list);   // several forced events can stack; dawn ends them all
  try { if (festDirector()) festDirector().started(server, id); } catch (e) {}   // 0.9.37: tells the Director the start worked (else it picks again)
  E4.logEvent(server, 'Event: ' + e.name);
  e4log('event ' + id + (forced ? ' (forced)' : ''));
  return true;
}
// 0.9.37 Event Director (Festivity jar): Java rolls the Event Night and picks tonight's event, then runs it through /festivity event <id>.
var fest_DIR = null, fest_DIRtried = false;
function festDirector() {
  if (!fest_DIRtried) { fest_DIRtried = true; try { fest_DIR = Java.loadClass('com.chop.festivity.events.EventDirector'); } catch (e) { fest_DIR = null; } }
  return fest_DIR;
}
function rollEvent4(server) {
  let pool = e4pool(server); if (!pool.list.length) return;
  let en = festEventNight(server, pool.band);   // 0.9.36: Java rolls the Event Night (December chance lives in the jar config)
  if (en === null) {   // old jar: old chances
    let chance = e4isAdvent() ? 1 : pool.band == 'low' ? P4.NIGHT_CHANCE_LOW : pool.band == 'high' ? P4.NIGHT_CHANCE_HIGH : P4.NIGHT_CHANCE_QUIET;
    if (Math.random() > chance) { e4log('no event tonight (' + pool.band + ')'); return; }
  } else if (!en) { e4log('quiet night (' + pool.band + ')'); return; }
  let total = 0; for (let e of pool.list) total += e.w;
  let r = Math.random() * total;
  for (let e of pool.list) { r -= e.w; if (r <= 0) { if (!startEvent4(server, e.id, false)) { let rest = pool.list.filter(q => q.id != e.id && q.id != 'outpost' && q.id != 'spire'); if (rest.length) startEvent4(server, e4pick(rest).id, false); } return; } }
}
function endEvent4(server) {
  let list = e4json(server, 'p4_events', []); if (!list.length) return;
  for (let st of list) { let e = E4_POOL[st.id]; try { if (e && e.end) e.end(server, st); e4log('ended ' + st.id); } catch (x) { console.warn('[Festivity4] end ' + st.id + ': ' + x); } }
  E4.data(server).remove('p4_events');
  try { if (festDirector()) festDirector().ended(server); } catch (e) {}   // 0.9.37
  e4cmd(server, 'kill @e[tag=fest_e4]');
  E4.data(server).remove('p4_booby'); E4.data(server).remove('p4_thief');
}
let e4_lastRollDay = -1;
ServerEvents.tick(event => {
  let server = event.server;
  if (server.tickCount % 20 != 0) return;
  if (E4.onlineCount(server) == 0) return;
  if (E4.data(server).contains('claws')) clawsSmash(server);
  if (server.tickCount % 100 != 0) return;
  let t = E4.dayTime(server) % 24000, day = E4.dayCount(server);
  if (e4json(server, 'p4_spires', []).length) spireTick(server);
  if (server.tickCount % 200 == 0 && E4.data(server).contains('outpost')) outpostTick4(server);
  if (t >= 12500 && t < 13100 && day != e4_lastRollDay && !E4.inGrace(server)) {   // dusk, once per day
    e4_lastRollDay = day;
    if (!e4json(server, 'p4_events', []).length) { if (festDirector()) { try { festDirector().rollTonight(server); } catch (e) { rollEvent4(server); } } else rollEvent4(server); }   // 0.9.37: Director when present
  }
  if (t < 12000) { let list = e4json(server, 'p4_events', []), abs = E4.dayTime(server); for (let st of list) if (st.day != day || abs < (st.start || 0)) { endEvent4(server); break; } }   // daytime on another day, or time jumped backwards (/time set day on day 0)
});

// ================= commands: /festivity event <id> | roll | end | list =================
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event;
  let root = Commands.literal('event').requires(src => src.hasPermission(2));
  for (let id in E4_POOL) { let eid = id; root = root.then(Commands.literal(eid).executes(ctx => { let ok = startEvent4(ctx.source.server, eid, true); ctx.source.sendSuccess(Text.of('[Festivity] ' + eid + (ok ? ' started' : ' could not start (no spot?)')), true); return ok ? 1 : 0; })); }
  root = root.then(Commands.literal('roll').executes(ctx => { rollEvent4(ctx.source.server); return 1; }))
             .then(Commands.literal('end').executes(ctx => { endEvent4(ctx.source.server); return 1; }))
             .then(Commands.literal('nograce').executes(ctx => { E4.data(ctx.source.server).putLong('lastEmptyRealMs', 0); ctx.source.sendSuccess(Text.of('[Festivity] join grace cleared (debug): Phase 2 ticks, Claws approach, rolls and stage growth run now'), true); return 1; }))
             .then(Commands.literal('starbreak').executes(ctx => { let server = ctx.source.server, st = e4json(server, 'p4_star', null); if (!st) { let o = p2json(server, 'outpost', null); if (o && o.star) st = { star: o.star, x: o.x, y: o.y, z: o.z }; } if (!st) { ctx.source.sendSuccess(Text.of('[Festivity] no outpost star on record'), true); return 0; } starBroken(server, st, ctx.source.player, true); ctx.source.sendSuccess(Text.of('[Festivity] star break handler run for ' + st.star), true); return 1; }))
             .then(Commands.literal('freeelf').executes(ctx => { let p = ctx.source.player; if (!p) return 0; for (let i = 0; i < P4.FREED_ELVES; i++) spawnFreedElf(ctx.source.server, p.x + e4rnd(-3, 3), p.y, p.z + e4rnd(-3, 3), p.username); ctx.source.sendSuccess(Text.of('[Festivity] ' + P4.FREED_ELVES + ' Freed Elves summoned (debug look check)'), true); return 1; }))
             .then(Commands.literal('list').executes(ctx => { let ids = []; for (let id in E4_POOL) ids.push(id); ctx.source.sendSuccess(Text.of('[Festivity] events: ' + ids.join(', ') + ' | roll, end, nograce, starbreak, freeelf'), true); return 1; }));
  event.register(Commands.literal('festivity').then(root));
});

console.log('[Festivity] Phase 4 draft v11 loaded (secret santa cap ' + P4.SECRET_CAP + ', log ' + P4.LOG + '): ' + Object.keys(E4_POOL).length + ' events, staged outpost/spire, claws smash ' + P4.CLAWS_SMASH + ', freed elves ' + P4.FREED_ELVES + ', P2 auto-tower off (OUTPOST_AT ' + P2.OUTPOST_AT + ')');
