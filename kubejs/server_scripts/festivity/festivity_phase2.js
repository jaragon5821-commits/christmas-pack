// priority: 40
// ============================================================================================
//  FESTIVITY Phase 2  v0.3.0  - minions, Santy Claws (kidnapper), Giant Present, Claws Outpost,
//  colony raids, knock-down events, tokens, finale. Needs festivity.js (Phase 1) loaded first.
//  TEST ONLY. VILLAGER SAFETY: every minion is a mob type that never targets villagers (strays,
//  wither skeletons, endermites, bow-less skeletons, wolves, polar bear). No zombies, illagers or
//  ravagers anywhere, and nothing here writes to a villager or colonist.
//  v0.3.0: no CustomName on summons (NO NAMES rule), Cursed Star cleanup kills minions around the Outpost (not around
//  world spawn), a daytime Giant Present no longer pops open as "dawn" on its first tick, Grey Day meals null-safe.
//  v0.3.1: dawn sweep also runs the jar's `festivity clawsheal` (mod 0.7.0; silent Unknown command on older jars).
// ============================================================================================
if (typeof Fest == 'undefined') console.error('[Festivity] phase2 loaded before festivity.js; check script priorities');

const P2 = {
  VERSION: '0.3.1',
  MINION_INTERVAL_S: 120,         // seconds between spawn waves per player at night
  MINION_RADIUS: 24,              // spawn distance from the player
  MINION_CAP: 8,                  // our mobs alive within 48 blocks of a player
  CLAWS_HOUR: 18000,              // midnight
  CLAWS_PRESSURE: 30,             // pressure needed to drive him off
  CLAWS_HIT_PRESSURE: 5,          // pressure per player hit (Resistance V makes applied damage 0, so count hits: 6 hits drive him off)
  CLAWS_SPEED: 1.6,               // blocks per second he glides toward his target
  CARRY_SECONDS: 6,
  BOX_MIN_DIST: 60, BOX_MAX_DIST: 100,
  RESCUER_RANGE: 1000,
  SOLO_OPEN_S: 60, RESCUER_HOLD_S: 300, WRIGGLE_JUMPS: 40,
  OUTPOST_AT: 30, OUTPOST_MIN: 90, OUTPOST_MAX: 140,
  RAID_EVERY_N_NIGHTS: 2,
  // MineColonies 1.21 syntax (source, CommandRaid.java): mc colony raid <colonyID|all> <now|tonight> [<type> [ships] [amount] [location]]
  RAID_CMD: 'mc colony raid all now minecolonies:barbarian_raid false',
  KNOCKDOWN_CHANCE: { 60: 0.05, 80: 0.15, 95: 0.30 },
  TOKEN_BAND_MAX: 49,
  MINIONS: {
    grumbling: [{ n: 3, id: 'minecraft:stray', name: 'Sour Elf', tags: 'fest_t1', nbt: '{HandItems:[{id:"minecraft:stick",count:1},{}],HandDropChances:[0f,0f],ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",count:1,components:{"minecraft:dyed_color":{rgb:2263842}}}],active_effects:[{id:"minecraft:speed",amplifier:0,duration:-1}]}' }],   // stick, not bow: no arrows near colonists
    bleak:     [{ n: 2, id: 'minecraft:wither_skeleton', name: 'Nutcracker Soldier', tags: 'fest_t2', nbt: '{HandItems:[{id:"minecraft:iron_axe",count:1},{}],ArmorItems:[{},{},{id:"minecraft:iron_chestplate",count:1},{id:"minecraft:iron_helmet",count:1}],active_effects:[{id:"minecraft:slowness",amplifier:0,duration:-1}]}' },
                { n: 6, id: 'minecraft:endermite', name: 'Coal Gnome', tags: 'fest_t2', nbt: '{Lifetime:0,active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1}]}' }],
    clawseve:  [{ n: 3, id: 'minecraft:skeleton', name: 'Rotten Gingerbread Man', tags: 'fest_t3', nbt: '{HandItems:[{id:"minecraft:wooden_sword",count:1},{}],active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1}]}' },
                { n: 2, id: 'minecraft:wolf', name: 'Frost Hound', tags: 'fest_t3 fest_hound', nbt: '{AngerTime:999999,active_effects:[{id:"minecraft:speed",amplifier:0,duration:-1}]}' }],
    clawsnight:[{ n: 2, id: 'minecraft:wolf', name: 'Frost Hound', tags: 'fest_t3 fest_hound', nbt: '{AngerTime:999999}' }]
  }
};
const Q = Fest;   // Phase 1 table

// ---------- small helpers ----------
function p2data(server) { return Q.data(server); }
function p2json(server, key, fb) { return Q.readJson(server, key, fb); }
function p2save(server, key, obj) { p2data(server).putString(key, JSON.stringify(obj)); }
function isNight(server) { let t = Q.dayTime(server) % 24000; return t >= 13000 && t <= 23000; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function surfaceY(level, x, z) {
  // highest non-air block from y=200 down; returns the y of the first air block above it
  for (let y = 200; y > 40; y--) {
    try { let b = level.getBlock(x, y, z); if (b.id != 'minecraft:air' && b.id != 'minecraft:cave_air' && !b.id.endsWith('_leaves') && !b.id.includes('snow_layer')) return y + 1; } catch (e) {}
  }
  return 70;
}
function dist(a, b) { let dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
// NO NAMES rule: no CustomName on any mob (skins key on Tags / synced Variant NBT). `name` stays in the signature because
// every caller and Phase 5's redefinition pass it; it is only a label for the code reader now.
function summon(server, id, x, y, z, name, tags, nbt) {
  let extra = nbt && nbt.length > 2 ? nbt.substring(1, nbt.length - 1) : '';
  let tagList = ('fest_minion ' + (tags || '')).trim().split(' ').map(t => '"' + t + '"').join(',');
  let full = '{PersistenceRequired:1b,Tags:[' + tagList + ']' + (extra ? ',' + extra : '') + '}';
  return Q.cmd(server, 'summon ' + fid(id) + ' ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' ' + full);
}
function ourMobsNear(p, r) {
  let n = 0;
  try { for (let e of p.level.getEntitiesWithin(AABB.of(p.x - r, p.y - r, p.z - r, p.x + r, p.y + r, p.z + r))) if (e.tags && e.tags.contains('fest_minion')) n++; } catch (e) {}
  return n;
}
// Search near a known position first (cheap); fall back to the whole world only when nothing is there.
function findByTag(server, tag, near, r) {
  let out = [];
  try {
    if (near) {
      r = r || 192;
      for (let e of server.overworld().getEntitiesWithin(AABB.of(near.x - r, -64, near.z - r, near.x + r, 320, near.z + r))) if (e.tags && e.tags.contains(tag)) out.push(e);
      if (out.length) return out;
    }
    for (let e of server.overworld().getEntitiesWithin(AABB.of(-30000000, -64, -30000000, 30000000, 320, 30000000))) if (e.tags && e.tags.contains(tag)) out.push(e);
  } catch (x) {}
  return out;
}
function tokensOn(server) { return Q.value(server) <= P2.TOKEN_BAND_MAX; }
function dropItem(server, x, y, z, item, count) { Q.cmd(server, 'summon minecraft:item ' + x + ' ' + (y + 0.5) + ' ' + z + ' {Item:{id:"' + item + '",count:' + (count || 1) + '}}'); }

// ---------- minion waves (night only, bands Grumbling and below, never in grace, never when empty) ----------
ServerEvents.tick(event => {
  let server = event.server;
  if (server.tickCount % 20 != 0) return;
  if (Q.onlineCount(server) == 0) return;
  let d = p2data(server), band = Q.band(server);
  let night = isNight(server);
  // dawn cleanup: our minions never outlive the night
  if (!night && d.getBoolean('p2_night')) {
    d.putBoolean('p2_night', false);
    Q.cmd(server, 'kill @e[tag=fest_minion,tag=!fest_claws]');
    clawsLeave(server, 'dawn');
    d.putBoolean('p2_clawsTonight', false);
    // mod 0.7.0 command; harmless Unknown command on older jars (silent)
    try { server.runCommandSilent('festivity clawsheal'); } catch (e) {}
  }
  if (night && !d.getBoolean('p2_night')) d.putBoolean('p2_night', true);
  if (!night || Q.inGrace(server) || d.getBoolean('frozen')) return;
  let list = P2.MINIONS[band.id]; if (!list) return;
  for (let p of Q.online(server)) {
    if (String(p.level.dimension) != 'minecraft:overworld') continue;
    let last = p.persistentData.getLong('fest_lastWave') || 0;
    if (Q.nowMs() - last < P2.MINION_INTERVAL_S * 1000) continue;
    p.persistentData.putLong('fest_lastWave', Q.nowMs());
    if (ourMobsNear(p, 48) >= P2.MINION_CAP) continue;
    let ang = Math.random() * Math.PI * 2;
    let x = p.x + Math.cos(ang) * P2.MINION_RADIUS, z = p.z + Math.sin(ang) * P2.MINION_RADIUS;
    let y = surfaceY(p.level, Math.floor(x), Math.floor(z));
    for (let m of list) for (let i = 0; i < m.n; i++) summon(server, m.id, x + rnd(-2, 2), y, z + rnd(-2, 2), m.name, m.tags, m.nbt);
    Q.cmd(server, 'playsound minecraft:block.bell.use master ' + p.username + ' ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' 0.5 0.6');
  }
  // Santy Claws at midnight on Claws Night
  if (band.id == 'clawsnight' && !d.getBoolean('p2_clawsTonight')) {
    let t = Q.dayTime(server) % 24000;
    if (t >= P2.CLAWS_HOUR && t < P2.CLAWS_HOUR + 600) { d.putBoolean('p2_clawsTonight', true); clawsArrive(server, false); }
  }
  if (d.contains('claws')) clawsTick(server);                            // nothing parsed unless he is out
  if (d.contains('claws') || d.contains('box')) boxTick(server);
  if (server.tickCount % 200 == 0) outpostTick(server);
});

// Frost Hounds freeze on bite; minion kills reward the killer; coal tokens while the bar is low
EntityEvents.afterHurt(event => {
  try {
    let src = event.source, a = src ? src.actual : null;
    if (a && a.tags && a.tags.contains('fest_hound') && event.entity.isPlayer()) Q.cmd(event.entity.server, 'effect give ' + event.entity.username + ' minecraft:slowness 3 1 true');
  } catch (e) {}
});
EntityEvents.death(event => {
  let e = event.entity; if (!e.tags || !e.tags.contains('fest_minion') || e.tags.contains('fest_claws')) return;
  let src = event.source, p = src ? src.player : null;
  let server = e.server;
  if (p && p.isPlayer()) {
    Q.score(server, p, 'rescue_minion', 1, 'drove off a minion');
    if (tokensOn(server) && Math.random() < 0.6) dropItem(server, e.x, e.y, e.z, 'chop:coal_token', 1);
  }
});

// ---------- Santy Claws ----------
function worstOnline(server) {
  let worst = null, score = -1;
  for (let p of Q.online(server)) {
    if (String(p.level.dimension) != 'minecraft:overworld') continue;
    if (p.persistentData.getBoolean('fest_kidnappedLastNight')) continue;
    let L = Q.ledgerOf(server, p), s = Q.badScore(L.me) + Math.random() * 0.01;
    if (s > score) { score = s; worst = p; }
  }
  return worst;
}
function clawsArrive(server, finale) {
  let target = worstOnline(server); if (!target) return;
  let ang = Math.random() * Math.PI * 2;
  let x = target.x + Math.cos(ang) * 40, z = target.z + Math.sin(ang) * 40, y = surfaceY(target.level, Math.floor(x), Math.floor(z));
  Q.cmd(server, 'kill @e[tag=fest_claws]');
  summon(server, 'minecraft:polar_bear', x, y, z, 'Santy Claws', 'fest_claws',
    '{Health:400f,attributes:[{id:"minecraft:generic.max_health",base:400},{id:"minecraft:generic.movement_speed",base:0.0}],active_effects:[{id:"minecraft:resistance",amplifier:4,duration:-1,show_particles:0b},{id:"minecraft:fire_resistance",amplifier:0,duration:-1,show_particles:0b}]}');
  summon(server, 'minecraft:wolf', x + 2, y, z, 'Frost Hound', 'fest_t3 fest_hound', '{AngerTime:999999}');
  summon(server, 'minecraft:wolf', x - 2, y, z, 'Frost Hound', 'fest_t3 fest_hound', '{AngerTime:999999}');
  p2save(server, 'claws', { target: target.username, pressure: 0, since: Q.nowMs(), finale: !!finale, kidnaps: 0, hitters: {} });
  Q.cmd(server, 'title @a title ' + Q.jsonText('Santy Claws is here', 'dark_red'));
  Q.cmd(server, 'title @a subtitle ' + Q.jsonText('He has come for ' + target.username, 'gray'));
  Q.cmd(server, 'playsound minecraft:block.chain.break master @a ~ ~ ~ 1 0.5');
  Q.cmd(server, 'playsound minecraft:entity.wither.spawn master @a ~ ~ ~ 0.4 0.6');
  Q.logEvent(server, 'Santy Claws came for ' + target.username);
}
function clawsEntity(server) {
  let c = p2json(server, 'claws', null);
  let l = findByTag(server, 'fest_claws', c && c.lastPos ? c.lastPos : null, 192);
  return l.length ? l[0] : null;
}
function clawsLeave(server, why) {
  let c = p2json(server, 'claws', null); if (!c) return;
  Q.cmd(server, 'kill @e[tag=fest_claws]');
  Q.cmd(server, 'kill @e[tag=fest_hound]');
  p2data(server).remove('claws');
  if (why == 'driven') {
    Q.announce(server, 'Santy Claws has been driven off!', 'green');
    Q.change(server, 5, 'rescue', null, null);
    for (let name in c.hitters) for (let p of Q.online(server)) if (p.username == name) { Q.cmd(server, 'give ' + name + ' chop:ribbon_token 2'); }   // Claws Horn left out for now (Josh 11-08)
    Q.logEvent(server, 'Santy Claws was driven off');
  } else if (why == 'dawn') {
    Q.announce(server, 'Santy Claws slinks away at dawn.', 'gray');
  }
  for (let p of Q.online(server)) p.persistentData.putBoolean('fest_kidnappedLastNight', false);
}
function clawsTick(server) {
  let c = p2json(server, 'claws', null); if (!c) return;
  let bear = clawsEntity(server); if (!bear) { p2data(server).remove('claws'); return; }
  c.lastPos = { x: Math.floor(bear.x), z: Math.floor(bear.z) };                 // hint for the next cheap lookup
  if (c.carrying) { p2save(server, 'claws', c); return; }                                               // carry phase handled in boxTick
  let target = null; for (let p of Q.online(server)) if (p.username == c.target) target = p;
  if (!target || String(target.level.dimension) != 'minecraft:overworld') { target = worstOnline(server); if (!target) { clawsLeave(server, 'nobody'); return; } c.target = target.username; }
  // glide toward the target
  let dx = target.x - bear.x, dz = target.z - bear.z, h = Math.sqrt(dx * dx + dz * dz);
  if (h > 2.2) {
    let step = Math.min(P2.CLAWS_SPEED, h - 1.5);
    let nx = bear.x + dx / h * step, nz = bear.z + dz / h * step;
    let ny = surfaceY(server.overworld(), Math.floor(nx), Math.floor(nz));
    if (Math.abs(ny - bear.y) > 6) ny = bear.y;
    Q.cmd(server, 'tp @e[tag=fest_claws,limit=1] ' + nx.toFixed(2) + ' ' + ny + ' ' + nz.toFixed(2));
    if (server.tickCount % 60 == 0) Q.cmd(server, 'playsound minecraft:block.chain.step master ' + target.username + ' ' + Math.floor(bear.x) + ' ' + Math.floor(bear.y) + ' ' + Math.floor(bear.z) + ' 1 0.5');
  } else {
    let others = Q.onlineCount(server) - 1;
    if (others >= 1 && !c.finaleDone) { startKidnap(server, c, target, bear); }
    else { Q.cmd(server, 'damage ' + target.username + ' 6 minecraft:mob_attack by @e[tag=fest_claws,limit=1]'); Q.cmd(server, 'playsound minecraft:entity.polar_bear.warning master ' + target.username); }
  }
  p2save(server, 'claws', c);
}
// pressure: hits on Santy Claws count toward driving him off
EntityEvents.afterHurt(event => {
  try {
    let e = event.entity; if (!e.tags || !e.tags.contains('fest_claws')) return;
    let server = e.server, c = p2json(server, 'claws', null); if (!c) return;
    let p = event.source ? event.source.player : null;
    if (!p || !p.isPlayer()) return;                                    // only player hits count (not fall/fire/minions)
    let amt = P2.CLAWS_HIT_PRESSURE;
    c.pressure += amt;
    c.hitters[p.username] = (c.hitters[p.username] || 0) + amt;
    Q.cmd(server, 'effect give @e[tag=fest_claws] minecraft:slowness 2 4 true');
    Q.cmd(server, 'playsound minecraft:block.anvil.land master @a ' + Math.floor(e.x) + ' ' + Math.floor(e.y) + ' ' + Math.floor(e.z) + ' 0.5 0.5');
    if (c.pressure >= P2.CLAWS_PRESSURE) { p2save(server, 'claws', c); clawsLeave(server, 'driven'); return; }
    p2save(server, 'claws', c);
  } catch (err) {}
});

// ---------- kidnap: carry, Giant Present, rescue, wriggle, anti-breakout ----------
function startKidnap(server, c, target, bear) {
  let ang = Math.random() * Math.PI * 2, r = rnd(P2.BOX_MIN_DIST, P2.BOX_MAX_DIST);
  let bx = Math.floor(target.x + Math.cos(ang) * r), bz = Math.floor(target.z + Math.sin(ang) * r);
  let by = surfaceY(server.overworld(), bx, bz) + 2;                   // box centre y (floor at by-2)
  c.carrying = { victim: target.username, bx: bx, by: by, bz: bz, started: Q.nowMs() };
  c.kidnaps = (c.kidnaps || 0) + 1;
  p2save(server, 'claws', c);
  Q.cmd(server, 'ride ' + target.username + ' mount @e[tag=fest_claws,limit=1]');
  Q.cmd(server, 'title ' + target.username + ' title ' + Q.jsonText('Grabbed!', 'dark_red'));
  Q.announce(server, 'Santy Claws grabbed ' + target.username + '!', 'red');
  Q.cmd(server, 'playsound minecraft:entity.player.hurt_sweet_berry_bush master @a ~ ~ ~ 1 0.5');
  Q.logEvent(server, target.username + ' was kidnapped by Santy Claws');
}
function placeBox(server, b) {
  let x = b.bx, y = b.by, z = b.bz;
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y - 2) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 2) + ' ' + (z + 2) + ' minecraft:red_concrete hollow');
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y - 2) + ' ' + z + ' ' + (x + 2) + ' ' + (y + 2) + ' ' + z + ' minecraft:white_concrete replace minecraft:red_concrete');
  Q.cmd(server, 'fill ' + x + ' ' + (y - 2) + ' ' + (z - 2) + ' ' + x + ' ' + (y + 2) + ' ' + (z + 2) + ' minecraft:white_concrete replace minecraft:red_concrete');
  Q.cmd(server, 'setblock ' + x + ' ' + (y + 3) + ' ' + z + ' minecraft:red_wool');          // the Ribbon Knot
  Q.cmd(server, 'setblock ' + x + ' ' + (y + 1) + ' ' + z + ' minecraft:light[level=4]');
}
function removeBox(server, b) {
  let x = b.bx, y = b.by, z = b.bz;
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y - 2) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 3) + ' ' + (z + 2) + ' minecraft:air replace minecraft:red_concrete');
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y - 2) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 3) + ' ' + (z + 2) + ' minecraft:air replace minecraft:white_concrete');
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y - 2) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 3) + ' ' + (z + 2) + ' minecraft:air replace minecraft:red_wool');
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y - 2) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 3) + ' ' + (z + 2) + ' minecraft:air replace minecraft:light');
  Q.cmd(server, 'particle minecraft:firework ' + x + ' ' + (y + 2) + ' ' + z + ' 2 2 2 0.1 80');
  Q.cmd(server, 'playsound minecraft:entity.firework_rocket.twinkle master @a ' + x + ' ' + y + ' ' + z + ' 1 1');
}
function trapped(server) { return p2json(server, 'box', null); }
function rescuerAvailable(server, b) {
  for (let p of Q.online(server)) {
    if (p.username == b.victim) continue;
    if (String(p.level.dimension) != 'minecraft:overworld') continue;
    if (dist(p, { x: b.bx, y: b.by, z: b.bz }) <= P2.RESCUER_RANGE) return true;
  }
  return false;
}
function release(server, b, how, rescuer) {
  removeBox(server, b);
  p2data(server).remove('box');
  let victim = null; for (let p of Q.online(server)) if (p.username == b.victim) victim = p;
  if (victim) {
    Q.cmd(server, 'effect clear ' + b.victim + ' minecraft:mining_fatigue');
    Q.cmd(server, 'effect clear ' + b.victim + ' minecraft:weakness');
    victim.persistentData.putBoolean('fest_trapped', false);
    victim.persistentData.putBoolean('fest_kidnappedLastNight', true);
  }
  let msg = how == 'rescued' ? b.victim + ' was rescued by ' + rescuer : how == 'wriggled' ? b.victim + ' wriggled free!' : how == 'dawn' ? 'The present opened at dawn. ' + b.victim + ' is free.' : 'The present opened. ' + b.victim + ' is free.';
  Q.announce(server, msg, 'green');
  Q.logEvent(server, msg);
  if (how == 'rescued' && rescuer) {
    for (let p of Q.online(server)) if (p.username == rescuer) { Q.score(server, p, 'rescue_player', 1, 'rescued ' + b.victim); Q.cmd(server, 'give ' + rescuer + ' chop:ribbon_token 1'); }
  }
  let c = p2json(server, 'claws', null);
  if (c) { if (c.finale && c.kidnaps < 3) { c.carrying = null; p2save(server, 'claws', c); } else clawsLeave(server, 'done'); }
}
function boxTick(server) {
  let c = p2json(server, 'claws', null);
  // carry phase: victim rides the bear, bear glides to the box site
  if (c && c.carrying) {
    let b = c.carrying, bear = clawsEntity(server);
    let victim = null; for (let p of Q.online(server)) if (p.username == b.victim) victim = p;
    if (!bear || !victim) { c.carrying = null; p2save(server, 'claws', c); return; }
    c.lastPos = { x: Math.floor(bear.x), z: Math.floor(bear.z) };
    let dx = b.bx - bear.x, dz = b.bz - bear.z, h = Math.sqrt(dx * dx + dz * dz);
    let elapsed = (Q.nowMs() - b.started) / 1000;
    if (h > 3 && elapsed < P2.CARRY_SECONDS * 3) {
      let step = Math.min(h, Math.max(3, h / Math.max(1, P2.CARRY_SECONDS - elapsed)));
      let nx = bear.x + dx / h * step, nz = bear.z + dz / h * step, ny = surfaceY(server.overworld(), Math.floor(nx), Math.floor(nz));
      Q.cmd(server, 'tp @e[tag=fest_claws,limit=1] ' + nx.toFixed(2) + ' ' + ny + ' ' + nz.toFixed(2));
      Q.cmd(server, 'ride ' + b.victim + ' mount @e[tag=fest_claws,limit=1]');
      p2save(server, 'claws', c);
      return;
    }
    // arrived: build the present and stuff the victim in
    Q.cmd(server, 'ride ' + b.victim + ' dismount');
    placeBox(server, b);
    Q.cmd(server, 'tp ' + b.victim + ' ' + b.bx + ' ' + (b.by - 1) + ' ' + b.bz);
    victim.persistentData.putBoolean('fest_trapped', true);
    victim.persistentData.putInt('fest_wriggle', 0);
    p2save(server, 'box', { victim: b.victim, bx: b.bx, by: b.by, bz: b.bz, since: Q.nowMs(), soloSince: 0, knot: (b.bx + ',' + (b.by + 3) + ',' + b.bz), nightBox: isNight(server) });
    c.carrying = null; p2save(server, 'claws', c);
    Q.cmd(server, 'tp @e[tag=fest_claws,limit=1] ' + (b.bx + 6) + ' ' + (b.by - 2) + ' ' + (b.bz + 6));
    Q.cmd(server, 'title ' + b.victim + ' title ' + Q.jsonText('Wrapped up!', 'dark_red'));
    Q.cmd(server, 'title ' + b.victim + ' subtitle ' + Q.jsonText('Friends can break the red knot on top. Alone? Jump to wriggle free.', 'gray'));
    Q.cmd(server, 'tellraw @a ' + Q.jsonText(b.victim + ' is wrapped in a Giant Present at ' + b.bx + ' ' + b.by + ' ' + b.bz + '. Break the Ribbon Knot on top to free them!', 'gold'));
    return;
  }
  let b = trapped(server); if (!b) return;
  let victim = null; for (let p of Q.online(server)) if (p.username == b.victim) victim = p;
  let avail = rescuerAvailable(server, b), now = Q.nowMs();
  if (!avail) { if (!b.soloSince) b.soloSince = now; } else b.soloSince = 0;
  if (victim) {
    if (dist(victim, { x: b.bx, y: b.by, z: b.bz }) > 3) Q.cmd(server, 'tp ' + b.victim + ' ' + b.bx + ' ' + (b.by - 1) + ' ' + b.bz);
    Q.cmd(server, 'effect give ' + b.victim + ' minecraft:mining_fatigue 3 2 true');
    Q.cmd(server, 'effect give ' + b.victim + ' minecraft:weakness 3 0 true');
    Q.cmd(server, 'effect give ' + b.victim + ' minecraft:saturation 3 0 true');
    if (!avail) Q.cmd(server, 'title ' + b.victim + ' actionbar ' + Q.jsonText('Nobody near. Jump to wriggle free: ' + victim.persistentData.getInt('fest_wriggle') + '/' + P2.WRIGGLE_JUMPS, 'yellow'));
    else if (server.tickCount % 100 == 0) Q.cmd(server, 'title ' + b.victim + ' actionbar ' + Q.jsonText('Help is within reach. Hold on!', 'yellow'));
  }
  // dawn opens a present that was wrapped at night; a daytime box (Phase 5 daytime Claws, op tests) waits for the solo / hold timers
  if (b.nightBox !== false && !isNight(server)) { release(server, b, 'dawn'); return; }
  if (!avail && now - b.soloSince > P2.SOLO_OPEN_S * 1000) { release(server, b, 'solo'); return; }
  if (now - b.since > P2.RESCUER_HOLD_S * 1000) { release(server, b, 'timer'); return; }
  p2save(server, 'box', b);
}
// jumps = wriggling (only counts when no rescuer is available)
PlayerEvents.tick(event => {
  let p = event.player;
  if (!p.persistentData.getBoolean('fest_trapped')) return;
  let server = p.server, b = trapped(server); if (!b || b.victim != p.username) return;
  let lastY = p.persistentData.getDouble('fest_lastY'), onG = p.persistentData.getBoolean('fest_lastOnGround');
  if (onG && p.y - lastY > 0.3 && b.soloSince) {
    let w = p.persistentData.getInt('fest_wriggle') + 1; p.persistentData.putInt('fest_wriggle', w);
    Q.cmd(server, 'playsound minecraft:block.wool.hit master ' + p.username + ' ~ ~ ~ 1 ' + (0.8 + w / P2.WRIGGLE_JUMPS));
    if (w >= P2.WRIGGLE_JUMPS) release(server, b, 'wriggled');
  }
  p.persistentData.putDouble('fest_lastY', p.y);
  p.persistentData.putBoolean('fest_lastOnGround', p.onGround ? true : false);
});
// anti-breakout + rescue by knot
BlockEvents.broken(event => {
  let p = event.player; if (!p) return;
  let server = p.server, b = trapped(server); if (!b) return;
  if (p.username == b.victim) { event.cancel(); return; }
  let key = event.block.x + ',' + event.block.y + ',' + event.block.z;
  if (key == b.knot) { event.cancel(); release(server, b, 'rescued', p.username); return; }
  // rescuers may only break the knot, not the walls
  if (Math.abs(event.block.x - b.bx) <= 2 && Math.abs(event.block.y - b.by) <= 2 && Math.abs(event.block.z - b.bz) <= 2) { event.cancel(); Q.cmd(server, 'title ' + p.username + ' actionbar ' + Q.jsonText('Break the red knot on top!', 'yellow')); }
});
BlockEvents.placed(event => {
  let p = event.entity; if (!p || !p.isPlayer()) return;
  if (p.persistentData.getBoolean('fest_trapped')) event.cancel();
});
ItemEvents.rightClicked(event => {
  let p = event.player; if (!p || !p.persistentData.getBoolean('fest_trapped')) return;
  if (event.item.hasTag('chop:teleport_items')) { event.cancel(); Q.cmd(p.server, 'title ' + p.username + ' actionbar ' + Q.jsonText('The ribbon holds tight.', 'red')); }
});
ServerEvents.command(event => {
  try {
    let p = event.player; if (!p || !p.persistentData.getBoolean('fest_trapped')) return;
    let name = String(event.commandName || '').toLowerCase();
    if (['tp', 'teleport', 'home', 'sethome', 'back', 'warp', 'spawn', 'rtp', 'tpa', 'tpaccept', 'waystones', 'kill', 'suicide'].indexOf(name) >= 0) { event.cancel(); p.tell(Text.of('The ribbon holds tight.').red()); }
  } catch (e) {}
});
LevelEvents.beforeExplosion(event => {
  try {
    let server = event.level.server, b = trapped(server); if (!b) return;
    if (dist({ x: event.x, y: event.y, z: event.z }, { x: b.bx, y: b.by, z: b.bz }) < 8) event.cancel();
  } catch (e) {}
});
PlayerEvents.loggedIn(event => {
  let p = event.player, server = p.server, b = trapped(server);
  if (b && b.victim == p.username) server.scheduleInTicks(40, () => { Q.cmd(server, 'tp ' + p.username + ' ' + b.bx + ' ' + (b.by - 1) + ' ' + b.bz); });
  else if (p.persistentData.getBoolean('fest_trapped')) p.persistentData.putBoolean('fest_trapped', false);
});
// Dying inside the present is not a way out (Cinematic Respawn makes bed respawns instant): back in the box, no Festivity cost.
PlayerEvents.respawned(event => {
  try {
    let p = event.player, server = p.server, b = trapped(server);
    if (!b || b.victim != p.username) return;
    server.scheduleInTicks(5, () => {
      Q.cmd(server, 'tp ' + p.username + ' ' + b.bx + ' ' + (b.by - 1) + ' ' + b.bz);
      Q.cmd(server, 'title ' + p.username + ' actionbar ' + Q.jsonText('Santy Claws stuffs you right back in the present!', 'red'));
      Q.cmd(server, 'playsound minecraft:entity.polar_bear.warning master ' + p.username);
    });
  } catch (e) {}
});

// ---------- Claws Outpost (30 and below) ----------
function outpostTick(server) {
  let d = p2data(server), v = Q.value(server), o = p2json(server, 'outpost', null);
  if (!o && v <= P2.OUTPOST_AT) {
    let anchor = null; for (let p of Q.online(server)) if (String(p.level.dimension) == 'minecraft:overworld') { anchor = p; break; }
    if (!anchor) return;
    let ang = Math.random() * Math.PI * 2, r = rnd(P2.OUTPOST_MIN, P2.OUTPOST_MAX);
    let x = Math.floor(anchor.x + Math.cos(ang) * r), z = Math.floor(anchor.z + Math.sin(ang) * r), y = surfaceY(server.overworld(), x, z);
    buildOutpost(server, x, y, z);
    p2save(server, 'outpost', { x: x, y: y, z: z, star: (x + ',' + (y + 7) + ',' + z), built: Q.nowMs(), lastRaidDay: -1 });
    Q.announce(server, 'A crooked tower has risen in the dark: a Claws Outpost, ' + Math.round(r) + ' blocks from ' + anchor.username + '. Break its Cursed Star.', 'red');
    Q.logEvent(server, 'A Claws Outpost appeared at ' + x + ' ' + y + ' ' + z);
    Q.cmd(server, 'playsound minecraft:entity.wither.spawn master @a ~ ~ ~ 0.3 0.5');
    return;
  }
  if (!o) return;
  if (isNight(server) && !Q.inGrace(server)) {
    // the Outpost breathes minions each night
    if (server.tickCount % 1200 == 0) {
      let band = Q.band(server), list = P2.MINIONS[band.id] || P2.MINIONS.bleak;
      for (let m of list) for (let i = 0; i < Math.ceil(m.n / 2); i++) summon(server, m.id, o.x + rnd(-8, 8), o.y, o.z + rnd(-8, 8), m.name, m.tags, m.nbt);
    }
    // raids at Claws' Eve and below, every N nights, through MineColonies' own raid system
    let day = Q.dayCount(server), band = Q.band(server);
    if ((band.id == 'clawseve' || band.id == 'clawsnight') && o.lastRaidDay != day && day % P2.RAID_EVERY_N_NIGHTS == 0) {
      o.lastRaidDay = day; p2save(server, 'outpost', o);
      Q.cmd(server, P2.RAID_CMD);                                                // runCommandSilent returns nothing in KubeJS 2101; MineColonies prints its own raid message
      Q.announce(server, 'The Outpost sends raiders against the colony tonight!', 'red');
      Q.logEvent(server, 'The Claws Outpost raided the colony');
      Q.cmd(server, 'particle minecraft:flame ' + o.x + ' ' + (o.y + 8) + ' ' + o.z + ' 1 3 1 0.1 200');
      console.log('[Festivity] Outpost raid requested: ' + P2.RAID_CMD);
    }
  }
}
function buildOutpost(server, x, y, z) {
  // a 5x5 crooked tower of blackstone with a red stripe and a Cursed Star (spawner) on top
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + y + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 6) + ' ' + (z + 2) + ' minecraft:polished_blackstone_bricks hollow');
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y + 3) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 3) + ' ' + (z + 2) + ' minecraft:red_nether_bricks replace minecraft:polished_blackstone_bricks');
  Q.cmd(server, 'fill ' + (x - 1) + ' ' + y + ' ' + (z - 2) + ' ' + (x + 1) + ' ' + (y + 1) + ' ' + (z - 2) + ' minecraft:air');     // door hole
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y + 7) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y + 7) + ' ' + (z + 2) + ' minecraft:blackstone_wall');
  Q.cmd(server, 'setblock ' + x + ' ' + (y + 7) + ' ' + z + ' minecraft:spawner{SpawnData:{entity:{id:"' + fid('minecraft:endermite') + '",Tags:["fest_minion","fest_t2"]}},MinSpawnDelay:400,MaxSpawnDelay:800,SpawnCount:2,MaxNearbyEntities:6,RequiredPlayerRange:32}');
  Q.cmd(server, 'setblock ' + x + ' ' + (y + 8) + ' ' + z + ' minecraft:soul_lantern');
  Q.cmd(server, 'fill ' + (x - 2) + ' ' + (y - 1) + ' ' + (z - 2) + ' ' + (x + 2) + ' ' + (y - 1) + ' ' + (z + 2) + ' minecraft:soul_soil');
}
BlockEvents.broken(event => {
  let p = event.player; if (!p) return;
  let server = p.server, o = p2json(server, 'outpost', null); if (!o) return;
  let key = event.block.x + ',' + event.block.y + ',' + event.block.z;
  if (key != o.star) return;
  p2data(server).remove('outpost');
  // the server command source sits at world spawn: anchor the radius on the Outpost, not on the source
  Q.cmd(server, 'kill @e[tag=fest_minion,tag=!fest_claws,x=' + o.x + ',y=' + o.y + ',z=' + o.z + ',distance=..40]');
  Q.cmd(server, 'particle minecraft:explosion ' + o.x + ' ' + (o.y + 7) + ' ' + o.z + ' 1 1 1 0 10');
  Q.cmd(server, 'playsound minecraft:entity.generic.explode master @a ' + o.x + ' ' + o.y + ' ' + o.z + ' 1 0.7');
  Q.score(server, p, 'cursed_star', 1, 'broke the Cursed Star');
  Q.cmd(server, 'give ' + p.username + ' chop:ribbon_token 1');
  dropItem(server, event.block.x, event.block.y, event.block.z, 'minecraft:coal', 16);
  Q.announce(server, p.username + ' shattered the Cursed Star. The Outpost is silent.', 'green');
  Q.logEvent(server, p.username + ' destroyed the Claws Outpost');
});

// ---------- knock-down events (Merry and up, rolled once per in-game day, never in grace) ----------
let p2_lastRollDay = -1;
ServerEvents.tick(event => {
  let server = event.server;
  if (server.tickCount % 100 != 0) return;
  if (Q.onlineCount(server) == 0 || Q.inGrace(server)) return;
  let day = Q.dayCount(server), v = Q.value(server), d = p2data(server);
  let ev = d.contains('event') ? p2json(server, 'event', null) : null;
  // run the active event
  if (ev) {
    if (ev.type == 'blizzard' && !isNight(server) && ev.started < Q.nowMs() - 60000) { endEvent(server, ev, 'The blizzard clears.'); return; }
    if (ev.type == 'greyday' && isNight(server)) { endEvent(server, ev, 'The grey day ends.'); return; }
    if (ev.type == 'gnomes') {
      let alive = findByTag(server, 'fest_swarm', ev.spawner, 96).length;
      if (!isNight(server) && ev.started < Q.nowMs() - 60000) { if (alive > 0) Q.change(server, -0.3 * alive, 'event', null, null); Q.cmd(server, 'kill @e[tag=fest_swarm]'); endEvent(server, ev, 'The Coal Gnomes scatter at dawn' + (alive ? ' (-' + (0.3 * alive).toFixed(1) + ' for the ' + alive + ' that lived).' : '.')); return; }
      let sp = p2json(server, 'event', null).spawner;
      try { let b = server.overworld().getBlock(sp.x, sp.y, sp.z); if (b.id != 'minecraft:spawner') { Q.cmd(server, 'kill @e[tag=fest_swarm]'); Q.change(server, 2, 'event', null, null); endEvent(server, ev, 'The Coal Spawner is broken. +2'); return; } } catch (e) {}
    }
    return;
  }
  if (day == p2_lastRollDay || v < 60 || isNight(server)) return;
  p2_lastRollDay = day;
  let chance = v >= 95 ? P2.KNOCKDOWN_CHANCE[95] : v >= 80 ? P2.KNOCKDOWN_CHANCE[80] : P2.KNOCKDOWN_CHANCE[60];
  if (Math.random() > chance) return;
  let pick = ['gnomes', 'blizzard', 'greyday'][Math.floor(Math.random() * 3)];
  startEvent(server, pick);
});
function startEvent(server, type) {
  let ev = { type: type, started: Q.nowMs() };
  if (type == 'gnomes') {
    let anchor = null; for (let p of Q.online(server)) if (String(p.level.dimension) == 'minecraft:overworld') { anchor = p; break; }
    if (!anchor) return;
    let ang = Math.random() * Math.PI * 2, x = Math.floor(anchor.x + Math.cos(ang) * 30), z = Math.floor(anchor.z + Math.sin(ang) * 30), y = surfaceY(server.overworld(), x, z);
    Q.cmd(server, 'setblock ' + x + ' ' + y + ' ' + z + ' minecraft:spawner{SpawnData:{entity:{id:"' + fid('minecraft:endermite') + '",Tags:["fest_minion","fest_swarm"],Lifetime:0}},MinSpawnDelay:200,MaxSpawnDelay:400,SpawnCount:4,MaxNearbyEntities:20,RequiredPlayerRange:48}');
    ev.spawner = { x: x, y: y, z: z };
    Q.cmd(server, 'title @a title ' + Q.jsonText('Coal Gnome swarm!', 'dark_red'));
    Q.cmd(server, 'title @a subtitle ' + Q.jsonText('A Coal Spawner hums near ' + anchor.username + '. Break it before dawn.', 'gray'));
  } else if (type == 'blizzard') {
    Q.cmd(server, 'weather thunder 12000');
    Q.cmd(server, 'title @a title ' + Q.jsonText('Blizzard of Doubt', 'aqua'));
    Q.cmd(server, 'title @a subtitle ' + Q.jsonText('Festive deeds count for nothing until it passes. -3 by dawn unless the town stays lit.', 'gray'));
    server.scheduleInTicks(11000, () => { let e2 = p2json(server, 'event', null); if (e2 && e2.type == 'blizzard') Q.change(server, -3, 'event', null, null); });
  } else if (type == 'greyday') {
    Q.cmd(server, 'title @a title ' + Q.jsonText('A Grey Day', 'gray'));
    Q.cmd(server, 'title @a subtitle ' + Q.jsonText('Good deeds are worth half today. Share a festive meal together to lift it.', 'gray'));
    ev.meals = {};
  }
  p2save(server, 'event', ev);
  Q.announce(server, 'Knock-down event: ' + type, 'red');
  Q.logEvent(server, 'Knock-down event: ' + type);
}
function endEvent(server, ev, text) { p2data(server).remove('event'); Q.announce(server, text, 'gray'); }
// Grey Day: three different players eating festive food within 2 minutes lifts it (SP: three festive meals)
ItemEvents.foodEaten(event => {
  let p = event.player; if (!p || !event.item.hasTag('chop:festive_food')) return;
  let server = p.server, ev = p2json(server, 'event', null); if (!ev || ev.type != 'greyday') return;
  if (!ev.meals) ev.meals = {};
  ev.meals[p.username] = Q.nowMs();
  let n = 0; for (let k in ev.meals) if (Q.nowMs() - ev.meals[k] < 120000) n++;
  let need = Q.onlineCount(server) >= 3 ? 3 : 1;
  if (n >= need || (need == 1 && (ev.soloMeals = (ev.soloMeals || 0) + 1) >= 3)) { endEvent(server, ev, 'The grey lifts. Festivity flows again.'); return; }
  p2save(server, 'event', ev);
});

// ---------- finale: /festivity finale (op) ----------
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event;
  event.register(Commands.literal('festivity')
    .then(Commands.literal('finale').requires(src => src.hasPermission(2))
      .executes(ctx => { runFinale(ctx.source.server, ctx.source.player); return 1; })
      .then(Commands.literal('reset').executes(ctx => { p2data(ctx.source.server).putBoolean('finaleDone', false); ctx.source.sendSuccess(Text.of('Finale re-armed.'), true); return 1; })))
    .then(Commands.literal('claws').requires(src => src.hasPermission(2)).executes(ctx => { clawsArrive(ctx.source.server, false); return 1; }))
    .then(Commands.literal('outpost').requires(src => src.hasPermission(2)).executes(ctx => { p2data(ctx.source.server).remove('outpost'); let p = ctx.source.player; if (p) { let x = Math.floor(p.x + 20), z = Math.floor(p.z), y = surfaceY(p.level, x, z); buildOutpost(ctx.source.server, x, y, z); p2save(ctx.source.server, 'outpost', { x: x, y: y, z: z, star: (x + ',' + (y + 7) + ',' + z), built: Q.nowMs(), lastRaidDay: -1 }); } return 1; }))
    .then(Commands.literal('event').requires(src => src.hasPermission(2))
      .then(Commands.literal('gnomes').executes(ctx => { startEvent(ctx.source.server, 'gnomes'); return 1; }))
      .then(Commands.literal('blizzard').executes(ctx => { startEvent(ctx.source.server, 'blizzard'); return 1; }))
      .then(Commands.literal('greyday').executes(ctx => { startEvent(ctx.source.server, 'greyday'); return 1; }))
      .then(Commands.literal('clear').executes(ctx => { let ev = p2json(ctx.source.server, 'event', null); if (ev) endEvent(ctx.source.server, ev, 'Event cleared by an op.'); Q.cmd(ctx.source.server, 'kill @e[tag=fest_swarm]'); return 1; })))
    .then(Commands.literal('release').requires(src => src.hasPermission(2)).executes(ctx => { let b = trapped(ctx.source.server); if (b) release(ctx.source.server, b, 'op'); clawsLeave(ctx.source.server, 'op'); return 1; }))
  );
});
function runFinale(server, op) {
  let d = p2data(server);
  if (d.getBoolean('finaleDone')) { if (op) op.tell(Text.of('The finale already happened. /festivity finale reset to re-arm (testing only).').gray()); return; }
  d.putBoolean('finaleDone', true);
  let v = Q.value(server);
  Q.cmd(server, 'playsound minecraft:block.bell.resonate master @a ~ ~ ~ 1 1');
  if (v >= 60) {
    Q.cmd(server, 'title @a title ' + Q.jsonText("Santa's Christmas!", 'green'));
    Q.cmd(server, 'title @a subtitle ' + Q.jsonText('The world is ' + Q.band(server).name + '. Merry Christmas, everyone!', 'gold'));
    for (let p of Q.online(server)) {
      Q.cmd(server, 'give ' + p.username + ' christmas_hearthlight:christmas_gift_box 1');
      Q.cmd(server, 'give ' + p.username + ' minecraft:cookie 16');
      let rare = ['minecraft:music_disc_otherside', 'minecraft:music_disc_pigstep', 'minecraft:enchanted_golden_apple', 'minecraft:totem_of_undying', 'minecraft:nether_star'][Math.floor(Math.random() * 5)];
      Q.cmd(server, 'give ' + p.username + ' ' + rare + ' 1');
      Q.cmd(server, 'festivity fireworks ' + Math.floor(p.x) + ' ' + Math.floor(p.y) + ' ' + Math.floor(p.z) + ' 6 6 8');   // 0.9.5: outdoor spots only
    }
    Q.cmd(server, 'weather clear 24000');
    Q.change(server, 15, 'finale', null, null);
    Q.logEvent(server, "Santa's Christmas: the finale was a triumph");
  } else if (v >= 40) {
    Q.cmd(server, 'title @a title ' + Q.jsonText('A quiet Christmas', 'white'));
    for (let p of Q.online(server)) Q.cmd(server, 'give ' + p.username + ' minecraft:cookie 8');
    Q.change(server, 10, 'finale', null, null);
    Q.logEvent(server, 'A quiet Christmas: the finale was modest');
  } else {
    Q.cmd(server, 'title @a title ' + Q.jsonText("Santy Claws' Christmas", 'dark_red'));
    Q.cmd(server, 'title @a subtitle ' + Q.jsonText('Drive him off before dawn to save Christmas!', 'gray'));
    Q.cmd(server, 'weather thunder 12000');
    for (let p of Q.online(server)) Q.cmd(server, 'give ' + p.username + ' minecraft:coal 8');
    clawsArrive(server, true);
    Q.logEvent(server, "Santy Claws' Christmas began");
    // redemption check at dawn is handled by clawsLeave('driven') (+25 bonus below) or dawn (-10)
    server.scheduleInTicks(12000, () => {
      let c = p2json(server, 'claws', null);
      if (c && c.finale) { Q.change(server, -10, 'finale', null, null); Q.announce(server, 'Santy Claws kept Christmas this year.', 'dark_red'); }
    });
  }
}
ServerEvents.loaded(event => { console.log('[Festivity] phase2 ' + P2.VERSION + ' loaded (dawn clawsheal hook)'); });

// finale redemption: driving him off during the finale night is worth +25 and Santa's drop
const p2_origLeave = clawsLeave;
clawsLeave = function (server, why) {
  let c = p2json(server, 'claws', null);
  let wasFinale = c && c.finale;
  p2_origLeave(server, why);
  if (wasFinale && why == 'driven') {
    Q.change(server, 25, 'finale', null, null);
    Q.announce(server, 'Christmas is saved! Santa comes at dawn after all.', 'green');
    for (let p of Q.online(server)) Q.cmd(server, 'give ' + p.username + ' christmas_hearthlight:christmas_gift_box 1');
    Q.logEvent(server, 'Christmas was saved from Santy Claws');
  }
};
