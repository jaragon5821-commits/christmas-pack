// priority: 24
// FESTIVITY PHASE 5 (DRAFT v15, 2026-11-08: jar 0.8.0 festivity:gingerbread_buddy - the Gingerbread Friend is summoned through pets v10 ptSummonBuddy
// (fest_owner uuid) with the gingerbread_part Variant 4 summon as fallback; section M: 1 in 4 woken houses also runs `festivity buddies 1` (rare stray buddy);
// v14: Gingerbread House raid (section M, chest in an Assets house with a fest_gbhouse marker), fest_lantern -> Variant 3;
// v13: Claws CARRY handed to the jar 0.6.0 (CarryTarget/CarryArrived, boxTick redefined, no /tp, 320-480 blocks);
// v12 MCA baby detection by polling the Romantic Expansion API, section L; v11/v11b quality pass + gap closing - dropItem coords,
// Simple Hats elf hat drop, Naughty Duel, dawn sleigh fly-by with a gift (redefines Phase 3 startSleigh), baby_born action with a 48 h cooldown, LOG off; v3 2026-11-07) - Josh's minion review (notes 11-06 18:40, answers 20:05, "get it finished" 11-07 06:11).
// Loads AFTER festivity.js (50), phase2 (40), phase3 (30), phase4 (28), pets (26): shared scope, so it may redefine Phase 2 functions
// (clawsArrive, clawsTick, worstOnline) and patch P2 tables at load. Needs Phase 2 helpers summon/surfaceY/findByTag/dropItem,
// Phase 3 presentItem(), Phase 4 e4rotate/e4chunkHasStructure/e4players, pets ptForceTame.
// Sections: A Claws manifestation (silent, leaping, 200-300 block carry) | B Sour Elf drops + Snowballer + Captain + Bomber + Thief
// | C Freed Elves on the ground | D Santa flyby | E Gingerbread split + Gingerbread Friend pet | F Frost Hound taming + slow bite
// | G Reindeer (rare snowy horse, Bell Necklace) | H Nutcracker no wither + Drummer | I items/recipes | J debug + tick | K Naughty Duel + baby_born action
// | L MCA baby detection (v12, read-only poll of the Romantic Expansion API).
// Villager safety: every mob here is one we summoned and tagged (fest_*). Never a real villager, colonist or their data.
const P5 = {
  CLAWS_LEAP_EVERY: 50, CLAWS_LEAP_MAX: 11, CLAWS_LEAP_VY: 0.95, CLAWS_WARN_DIST: 13, CLAWS_SPAWN_DIST: 70,
  BOX_MIN: 320, BOX_MAX: 480, CARRY_SECONDS: 90,   // v13: farther carry; the carry timeout is CARRY_SECONDS * 3 (Phase 2 math)
  CANDY_CHANCE: 0.6, HAT_CHANCE: 0.05, SNOWBALLER_SHARE: 0.35, CAPTAIN_CHANCE: 0.12, BOMBER_CHANCE: 0.06,
  ROCK_RANGE: 12, ROCK_CHANCE: 0.25, ROCK_SPEED: 1.1, ROCK_DMG: 2, BOMB_EVERY: 120, BOMB_FUSE: 40, BOMB_DMG: 5,
  THIEF_SCALE: 0.8, CAPTAIN_SCALE: 1.3, FREED_SCALE: 0.7, FREED_TICKS: 240,
  SANTA_EVERY_NIGHTS: 3, SANTA_TIME: 19000, SANTA_HEIGHT: 38, SANTA_SPEED: 4,
  GB_PARTS: ['Head', 'Arm', 'Arm', 'Leg', 'Leg', 'Torso'], GB_PARTS_PER_DEATH: 2, GB_CHUNK_CHANCE: 0.6, GB_COOKIE_CHANCE: 0.5, GB_PART_CAP: 10,
  HOUND_TAME_CHANCE: 0.5, HOUND_SLOW_TICKS: 60,
  REINDEER_CHANCE: 0.12, REINDEER_BIOME: /snow|frozen|ice|glacier|tundra|arctic|alpine|winter|boreal/,
  NUTCRACKER_DRUMMER: 0.25,
  // v11 additions
  SH_HAT_ITEM: 'simplehats:elfhat', SH_HAT_CHANCE: 0.015, SH_HAT_CAPTAIN_CHANCE: 0.04,   // Simple Hats "elfhat" (config/simplehats.json, COMMON weight 5): 1.5% per Sour Elf, 4% per Captain
  DUEL_ACCEPT_S: 60, DUEL_MINUTES: 5,          // Naughty Duel: consensual PvP, the kill costs no Festivity
  SLEIGH_GIFT: true,                            // dawn sleigh (Merry+) drops one small gift below its path
  BABY_PTS: 10, BABY_COOLDOWN_H: 48,            // design: baby born +10 per parent, 48 h cooldown (credited by section L, /festivity babyborn or /festivity credit <player> baby_born)
  BABY_POLL_TICKS: 200, BABY_MIN_TRACK_MS: 60000, BABY_DEATH_GRACE_MS: 30000, BABY_END_SLACK_TICKS: 600,   // v12 section L: poll period, min age of the first pregnant reading, death window, allowed early end
  GBHOUSE_RADIUS: 12, GBHOUSE_DOOR_DIST: 6, GBHOUSE_PARTS: 4,   // v14 section M: marker search radius around the opened chest, spawn offset toward the player, parts per wave
  LOG: false, DEBUG_CMDS: false                 // both false for promotion (v11)
};
const F5 = Fest;
function f5cmd(server, s) { if (P5.DEBUG_CMDS) { try { return server.runCommand(s); } catch (e) { console.warn('[Festivity5] cmd fallback: ' + e); } } return F5.cmd(server, s); }
function f5log(s) { if (P5.LOG) console.log('[Festivity5] ' + s); }
function f5rnd(a, b) { return a + Math.random() * (b - a); }
function f5pick(l) { return l[Math.floor(Math.random() * l.length)]; }
function f5has(e, t) { try { return !!(e && e.tags && e.tags.contains(t)); } catch (x) { return false; } }
function f5type(e) { try { return String(e.type); } catch (x) { return ''; } }
// ===================== MOD BRIDGE: Festivity jar (festivity:* entities) =====================
// When the Festivity mod is loaded, every Festivity mob is summoned as its own entity type; skins key on the synced Variant byte.
// Without the jar everything still runs on the vanilla-base mobs + EMF looks. fid() is also used by Phase 2/3/4/pets at runtime.
const F5_MOD = (function () { try { return Platform.isLoaded('festivity'); } catch (x) { return false; } })();
const F5_IDS = { 'minecraft:stray': 'festivity:sour_elf', 'minecraft:wither_skeleton': 'festivity:nutcracker', 'minecraft:skeleton': 'festivity:gingerbread_man',
  'minecraft:endermite': 'festivity:coal_gnome', 'minecraft:wolf': 'festivity:frost_hound', 'minecraft:polar_bear': 'festivity:santy_claws',
  'minecraft:horse': 'festivity:reindeer', 'minecraft:slime': 'festivity:gingerbread_part' };
function fid(id) { return F5_MOD && F5_IDS[id] ? F5_IDS[id] : id; }
function f5isType(e, vanilla) { let t = f5type(e); return t == vanilla || (F5_MOD && t == F5_IDS[vanilla]); }
// Variant byte from the Festivity tags (same table for summon NBT and the live sync below)
function f5variantFromTags(type, tags) {
  let h = t => tags.indexOf(t) >= 0;
  if (type == 'festivity:sour_elf') return h('fest_freed') ? 5 : h('fest_snowballer') ? 4 : h('fest_bomber') ? 3 : h('fest_captain') ? 2 : (h('fest_thief') || h('fest_heist')) ? 1 : 0;
  if (type == 'festivity:nutcracker') return h('fest_drummer') ? 1 : 0;
  if (type == 'festivity:gingerbread_part') return h('fest_gbfriend') ? 4 : h('fest_gb_torso') ? 3 : h('fest_gb_leg') ? 2 : h('fest_gb_arm') ? 1 : 0;
  if (type == 'festivity:coal_gnome') return h('fest_clinker') ? 2 : h('fest_lantern') ? 3 : h('fest_pet') ? 1 : 0;   // v14: lantern gnome (pets v9) outranks the plain pet
  return -1;
}
function f5extraNbtFor(type, tags) {   // appended to summon NBT when the jar is in
  let out = [], v = f5variantFromTags(type, tags);
  if (v >= 0) out.push('Variant:' + v + 'b');
  if (type == 'festivity:coal_gnome') for (let i = 1; i <= 4; i++) if (tags.indexOf('fest_pose' + i) >= 0) out.push('Pose:' + i + 'b');
  if (type == 'festivity:santy_claws' && tags.indexOf('fest_manifest') >= 0) out.push('Manifest:1b');
  return out.join(',');
}
// Tags are added after summon in many places (promote pass, Phase 3/4 raw summons): keep the synced bytes in step, once per change.
function f5syncVariants(server) {
  if (!F5_MOD) return;
  for (let p of f5players(server)) {
    let list; try { list = p.level.getEntitiesWithin(AABB.of(p.x - 64, p.y - 32, p.z - 64, p.x + 64, p.y + 32, p.z + 64)); } catch (x) { continue; }
    for (let e of list) {
      try {
        let t = f5type(e); if (t.indexOf('festivity:') != 0 || !e.tags) continue;
        let tags = []; for (let g of e.tags) tags.push(String(g));
        if (tags.indexOf('chop_dungeon_mob') >= 0 || !tags.some(g => g.indexOf('fest_') == 0)) continue;   // structure spawners (Assets v27) and untagged mobs keep their own Variant
        let key = tags.filter(g => g.indexOf('fest_') == 0).sort().join(' ');
        if (e.persistentData.getString('fest_varkey') == key) continue;
        e.persistentData.putString('fest_varkey', key);
        let extra = f5extraNbtFor(t, tags.join(' '));
        if (extra) f5cmd(server, 'data merge entity ' + e.uuid + ' {' + extra + '}');
      } catch (x) {}
    }
  }
}
function f5name(e) { try { return e.customName ? String(e.customName.string) : ''; } catch (x) { return ''; } }
function f5pos(e) { return Math.floor(e.x) + ' ' + Math.floor(e.y) + ' ' + Math.floor(e.z); }
function f5over(p) { try { return String(p.level.dimension) == 'minecraft:overworld'; } catch (e) { return true; } }
// D142 Candle of Vigil (jar 0.9.35): the jar tags players near a lit candle; Claws never targets or grabs them.
function f5safe(p) { try { return !!(p && p.tags && p.tags.contains('fest_candle_safe')); } catch (e) { return false; } }
function f5players(server) { let out = []; for (let p of F5.online(server)) if (f5over(p)) out.push(p); return out; }
function f5nearest(list, x, z) { let best = null, bd = 1e9; for (let p of list) { let dx = p.x - x, dz = p.z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = p; } } return best; }
function f5scale(server, e, s) { if (f5type(e) == 'festivity:sour_elf') s = Math.round(s * 0.75 * 1000) / 1000; f5cmd(server, 'attribute ' + e.uuid + ' minecraft:generic.scale base set ' + s); }   // jar elf base is 0.75
// v11: Phase 2's dropItem does y + 0.5; Phase 4/5/pets passed toFixed() strings and the summon silently failed ("12.00.5"). Same signature, numbers forced.
function dropItem(server, x, y, z, item, count) { x = Number(x); y = Number(y); z = Number(z); F5.cmd(server, 'summon minecraft:item ' + x + ' ' + (y + 0.5) + ' ' + z + ' {Item:{id:"' + item + '",count:' + (count || 1) + '}}'); }
function f5isMonster(e) { try { if (e.isPlayer()) return false; if (e.type && e.type.category) return String(e.type.category) == 'MONSTER' || String(e.type.category).toLowerCase() == 'monster'; } catch (x) {} try { return e.isMonster(); } catch (x) { return false; } }

// ===================== NO NAMES (Josh 11-07 22:18): Festivity mobs carry no CustomName; looks key on Tags (Looks v3a) =====================
function summon(server, id, x, y, z, name, tags, nbt) {   // redefines Phase 2's helper: same signature, no CustomName
  let extra = nbt && nbt.length > 2 ? nbt.substring(1, nbt.length - 1) : '';
  let tagList = ('fest_minion ' + (tags || '')).trim().split(' ').map(t => '"' + t + '"').join(',');
  if (id == 'minecraft:wolf' && extra.indexOf('variant') < 0) extra = (extra ? extra + ',' : '') + 'variant:"minecraft:pale"';   // Looks v3: hound skins target the pale wolf textures
  let mid = fid(id);
  if (mid != id) {   // Festivity jar: strip armor (hat/coat are part of the model), add the Variant byte for the skin
    extra = extra.replace(/ArmorItems:\[[^\]]*\],?/, '').replace(/,$/, '');
    if (mid == 'festivity:gingerbread_man') extra = extra.replace(/HandItems:\[[^\]]*\],?/, '').replace(/HandDropChances:\[[^\]]*\],?/, '').replace(/,$/, '');   // fists, not a wooden sword (Josh 11-08)
    let more = f5extraNbtFor(mid, (tags || '') + ' ' + (name || ''));
    if (more) extra = (extra ? extra + ',' : '') + more;
  }
  let full = '{PersistenceRequired:1b,Tags:[' + tagList + ']' + (extra ? ',' + extra : '') + '}';
  return F5.cmd(server, 'summon ' + mid + ' ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' ' + full);
}
function f5stripNames(server) {   // Phase 3/4 raw summons still set names: drop them once seen
  for (let p of f5players(server)) {
    let list; try { list = p.level.getEntitiesWithin(AABB.of(p.x - 64, p.y - 24, p.z - 64, p.x + 64, p.y + 24, p.z + 64)); } catch (x) { continue; }
    for (let e of list) {
      try {
        if (e.isPlayer() || !e.tags || e.persistentData.getBoolean('fest_noname')) continue;
        let fest = false; for (let t of e.tags) if (String(t).indexOf('fest_') == 0) { fest = true; break; }
        if (!fest) continue;
        e.persistentData.putBoolean('fest_noname', true);
        if (e.customName) f5cmd(server, 'data remove entity ' + e.uuid + ' CustomName');
      } catch (x) {}
    }
  }
}

// ===================== A. SANTY CLAWS: the manifestation =====================
// Josh: not Claws himself but a manifestation; alone and SILENT until <5 s before the grab; leaps instead of running; horse-like
// step-up; guaranteed grab -> carried 200-300 blocks and wrapped in the Phase 2 Giant Present; rotates through all players.
P2.BOX_MIN_DIST = P5.BOX_MIN; P2.BOX_MAX_DIST = P5.BOX_MAX; P2.CARRY_SECONDS = P5.CARRY_SECONDS;
function worstOnline(server) {   // Phase 2 picked the naughtiest; Phase 5 rotates through everyone online (naughtiest first within a rotation)
  let cands = []; for (let p of f5players(server)) if (!p.persistentData.getBoolean('fest_kidnappedLastNight') && !f5safe(p)) cands.push(p);
  if (!cands.length) return null;
  try { return e4rotate(server, 'p5_rot_claws', cands); } catch (e) { return f5pick(cands); }
}
function clawsArrive(server, finale) {
  let target = worstOnline(server); if (!target) return;
  let ang = Math.random() * Math.PI * 2;
  let x = target.x + Math.cos(ang) * P5.CLAWS_SPAWN_DIST, z = target.z + Math.sin(ang) * P5.CLAWS_SPAWN_DIST, y = surfaceY(target.level, Math.floor(x), Math.floor(z));
  F5.cmd(server, 'kill @e[tag=fest_claws]');
  summon(server, 'minecraft:polar_bear', x, y, z, 'Santy Claws', 'fest_claws fest_manifest',
    '{Silent:1b,Health:400f,attributes:[{id:"minecraft:generic.max_health",base:400},' + (F5_MOD ? '' : '{id:"minecraft:generic.movement_speed",base:0.0},') + '{id:"minecraft:generic.step_height",base:1.1},{id:"minecraft:generic.safe_fall_distance",base:40}],active_effects:[{id:"minecraft:resistance",amplifier:4,duration:-1,show_particles:0b},{id:"minecraft:fire_resistance",amplifier:0,duration:-1,show_particles:0b}]}');
  p2save(server, 'claws', { target: target.username, pressure: 0, since: F5.nowMs(), finale: !!finale, kidnaps: 0, hitters: {}, manifest: true, warned: false, lastLeap: 0, airborne: false });
  F5.logEvent(server, 'a manifestation of Santy Claws stalks ' + target.username);   // log only: no title, no sound, no hounds
  f5log('manifestation spawned ' + P5.CLAWS_SPAWN_DIST + ' from ' + target.username);
}
function clawsLeap(server, bear, tx, tz, dist) {
  let dx = tx - bear.x, dz = tz - bear.z, h = Math.sqrt(dx * dx + dz * dz); if (h < 0.1) return;
  let reach = Math.min(P5.CLAWS_LEAP_MAX, Math.max(2, dist - 1.5)), vy = P5.CLAWS_LEAP_VY, air = Math.max(10, Math.round(2 * vy / 0.08));
  let vh = reach / air, mx = dx / h * vh, mz = dz / h * vh;
  f5cmd(server, 'data merge entity ' + bear.uuid + ' {Motion:[' + mx.toFixed(3) + 'd,' + vy.toFixed(3) + 'd,' + mz.toFixed(3) + 'd]}');
  f5cmd(server, 'particle minecraft:snowflake ' + bear.x.toFixed(1) + ' ' + bear.y.toFixed(1) + ' ' + bear.z.toFixed(1) + ' 0.8 0.2 0.8 0.05 20');
}
function clawsLand(server, bear) {
  f5cmd(server, 'playsound minecraft:entity.ravager.step master @a ' + f5pos(bear) + ' 1.2 0.5');
  f5cmd(server, 'particle minecraft:snowflake ' + bear.x.toFixed(1) + ' ' + (bear.y + 0.2).toFixed(1) + ' ' + bear.z.toFixed(1) + ' 1.5 0.3 1.5 0.1 40');
  f5cmd(server, 'particle minecraft:block minecraft:snow_block ' + bear.x.toFixed(1) + ' ' + (bear.y + 0.2).toFixed(1) + ' ' + bear.z.toFixed(1) + ' 1 0.3 1 0.1 20');
}
function clawsTick(server) {
  let c = p2json(server, 'claws', null); if (!c) return;
  let bear = clawsEntity(server); if (!bear) { p2data(server).remove('claws'); return; }
  c.lastPos = { x: Math.floor(bear.x), z: Math.floor(bear.z) };
  if (c.carrying) {   // carry phase is driven by boxTick (Phase 2 glide, or the jar's carry goal when F5_MOD, see below); add the leap feel on top
    if (server.tickCount % 40 == 0) clawsLand(server, bear);
    p2save(server, 'claws', c); return;
  }
  if (F5_MOD && server.tickCount % 40 == 0) { try { if (bear.nbt.getIntArray('CarryTarget').length) f5carryClear(server); } catch (q) {} }   // v13: a leftover target never drives him
  let target = findPlayer(server, c.target);
  if (!target || !f5over(target) || f5safe(target)) { target = worstOnline(server); if (!target) { clawsLeave(server, 'nobody'); return; } c.target = target.username; }
  let dx = target.x - bear.x, dz = target.z - bear.z, h = Math.sqrt(dx * dx + dz * dz);
  let onGround = true; try { onGround = bear.onGround(); } catch (e) { try { onGround = bear.isOnGround(); } catch (x) {} }
  if (c.airborne && onGround) { c.airborne = false; clawsLand(server, bear); }
  // the one warning: under ~5 s out, a single cue, then he is on you
  if (!c.warned && h <= P5.CLAWS_WARN_DIST) {
    c.warned = true;
    f5cmd(server, 'playsound minecraft:entity.polar_bear.warning master ' + target.username + ' ' + f5pos(bear) + ' 2 0.5');
    f5cmd(server, 'playsound minecraft:block.chain.break master ' + target.username + ' ' + f5pos(bear) + ' 1 0.4');
    f5cmd(server, 'title ' + target.username + ' actionbar ' + F5.jsonText('Something heavy just landed behind you.', 'dark_red'));
  }
  if (h > 2.4) {
    if (F5_MOD) { /* the jar's ClawsChaseGoal runs and leaps; the script only warns and grabs */ }
    else if (onGround && server.tickCount - (c.lastLeap || 0) >= P5.CLAWS_LEAP_EVERY) {
      c.lastLeap = server.tickCount; c.airborne = true;
      clawsLeap(server, bear, target.x, target.z, h);
    } else if (onGround && h < 6) {   // short hop-in between leaps so he closes the last metres
      let step = Math.min(1.2, h - 1.5), nx = bear.x + dx / h * step, nz = bear.z + dz / h * step;
      f5cmd(server, 'tp @e[tag=fest_claws,limit=1] ' + nx.toFixed(2) + ' ' + bear.y.toFixed(2) + ' ' + nz.toFixed(2));
    }
  } else {
    if (f5safe(target)) { /* D142: candle-safe, no grab and no strike on contact */ }
    else if (!c.finaleDone) startKidnap(server, c, target, bear);   // guaranteed ride (Josh 20:05); Phase 2 startKidnap mounts the player
    else { f5cmd(server, 'damage ' + target.username + ' 6 minecraft:mob_attack by @e[tag=fest_claws,limit=1]'); }
    c.warned = false;
  }
  p2save(server, 'claws', c);
}

// ---- v13: the CARRY phase. With the jar (0.6.0+) festivity:santy_claws carries NBT CarryTarget:[I;x,y,z] + CarryArrived; while he is a
// vehicle with a target, a Java goal bounds toward it in real leaps (no /tp) and sets CarryArrived:1b within ~3.5 blocks (or when stuck
// >15 s nearby). The script only sets the target once, keeps the victim mounted, and runs Phase 2's arrival block when he gets there.
// Without the jar Phase 2's boxTick (glide) runs unchanged. Same signature: Phase 2's tick and the daytime tick above call boxTick(server).
function f5carryClear(server) { f5cmd(server, 'data merge entity @e[tag=fest_claws,limit=1] {CarryTarget:[I;],CarryArrived:0b}'); }
var p2boxTick = boxTick;   // assignment, not a declaration: a hoisted `function boxTick` here would already be the new one
boxTick = function (server) {
  if (!F5_MOD) return p2boxTick(server);
  let c = p2json(server, 'claws', null);
  if (!c || !c.carrying) return p2boxTick(server);   // box phase (victim wrapped): Phase 2 handles it
  let b = c.carrying, bear = clawsEntity(server), victim = findPlayer(server, b.victim);
  if (!bear || !victim) { f5carryClear(server); c.carrying = null; p2save(server, 'claws', c); return; }
  c.lastPos = { x: Math.floor(bear.x), z: Math.floor(bear.z) };
  if (!b.sent) { b.sent = true; f5cmd(server, 'data merge entity @e[tag=fest_claws,limit=1] {CarryTarget:[I;' + b.bx + ',' + (b.by - 2) + ',' + b.bz + ']}'); f5log('carry target sent ' + b.bx + ' ' + (b.by - 2) + ' ' + b.bz); }
  f5cmd(server, 'ride ' + b.victim + ' mount @e[tag=fest_claws,limit=1]');   // Phase 2 safeguard: the victim stays on his back
  let dx = b.bx - bear.x, dz = b.bz - bear.z, h = Math.sqrt(dx * dx + dz * dz), elapsed = (F5.nowMs() - b.started) / 1000;
  let arrived = false; try { arrived = Number(bear.nbt.getByte('CarryArrived')) == 1; } catch (q) {}
  if (!arrived && h > 4 && elapsed <= P5.CARRY_SECONDS * 3) { p2save(server, 'claws', c); return; }   // still bounding
  if (!arrived && h > 4) f5log('carry timeout after ' + Math.round(elapsed) + ' s, ' + Math.round(h) + ' blocks out: placing him at the box');   // last resort: the arrival block below tps him beside the box, as Phase 2 does
  // arrival: Phase 2's block, verbatim
  f5cmd(server, 'ride ' + b.victim + ' dismount');
  placeBox(server, b);
  f5cmd(server, 'tp ' + b.victim + ' ' + b.bx + ' ' + (b.by - 1) + ' ' + b.bz);
  victim.persistentData.putBoolean('fest_trapped', true);
  victim.persistentData.putInt('fest_wriggle', 0);
  p2save(server, 'box', { victim: b.victim, bx: b.bx, by: b.by, bz: b.bz, since: F5.nowMs(), soloSince: 0, knot: (b.bx + ',' + (b.by + 3) + ',' + b.bz) });
  c.carrying = null; p2save(server, 'claws', c);
  f5cmd(server, 'tp @e[tag=fest_claws,limit=1] ' + (b.bx + 6) + ' ' + (b.by - 2) + ' ' + (b.bz + 6));
  f5carryClear(server);
  f5cmd(server, 'title ' + b.victim + ' title ' + F5.jsonText('Wrapped up!', 'dark_red'));
  f5cmd(server, 'title ' + b.victim + ' subtitle ' + F5.jsonText('Friends can break the red knot on top. Alone? Jump to wriggle free.', 'gray'));
  f5cmd(server, 'tellraw @a ' + F5.jsonText(b.victim + ' is wrapped in a Giant Present at ' + b.bx + ' ' + b.by + ' ' + b.bz + '. Break the Ribbon Knot on top to free them!', 'gold'));
  f5log('carry arrived (' + (arrived ? 'jar flag' : h <= 4 ? 'distance' : 'timeout') + ') after ' + Math.round(elapsed) + ' s');
};
// dawn / driven / done / op: clear the carry fields before Phase 2 kills him (and for the finale path that keeps him around)
var p5_origLeave = clawsLeave;
clawsLeave = function (server, why) { if (F5_MOD) { try { f5carryClear(server); } catch (q) {} } p5_origLeave(server, why); };

// ===================== B. SOUR ELVES: drops, Snowballer, Captain, Bomber, Thief =====================
function f5isElf(e) { return f5isType(e, 'minecraft:stray') && f5has(e, 'fest_minion') && !f5has(e, 'fest_elf'); }
const F5_ELF_HAT = '{id:"minecraft:leather_helmet",count:1,components:{"minecraft:dyed_color":{rgb:2263842},"minecraft:custom_name":\'{"text":"Elf Hat","color":"green","italic":false}\'}}';
// Snowballer joins the normal waves (Josh: "a normal elf variant too"): patch the Phase 2 grumbling/bleak tables at load
try {
  let elfBase = P2.MINIONS.grumbling[0];
  elfBase.nbt = elfBase.nbt.replace('{HandItems', '{CanPickUpLoot:1b,HandItems').replace(/ArmorItems:\[[^\]]*\],?/, '');   // Looks v3: hat is part of the elf model, no helmet item                       // elves pick up dropped items
  P2.MINIONS.grumbling.push({ n: 1, id: 'minecraft:stray', name: 'Sour Elf Snowballer', tags: 'fest_t1 fest_snowballer', nbt: '{CanPickUpLoot:1b,HandItems:[{id:"minecraft:snowball",count:16},{}],HandDropChances:[0f,0f],active_effects:[{id:"minecraft:speed",amplifier:0,duration:-1}]}' });
  P2.MINIONS.bleak.push({ n: 1, id: 'minecraft:stray', name: 'Sour Elf Snowballer', tags: 'fest_t1 fest_snowballer', nbt: '{CanPickUpLoot:1b,HandItems:[{id:"minecraft:snowball",count:16},{}],HandDropChances:[0f,0f],active_effects:[{id:"minecraft:speed",amplifier:0,duration:-1}]}' });
  // Nutcracker: hits hard, no wither (H): strength instead of the wither skeleton's default feel
  for (let m of P2.MINIONS.bleak) if (m.name == 'Nutcracker Soldier') m.nbt = m.nbt.replace('active_effects:[', 'active_effects:[{id:"minecraft:strength",amplifier:1,duration:-1,show_particles:0b},');
  f5log('P2 minion tables patched: snowballer, pickup, nutcracker strength');
} catch (e) { console.warn('[Festivity5] table patch: ' + e); }
// Elf Captain / Bomber: rolled when a wave spawns (we watch for new elves every second instead of hooking the wave)
var f5_seen = {};
function f5promoteElves(server) {
  for (let p of f5players(server)) {
    let list; try { list = p.level.getEntitiesWithin(AABB.of(p.x - 40, p.y - 12, p.z - 40, p.x + 40, p.y + 12, p.z + 40)); } catch (x) { continue; }
    for (let e of list) {
      try {
        if (!f5isElf(e)) continue;
        let id = String(e.uuid); if (f5_seen[id]) continue; f5_seen[id] = 1;
        f5cmd(server, 'data merge entity ' + e.uuid + ' {ArmorItems:[{},{},{},{}]}');   // Looks v3: no helmet items on elves
        if (f5has(e, 'fest_heist')) { f5scale(server, e, P5.THIEF_SCALE); e.addTag('fest_thief'); continue; }   // Phase 3 thief: shorter
        if (f5has(e, 'fest_captain') || f5has(e, 'fest_bomber') || f5has(e, 'fest_snowballer') || f5has(e, 'fest_hunt')) continue;
        let r = Math.random();
        if (r < P5.CAPTAIN_CHANCE) {
          e.addTag('fest_captain'); f5scale(server, e, P5.CAPTAIN_SCALE);
          f5cmd(server, 'data merge entity ' + e.uuid + ' {HandItems:[{id:"minecraft:iron_sword",count:1},{id:"chop:present_sack",count:1}],HandDropChances:[0f,0f]}');
          f5cmd(server, 'attribute ' + e.uuid + ' minecraft:generic.max_health base set 40'); f5cmd(server, 'effect give ' + e.uuid + ' minecraft:instant_health 1 10 true');
        } else if (r < P5.CAPTAIN_CHANCE + P5.BOMBER_CHANCE) {
          e.addTag('fest_bomber');
          f5cmd(server, 'data merge entity ' + e.uuid + ' {HandItems:[{id:"' + presentItem() + '",count:1},{}],HandDropChances:[0f,0f]}');
        }
      } catch (x) {}
    }
  }
  if (server.tickCount % 12000 == 0) f5_seen = {};
}
// Snowballer: throws rocky snowballs (snowball entity carrying our item; damage applied on arrival)
function f5throwRock(server, g, t) {
  let dx = t.x - g.x, dy = (t.y + 1.2) - (g.y + 1.5), dz = t.z - g.z, h = Math.sqrt(dx * dx + dy * dy + dz * dz); if (h < 0.5) return;
  let s = P5.ROCK_SPEED, mx = dx / h * s, my = dy / h * s + 0.1 + h * 0.012, mz = dz / h * s;
  f5cmd(server, 'summon minecraft:snowball ' + g.x.toFixed(2) + ' ' + (g.y + 1.5).toFixed(2) + ' ' + g.z.toFixed(2) + ' {Item:{id:"chop:rocky_snowball",count:1},Motion:[' + mx.toFixed(3) + 'd,' + my.toFixed(3) + 'd,' + mz.toFixed(3) + 'd],Tags:["fest_rock"]}');
  f5cmd(server, 'playsound minecraft:entity.snowball.throw master @a ' + f5pos(g) + ' 1 0.7');
}
function f5rockTick(server) {
  if (F5_MOD) return;   // the jar's elves throw (and lead their shots) themselves
  for (let p of f5players(server)) {
    let r = P5.ROCK_RANGE, list;
    try { list = p.level.getEntitiesWithin(AABB.of(p.x - r, p.y - 6, p.z - r, p.x + r, p.y + 6, p.z + r)); } catch (x) { continue; }
    for (let e of list) {
      try {
        if (f5has(e, 'fest_rock')) { let dx = e.x - p.x, dy = e.y - (p.y + 1), dz = e.z - p.z; if (dx * dx + dy * dy + dz * dz < 1.5) { f5cmd(server, 'damage ' + p.username + ' ' + P5.ROCK_DMG + ' minecraft:thrown'); f5cmd(server, 'playsound minecraft:block.stone.hit master ' + p.username + ' ~ ~ ~ 1 0.8'); e.discard(); } continue; }
        if (!f5has(e, 'fest_snowballer') || !e.isAlive()) continue;
        let dx = e.x - p.x, dz = e.z - p.z, h = Math.sqrt(dx * dx + dz * dz);
        if (h >= 4 && h <= P5.ROCK_RANGE && Math.random() < P5.ROCK_CHANCE) f5throwRock(server, e, p);
      } catch (x) {}
    }
  }
}
// Bomber: lobs a present that pops (no block damage)
var f5_bombs = [];
function f5bomberTick(server) {
  if (F5_MOD) return;   // the jar's elves throw (and lead their shots) themselves
  for (let p of f5players(server)) {
    let list; try { list = p.level.getEntitiesWithin(AABB.of(p.x - 16, p.y - 6, p.z - 16, p.x + 16, p.y + 6, p.z + 16)); } catch (x) { continue; }
    for (let e of list) {
      try {
        if (!f5has(e, 'fest_bomber') || !e.isAlive()) continue;
        let last = e.persistentData.getInt('fest_lastBomb') || 0; if (server.tickCount - last < P5.BOMB_EVERY) continue;
        e.persistentData.putInt('fest_lastBomb', server.tickCount);
        let dx = p.x - e.x, dz = p.z - e.z, h = Math.sqrt(dx * dx + dz * dz); if (h < 3 || h > 14) continue;
        let fx = (p.x + f5rnd(-1, 1)).toFixed(1), fz = (p.z + f5rnd(-1, 1)).toFixed(1), fy = Math.floor(p.y);
        f5cmd(server, 'summon minecraft:item ' + e.x.toFixed(1) + ' ' + (e.y + 1.5).toFixed(1) + ' ' + e.z.toFixed(1) + ' {Item:{id:"' + presentItem() + '",count:1},PickupDelay:32767,Motion:[' + (dx / h * 0.6).toFixed(3) + 'd,0.55d,' + (dz / h * 0.6).toFixed(3) + 'd],Tags:["fest_bomb"],Glowing:1b}');
        f5cmd(server, 'playsound minecraft:entity.witch.throw master @a ' + f5pos(e) + ' 1 0.8');
        f5_bombs.push({ t: server.tickCount + P5.BOMB_FUSE, x: Number(fx), y: fy, z: Number(fz) });
      } catch (x) {}
    }
  }
  if (!f5_bombs.length) return;
  let keep = [];
  for (let b of f5_bombs) {
    if (server.tickCount < b.t) { keep.push(b); continue; }
    let bombs = findByTag(server, 'fest_bomb', { x: b.x, z: b.z }, 10), at = bombs.length ? bombs[0] : null;
    let x = at ? at.x : b.x, y = at ? at.y : b.y, z = at ? at.z : b.z;
    if (at) at.discard();
    f5cmd(server, 'particle minecraft:explosion ' + x.toFixed(1) + ' ' + (y + 0.5).toFixed(1) + ' ' + z.toFixed(1) + ' 0.5 0.5 0.5 0 3');
    f5cmd(server, 'particle minecraft:firework ' + x.toFixed(1) + ' ' + (y + 0.5).toFixed(1) + ' ' + z.toFixed(1) + ' 1 1 1 0.2 40');
    f5cmd(server, 'playsound minecraft:entity.generic.explode master @a ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' 1 1.2');
    for (let p of f5players(server)) { let dx = p.x - x, dy = p.y - y, dz = p.z - z; if (dx * dx + dy * dy + dz * dz <= 9) f5cmd(server, 'damage ' + p.username + ' ' + P5.BOMB_DMG + ' minecraft:explosion'); }
  }
  f5_bombs = keep;
}
// Thief: shorter (above), leaves a snow trail, opens doors in its way
function f5thiefTick(server) {
  let thieves = findByTag(server, 'fest_thief', null); if (!thieves.length) return;
  for (let e of thieves) {
    try {
      let lvl = e.level, x = Math.floor(e.x), y = Math.floor(e.y), z = Math.floor(e.z);
      let under = String(lvl.getBlock(x, y - 1, z).id), here = String(lvl.getBlock(x, y, z).id);
      if (here == 'minecraft:air' && under != 'minecraft:air' && under != 'minecraft:snow' && !under.includes('water')) f5cmd(server, 'setblock ' + x + ' ' + y + ' ' + z + ' minecraft:snow[layers=1] keep');
      f5cmd(server, 'particle minecraft:snowflake ' + e.x.toFixed(1) + ' ' + (e.y + 0.5).toFixed(1) + ' ' + e.z.toFixed(1) + ' 0.3 0.3 0.3 0 3');
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (let oy = 0; oy <= 1; oy++) {
        let b = lvl.getBlock(x + ox, y + oy, z + oz), id = String(b.id);
        if (id.endsWith('_door') && !id.includes('iron')) { try { if (String(b.properties.get('open')) == 'false') f5cmd(server, 'setblock ' + (x + ox) + ' ' + (y + oy) + ' ' + (z + oz) + ' ' + id + '[open=true,facing=' + b.properties.get('facing') + ',half=' + b.properties.get('half') + ',hinge=' + b.properties.get('hinge') + ']'); } catch (q) {} }
      }
    } catch (x) {}
  }
}
// Drops: candy + rare Elf Hat for every Sour Elf type; rocky snowballs from Snowballers; Captain drops his sack
EntityEvents.death(event => {
  try {
    let e = event.entity; if (!f5isElf(e)) return;
    let server = e.server, x = Number(e.x.toFixed(1)), y = Number(e.y.toFixed(1)), z = Number(e.z.toFixed(1));
    if (Math.random() < P5.CANDY_CHANCE) dropItem(server, x, y, z, 'chop:sour_candy', 1 + Math.floor(Math.random() * 2));
    if (Math.random() < P5.HAT_CHANCE) f5cmd(server, 'summon minecraft:item ' + x + ' ' + (y + 0.5) + ' ' + z + ' {Item:' + F5_ELF_HAT + '}');
    if (f5simpleHat() && Math.random() < (f5has(e, 'fest_captain') ? P5.SH_HAT_CAPTAIN_CHANCE : P5.SH_HAT_CHANCE)) { dropItem(server, x, y, z, P5.SH_HAT_ITEM, 1); f5log('simple hats elf hat dropped'); }   // v11 rare cosmetic
    if (f5has(e, 'fest_snowballer')) dropItem(server, x, y, z, 'chop:rocky_snowball', 1 + Math.floor(Math.random() * 3));
    if (f5has(e, 'fest_captain')) dropItem(server, x, y, z, 'chop:present_sack', 1);
  } catch (x) {}
});
// v11: Simple Hats stores every hat from simplehats.json as its own item simplehats:<name> (source: fonnymunkey/SimpleHats ModRegistry.registerHats,
// Fabric-1.21.1 branch; the 0.4.0 NeoForge multiloader build could not be read). Guarded by the mod AND the item existing, checked once.
var f5_shChecked = false, f5_shOk = false;
function f5simpleHat() {
  if (f5_shChecked) return f5_shOk;
  f5_shChecked = true;
  try { f5_shOk = Platform.isLoaded('simplehats') && Item.exists(P5.SH_HAT_ITEM); } catch (x) { f5_shOk = false; }
  console.log('[Festivity5] Simple Hats elf hat drop ' + (f5_shOk ? 'ON (' + P5.SH_HAT_ITEM + ')' : 'off (mod or item ' + P5.SH_HAT_ITEM + ' missing)'));
  return f5_shOk;
}
// Captain's sack: shake it out
ItemEvents.rightClicked(event => {
  try {
    if (String(event.item.id) != 'chop:present_sack') return;
    let p = event.player, server = p.server, roll = Math.random(), got;
    if (roll < 0.1) got = 'chop:ribbon_token 1'; else if (roll < 0.5) got = presentItem() + ' 1'; else got = 'chop:sour_candy ' + (3 + Math.floor(Math.random() * 4));
    f5cmd(server, 'give ' + p.username + ' ' + got);
    if (Math.random() < 0.7) { event.item.shrink(1); f5cmd(server, 'tellraw ' + p.username + ' ' + F5.jsonText('The sack is empty now.', 'gray')); }
    f5cmd(server, 'playsound minecraft:item.bundle.drop_contents master ' + p.username);
    event.cancel();
  } catch (x) {}
});

// ===================== C. FREED ELVES: on the ground, small, run away, despawn =====================
// Replaces Phase 4's allay version. NoAI stray with the Freed Elf look (name-based ETF), scaled 0.7, moved by script away from the
// nearest player for FREED_TICKS, gift dropped at the start, then discarded. Never attacks (NoAI).
function spawnFreedElf(server, x, y, z, who) {
  f5cmd(server, 'summon ' + fid('minecraft:stray') + ' ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Glowing:1b,Variant:5b,Tags:["fest_minion","fest_elf","fest_e4","fest_freed"]}');
  server.scheduleInTicks(1, () => { try { for (let e of findByTag(server, 'fest_freed', { x: x, z: z }, 4)) { if (!e.persistentData.getBoolean('fest_freedInit')) { e.persistentData.putBoolean('fest_freedInit', true); e.persistentData.putInt('fest_freedUntil', server.tickCount + P5.FREED_TICKS); f5scale(server, e, P5.FREED_SCALE); } } } catch (q) {} });
  f5cmd(server, 'particle minecraft:end_rod ' + Math.floor(x) + ' ' + (Math.floor(y) + 1) + ' ' + Math.floor(z) + ' 0.5 0.8 0.5 0.02 30');
  f5cmd(server, 'playsound minecraft:block.amethyst_block.chime master @a ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' 1 1.4');
  dropItem(server, Math.floor(x), Math.floor(y), Math.floor(z), presentItem(), 1);
  try { let candy = e4first(P4.CANDY); dropItem(server, Math.floor(x), Math.floor(y), Math.floor(z), candy, 2); } catch (q) {}
  if (who) f5cmd(server, 'tellraw ' + who + ' ' + F5.jsonText('A freed elf bows, drops a thank-you, and runs for the hills.', 'aqua'));
}
function f5freedTick(server) {
  let list = findByTag(server, 'fest_freed', null); if (!list.length) return;
  for (let e of list) {
    try {
      let until = e.persistentData.getInt('fest_freedUntil') || 0;
      if (until && server.tickCount >= until) { f5cmd(server, 'particle minecraft:happy_villager ' + f5pos(e) + ' 0.5 0.5 0.5 0 12'); e.discard(); continue; }
      let p = f5nearest(f5players(server), e.x, e.z); if (!p) continue;
      let dx = e.x - p.x, dz = e.z - p.z, h = Math.sqrt(dx * dx + dz * dz); if (h < 0.1) { dx = 1; dz = 0; h = 1; }
      let step = 0.9, nx = e.x + dx / h * step, nz = e.z + dz / h * step, ny = surfaceY(e.level, Math.floor(nx), Math.floor(nz));
      if (Math.abs(ny - e.y) > 3) ny = e.y;
      let yaw = Math.floor(Math.atan2(-(dx / h), dz / h) * 180 / Math.PI);
      f5cmd(server, 'tp ' + e.uuid + ' ' + nx.toFixed(2) + ' ' + ny + ' ' + nz.toFixed(2) + ' ' + yaw + ' 0');
    } catch (x) {}
  }
}

// ===================== D. SANTA FLYBY =====================
// Josh: just him flying by in the sky with a Christmas bell sound. An invisible marker carries the Santa look (Looks v2: ETF/EMF on
// the named entity); he crosses the sky over the players at SANTA_HEIGHT, bells chime as he passes, then he is gone.
function santaFlyby(server, forced, gift) {
  let ps = f5players(server); if (!ps.length) return;
  let p = f5pick(ps), ang = Math.random() * Math.PI * 2, r = 90;
  let sx = p.x + Math.cos(ang) * r, sz = p.z + Math.sin(ang) * r, ex = p.x - Math.cos(ang) * r, ez = p.z - Math.sin(ang) * r;
  let y = Math.max(surfaceY(server.overworld(), Math.floor(p.x), Math.floor(p.z)), p.y) + P5.SANTA_HEIGHT;
  f5cmd(server, 'kill @e[tag=fest_santa]');
  if (F5_MOD) f5cmd(server, 'summon festivity:santa_sleigh ' + sx.toFixed(1) + ' ' + y + ' ' + sz.toFixed(1) + ' {NoAI:1b,NoGravity:1b,Invulnerable:1b,Silent:1b,PersistenceRequired:1b,Tags:["fest_santa","fest_e4"]}');
  else f5cmd(server, 'summon minecraft:armor_stand ' + sx.toFixed(1) + ' ' + y + ' ' + sz.toFixed(1) + ' {NoGravity:1b,Invulnerable:1b,Marker:1b,Silent:1b,Tags:["fest_santa","fest_e4"]}');
  F5.data(server).putString('p5_santa', JSON.stringify({ x: sx, y: y, z: sz, ex: ex, ez: ez, step: 0, gift: !!gift, gx: p.x, gy: p.y, gz: p.z, who: p.username, total: 2 * r }));
  F5.logEvent(server, gift ? "Santa's sleigh crossed the dawn sky" : 'Santa flew over');
  f5log('santa flyby near ' + p.username + (forced ? ' (debug)' : '') + (gift ? ' with a gift' : ''));
}
// v11: the Phase 3 dawn fly-by (Merry+, once a day, particles only) now uses the sleigh prop and drops a small gift. Same name, Phase 3's tick calls it.
function startSleigh(server) { santaFlyby(server, false, P5.SLEIGH_GIFT); }
function f5sleighGift(server, s) {
  let x = Math.floor(s.gx), z = Math.floor(s.gz), y = surfaceY(server.overworld(), x, z) + 6;
  dropItem(server, x, y, z, presentItem(), 1);
  try { dropItem(server, x, y, z, e4first(P4.CANDY), 2); } catch (q) {}
  f5cmd(server, 'particle minecraft:firework ' + x + ' ' + (y + 2) + ' ' + z + ' 0.5 3 0.5 0.05 40 force');
  f5cmd(server, 'playsound minecraft:entity.firework_rocket.twinkle master @a ' + x + ' ' + y + ' ' + z + ' 2 1');
  if (s.who) f5cmd(server, 'title ' + s.who + ' actionbar ' + F5.jsonText("Something fell from Santa's sleigh!", 'gold'));
}
function santaTick(server) {
  let s = F5.readJson(server, 'p5_santa', null); if (!s) return;
  let dx = s.ex - s.x, dz = s.ez - s.z, h = Math.sqrt(dx * dx + dz * dz);
  if (h < P5.SANTA_SPEED) { f5cmd(server, 'kill @e[tag=fest_santa]'); F5.data(server).remove('p5_santa'); return; }
  s.x += dx / h * P5.SANTA_SPEED; s.z += dz / h * P5.SANTA_SPEED; s.step++;
  if (s.gift && !s.gifted && s.total && h <= s.total / 2) { s.gifted = true; try { f5sleighGift(server, s); } catch (q) { f5log('sleigh gift: ' + q); } }   // v11: midpoint = over the player
  let yaw = Math.floor(Math.atan2(-(dx / h), dz / h) * 180 / Math.PI);
  f5cmd(server, 'tp @e[tag=fest_santa,limit=1] ' + s.x.toFixed(1) + ' ' + s.y + ' ' + s.z.toFixed(1) + ' ' + yaw + ' 0');
  f5cmd(server, 'particle minecraft:end_rod ' + s.x.toFixed(1) + ' ' + (s.y - 0.5) + ' ' + s.z.toFixed(1) + ' 0.3 0.1 0.3 0.01 4');
  if (s.step % 4 == 0) f5cmd(server, 'playsound minecraft:block.bell.use master @a ' + Math.floor(s.x) + ' ' + Math.floor(s.y - 20) + ' ' + Math.floor(s.z) + ' 3 ' + (s.step % 8 == 0 ? '1.6' : '1.9'));
  if (s.step % 12 == 0) f5cmd(server, 'playsound minecraft:block.note_block.chime master @a ' + Math.floor(s.x) + ' ' + Math.floor(s.y - 20) + ' ' + Math.floor(s.z) + ' 2 1.2');
  F5.data(server).putString('p5_santa', JSON.stringify(s));
}

// ===================== E. ROTTEN GINGERBREAD: splits into parts; chunks bake a Gingerbread Friend =====================
function f5isGingerbread(e) { return f5isType(e, 'minecraft:skeleton') && f5has(e, 'fest_minion') && f5has(e, 'fest_t3') && !f5has(e, 'fest_gbpart'); }
EntityEvents.death(event => {
  try {
    let e = event.entity, server = e.server;
    if (f5has(e, 'fest_gbpart')) {   // a limb died: chunk / rotten cookie
      let x = Number(e.x.toFixed(1)), y = Number(e.y.toFixed(1)), z = Number(e.z.toFixed(1));
      if (Math.random() < P5.GB_CHUNK_CHANCE) dropItem(server, x, y, z, 'chop:gingerbread_chunk', 1);
      if (Math.random() < P5.GB_COOKIE_CHANCE) dropItem(server, x, y, z, 'chop:rotten_cookie', 1);
      return;
    }
    if (!f5isGingerbread(e)) return;
    dropItem(server, e.x, e.y, e.z, 'chop:gingerbread_chunk', 1 + Math.floor(Math.random() * 2));   // Josh 11-08: the man himself drops something
    if (Math.random() < P5.GB_COOKIE_CHANCE) dropItem(server, e.x, e.y, e.z, 'chop:rotten_cookie', 1);
    if (findByTag(server, 'fest_gbpart', { x: e.x, z: e.z }, 48).length >= P5.GB_PART_CAP) return;
    let parts = P5.GB_PARTS.slice(), picked = [];
    for (let i = 0; i < P5.GB_PARTS_PER_DEATH && parts.length; i++) picked.push(parts.splice(Math.floor(Math.random() * parts.length), 1)[0]);
    for (let part of picked) {
      let tag = 'fest_gb_' + part.toLowerCase();
      f5cmd(server, 'summon ' + fid('minecraft:slime') + ' ' + (e.x + f5rnd(-0.6, 0.6)).toFixed(2) + ' ' + (e.y + 0.5).toFixed(2) + ' ' + (e.z + f5rnd(-0.6, 0.6)).toFixed(2) + ' {Size:0,PersistenceRequired:1b,Variant:' + f5variantFromTags('festivity:gingerbread_part', tag) + 'b,Tags:["fest_minion","fest_t3","fest_gbpart","' + tag + '"],Motion:[' + f5rnd(-0.3, 0.3).toFixed(2) + 'd,0.4d,' + f5rnd(-0.3, 0.3).toFixed(2) + 'd],active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1,show_particles:0b},{id:"minecraft:jump_boost",amplifier:1,duration:-1,show_particles:0b}]}');
    }
    f5cmd(server, 'particle minecraft:item minecraft:cookie ' + e.x.toFixed(1) + ' ' + (e.y + 1).toFixed(1) + ' ' + e.z.toFixed(1) + ' 0.5 0.5 0.5 0.1 25');
    f5cmd(server, 'playsound minecraft:entity.slime.squish master @a ' + f5pos(e) + ' 1 0.6');
    f5log('gingerbread split into ' + picked.join(' + '));
  } catch (x) { console.warn('[Festivity5] gingerbread: ' + x); }
});
// Gingerbread Friend: 9 chunks -> item; right-click the ground to wake a small, tamed slime that follows you (Redomesticate API via pets)
BlockEvents.rightClicked(event => {
  try {
    if (String(event.item.id) != 'chop:gingerbread_friend') return;
    let p = event.player, server = p.server, b = event.block, x = b.x + 0.5, y = b.y + 1, z = b.z + 0.5;
    // v15: jar 0.8.0 buddy entity first (pets v10 helper, owner = this player), old gingerbread_part Variant 4 pet when the jar lacks it
    let buddy = false;
    try { if (typeof ptSummonBuddy == 'function') buddy = !!ptSummonBuddy(server, p, x, y, z, ['fest_pet', 'fest_gbfriend']); } catch (q) { buddy = false; f5log('buddy summon: ' + q); }
    if (!buddy) f5cmd(server, 'summon ' + fid('minecraft:slime') + ' ' + x + ' ' + y + ' ' + z + ' {Size:0,PersistenceRequired:1b,Variant:4b,Tags:["fest_pet","fest_gbfriend"]}');
    f5log('gingerbread friend for ' + p.username + ': ' + (buddy ? 'festivity:gingerbread_buddy' : 'gingerbread_part Variant 4'));
    server.scheduleInTicks(2, () => {
      try {
        for (let e of findByTag(server, 'fest_gbfriend', { x: x, z: z }, 3)) {
          if (e.persistentData.getBoolean('fest_friendInit')) continue; e.persistentData.putBoolean('fest_friendInit', true);
          if (f5type(e) == 'festivity:gingerbread_buddy') { f5cmd(server, 'particle minecraft:heart ' + f5pos(e) + ' 0.5 0.5 0.5 0 6'); continue; }   // v15: the jar owns the buddy (fest_owner); no Redomesticate tame, no HP merge
          try { ptForceTame(server, e, p); } catch (q) { f5log('friend tame failed: ' + q); }
          f5cmd(server, 'attribute ' + e.uuid + ' minecraft:generic.max_health base set 16'); f5cmd(server, 'effect give ' + e.uuid + ' minecraft:instant_health 1 5 true');
          f5cmd(server, 'particle minecraft:heart ' + f5pos(e) + ' 0.5 0.5 0.5 0 6');
        }
      } catch (q) {}
    });
    f5cmd(server, 'playsound minecraft:block.note_block.bell master ' + p.username + ' ~ ~ ~ 1 1.5');
    f5cmd(server, 'tellraw ' + p.username + ' ' + F5.jsonText('Your Gingerbread Friend wobbles to life.', 'gold'));
    if (!p.isCreative()) event.item.shrink(1);
    event.cancel();
  } catch (x) {}
});

// ===================== F. FROST HOUND: tameable with a Frozen Treat; bite slows =====================
ItemEvents.entityInteracted(event => {
  try {
    let e = event.target, p = event.player; if (!f5has(e, 'fest_hound') || String(event.item.id) != 'chop:frozen_treat') return;
    let server = p.server;
    if (!p.isCreative()) event.item.shrink(1);
    if (Math.random() > P5.HOUND_TAME_CHANCE) { f5cmd(server, 'particle minecraft:smoke ' + f5pos(e) + ' 0.4 0.4 0.4 0 8'); f5cmd(server, 'playsound minecraft:entity.wolf.growl master ' + p.username + ' ~ ~ ~ 1 0.7'); event.cancel(); return; }
    let tamed = false;
    try { e.tame(p); tamed = true; } catch (q) { try { e.setTame(true, true); e.setOwnerUUID(p.uuid); tamed = true; } catch (r) { f5log('hound tame api: ' + r); } }
    if (!tamed) { try { tamed = ptForceTame(server, e, p); } catch (q) {} }
    f5cmd(server, 'data merge entity ' + e.uuid + ' {AngerTime:0,AngryAt:[I;0,0,0,0]}');
    try { e.removeTag('fest_minion'); e.removeTag('fest_hound'); e.removeTag('fest_t3'); e.addTag('fest_pet'); e.addTag('fest_pethound'); } catch (q) {}
    try { e.setTarget(null); } catch (q) {}
    f5cmd(server, 'particle minecraft:heart ' + f5pos(e) + ' 0.5 0.5 0.5 0 8');
    f5cmd(server, 'playsound minecraft:entity.wolf.whine master ' + p.username + ' ~ ~ ~ 1 1');
    f5cmd(server, 'tellraw ' + p.username + ' ' + F5.jsonText('The Frost Hound licks the frost off your glove. It is yours.', 'aqua'));
    F5.logEvent(server, p.username + ' tamed a Frost Hound');
    event.cancel();
  } catch (x) { console.warn('[Festivity5] hound: ' + x); }
});
// bites slow; Nutcracker hits never wither (H)
EntityEvents.afterHurt(event => {
  try {
    let v = event.entity, src = event.source, a = src ? src.actual : null; if (!a) a = src.immediate;
    if (!a || !v) return;
    if (f5has(a, 'fest_hound')) { let server = v.server; f5cmd(server, 'effect give ' + v.uuid + ' minecraft:slowness ' + Math.ceil(P5.HOUND_SLOW_TICKS / 20) + ' 1 true'); return; }
    if (f5has(a, 'fest_minion') && f5isType(a, 'minecraft:wither_skeleton')) { v.server.scheduleInTicks(1, () => { try { f5cmd(v.server, 'effect clear ' + v.uuid + ' minecraft:wither'); } catch (q) {} }); }
  } catch (x) {}
});

// ===================== G. REINDEER: rare snowy horse, Bell Necklace to ride, winter edge =====================
EntityEvents.spawned('minecraft:horse', event => {
  try {
    let e = event.entity; if (f5has(e, 'fest_reindeer') || f5has(e, 'fest_e4')) return;
    let biome = ''; try { biome = String(e.level.getBiome(e.blockPosition()).unwrapKey().get().location()); } catch (q) { try { biome = String(e.block.biomeId); } catch (r) {} }
    if (!P5.REINDEER_BIOME.test(biome) || Math.random() > P5.REINDEER_CHANCE) return;
    if (F5_MOD) {   // jar: swap the horse for a real reindeer
      f5cmd(e.server, 'summon festivity:reindeer ' + e.x.toFixed(1) + ' ' + e.y.toFixed(1) + ' ' + e.z.toFixed(1) + ' {Tags:["fest_reindeer","fest_wildreindeer"]}');
      e.discard(); f5log('reindeer replaced a horse in ' + biome); return;
    }
    e.addTag('fest_reindeer'); e.addTag('fest_wildreindeer');
    f5cmd(e.server, 'data merge entity ' + e.uuid + ' {Variant:3}');
    f5cmd(e.server, 'attribute ' + e.uuid + ' minecraft:generic.movement_speed base set 0.3');
    f5cmd(e.server, 'attribute ' + e.uuid + ' minecraft:horse.jump_strength base set 0.9');
    f5log('reindeer spawned in ' + biome);
  } catch (x) {}
});
ItemEvents.entityInteracted(event => {
  try {
    let e = event.target, p = event.player; if (!f5has(e, 'fest_reindeer')) return;
    let server = p.server;
    if (f5has(e, 'fest_e4')) { f5cmd(server, 'tellraw ' + p.username + ' ' + F5.jsonText('This one is not yours to keep. It only watches.', 'gray')); event.cancel(); return; }   // event reindeer: never tameable
    if (String(event.item.id) != 'chop:bell_necklace') return;
    let tamed = false; try { tamed = !!e.isTamed(); } catch (q) { try { tamed = !!e.tamed; } catch (r) {} }
    if (!tamed) { f5cmd(server, 'tellraw ' + p.username + ' ' + F5.jsonText('Calm it first: ride it bareback until it accepts you, like a horse.', 'gray')); event.cancel(); return; }
    if (!p.isCreative()) event.item.shrink(1);
    f5cmd(server, 'data merge entity ' + e.uuid + ' {SaddleItem:{id:"minecraft:saddle",count:1}}');
    e.addTag('fest_belled');
    f5cmd(server, 'playsound minecraft:block.bell.use master @a ' + f5pos(e) + ' 1 1.5');
    f5cmd(server, 'particle minecraft:note ' + f5pos(e) + ' 0.6 0.6 0.6 1 8');
    f5cmd(server, 'tellraw ' + p.username + ' ' + F5.jsonText('The bell jingles. Your Reindeer is ready to ride.', 'gold'));
    event.cancel();
  } catch (x) {}
});
function f5reindeerTick(server) {
  for (let p of f5players(server)) {
    try {
      let v = p.vehicle; if (!v || !f5has(v, 'fest_reindeer')) continue;
      if (!f5has(v, 'fest_belled')) {   // a saddle alone does not do it
        let saddled = false; try { saddled = String(v.nbt.get('SaddleItem') || '') != ''; } catch (q) {}
        if (saddled) { f5cmd(server, 'data remove entity ' + v.uuid + ' SaddleItem'); f5cmd(server, 'ride ' + p.username + ' dismount'); f5cmd(server, 'tellraw ' + p.username + ' ' + F5.jsonText('A Reindeer wants a Bell Necklace, not a saddle.', 'gray')); }
        continue;
      }
      // the winter edge: never freezes, no powder-snow sinking, quick in the snow
      f5cmd(server, 'data merge entity ' + v.uuid + ' {TicksFrozen:0}');
      let under = ''; try { under = String(v.level.getBlock(Math.floor(v.x), Math.floor(v.y) - 1, Math.floor(v.z)).id); } catch (q) {}
      let here = ''; try { here = String(v.level.getBlock(Math.floor(v.x), Math.floor(v.y), Math.floor(v.z)).id); } catch (q) {}
      if (here == 'minecraft:powder_snow') f5cmd(server, 'tp ' + v.uuid + ' ' + v.x.toFixed(2) + ' ' + (Math.floor(v.y) + 1.05) + ' ' + v.z.toFixed(2));
      if (under.includes('snow') || under.includes('ice') || here == 'minecraft:snow') { f5cmd(server, 'effect give ' + v.uuid + ' minecraft:speed 3 1 true'); f5cmd(server, 'effect give ' + v.uuid + ' minecraft:jump_boost 3 0 true'); }
    } catch (x) {}
  }
}

// ===================== H. NUTCRACKER DRUMMER (variant; Immersive Melodies MIDI later) =====================
function f5drummerTick(server) {
  for (let p of f5players(server)) {
    let list; try { list = p.level.getEntitiesWithin(AABB.of(p.x - 32, p.y - 10, p.z - 32, p.x + 32, p.y + 10, p.z + 32)); } catch (x) { continue; }
    for (let e of list) {
      try {
        if (!f5isType(e, 'minecraft:wither_skeleton') || !f5has(e, 'fest_minion')) continue;
        if (!e.persistentData.getBoolean('fest_nutRolled')) {
          e.persistentData.putBoolean('fest_nutRolled', true);
          if (Math.random() < P5.NUTCRACKER_DRUMMER) { e.addTag('fest_drummer'); f5cmd(server, 'data merge entity ' + e.uuid + ' {HandItems:[{id:"minecraft:stick",count:1},{id:"minecraft:note_block",count:1}]}'); }
        }
        if (f5has(e, 'fest_drummer') && server.tickCount % 40 == 0) { f5cmd(server, 'playsound minecraft:block.note_block.basedrum master @a ' + f5pos(e) + ' 1.5 0.8'); f5cmd(server, 'playsound minecraft:block.note_block.snare master @a ' + f5pos(e) + ' 1 1.1'); f5cmd(server, 'effect give @e[tag=fest_minion,distance=..12,tag=!fest_claws] minecraft:speed 3 0 true'); }
      } catch (x) {}
    }
  }
}

// ===================== I. RECIPES =====================
ServerEvents.recipes(event => {
  event.shapeless('2x chop:rocky_snowball', ['minecraft:snowball', 'minecraft:cobblestone']).id('chop:rocky_snowball_cobble');
  event.shapeless('2x chop:rocky_snowball', ['minecraft:snowball', 'minecraft:stone']).id('chop:rocky_snowball_stone');
  event.shapeless('2x chop:rocky_snowball', ['minecraft:snowball', 'minecraft:deepslate']).id('chop:rocky_snowball_deepslate');
  event.shaped('chop:gingerbread_friend', ['GGG', 'GGG', 'GGG'], { G: 'chop:gingerbread_chunk' }).id('chop:gingerbread_friend');
  event.shapeless('chop:frozen_treat', ['minecraft:snowball', 'minecraft:cooked_beef']).id('chop:frozen_treat_beef');
  event.shapeless('chop:frozen_treat', ['minecraft:snowball', 'minecraft:cooked_mutton']).id('chop:frozen_treat_mutton');
  event.shapeless('chop:frozen_treat', ['minecraft:snowball', 'minecraft:cooked_porkchop']).id('chop:frozen_treat_pork');
  event.shaped('chop:bell_necklace', [' L ', 'L L', ' B '], { L: 'minecraft:leather', B: 'minecraft:bell' }).id('chop:bell_necklace');
  event.shapeless('minecraft:sugar', ['chop:sour_candy', 'chop:sour_candy']).id('chop:sugar_from_sour_candy');
  console.log('[Festivity5] recipes: rocky snowball, gingerbread friend, frozen treat, bell necklace, sour candy -> sugar');
});

// ===================== J. TICK + DEBUG =====================
let f5_lastSantaNight = -1;
var f5_initDone = false;   // v12b: /reload does not re-fire ServerEvents.loaded, so run the one-time checks from the first tick
ServerEvents.tick(event => {
  let server = event.server;
  if (!f5_initDone) { f5_initDone = true; try { f5simpleHat(); f5mca(); } catch (x) { console.log('[Festivity5] init checks failed: ' + x); } }
  if (server.tickCount % 5 == 0 && F5.readJson(server, 'p5_santa', null)) santaTick(server);
  if (server.tickCount % 20 != 0 || F5.onlineCount(server) == 0) return;
  try { f5rockTick(server); } catch (e) {}
  try { f5bomberTick(server); } catch (e) {}
  try { f5reindeerTick(server); } catch (e) {}
  try { f5freedTick(server); } catch (e) {}
  // Phase 2 only runs clawsTick/boxTick at night outside grace (its tick returns early otherwise), so a daytime or debug Claws just
  // stood there and Phase 4's stall guard dragged him in. Run them here whenever Phase 2 is gated.
  try {
    let d2 = p2data(server);
    if ((d2.contains('claws') || d2.contains('box')) && (!isNight(server) || F5.inGrace(server) || d2.getBoolean('frozen'))) {
      if (d2.contains('claws')) clawsTick(server);
      boxTick(server);
    }
  } catch (e) { f5log('claws daytime tick: ' + e); }
  if (server.tickCount % 40 == 0) { try { f5stripNames(server); } catch (e) {} try { f5syncVariants(server); } catch (e) {} try { f5promoteElves(server); } catch (e) {} try { f5thiefTick(server); } catch (e) {} try { f5drummerTick(server); } catch (e) {} }
  if (server.tickCount % 100 == 0) {
    let t = F5.dayTime(server) % 24000, day = F5.dayCount(server);
    if (t >= P5.SANTA_TIME && t < P5.SANTA_TIME + 600 && day != f5_lastSantaNight && day % P5.SANTA_EVERY_NIGHTS == 0 && !F5.inGrace(server)) { f5_lastSantaNight = day; santaFlyby(server, false); }
    try { f5duelTick(server); } catch (e) {}
    if (server.tickCount % P5.BABY_POLL_TICKS == 0) { try { f5babyTick(server); } catch (e) { f5log('baby tick: ' + e); } }   // v12: MCA baby detection (section L)
  }
});

// ===================== K. NAUGHTY DUEL (design: consensual PvP exempt from the -8 PvP penalty) + baby_born action (v11) =====================
// /festivity duel <player> challenges; the other answers /festivity duel accept within DUEL_ACCEPT_S. The duel lasts DUEL_MINUTES or until one
// kills the other: that kill scores nothing (Phase 1's death handler still calls Fest.score('kill_player', ...), the wrapper below returns 0).
// No reward either way: a duel is never a Festivity source. Only players, only by name, both must be online.
function f5duels(server) { let d = F5.readJson(server, 'p5_duel', null); return d && d.pending && d.active ? d : { pending: [], active: [] }; }
function f5duelSave(server, d) { F5.data(server).putString('p5_duel', JSON.stringify(d)); }
function f5duelOf(d, a, b) { for (let i = 0; i < d.active.length; i++) { let x = d.active[i]; if ((x.a == a && x.b == b) || (x.a == b && x.b == a)) return i; } return -1; }
function f5duelChallenge(server, from, to) {
  if (from.username == to.username) { from.tell(Text.of('You cannot duel yourself.').gray()); return; }
  let d = f5duels(server);
  if (f5duelOf(d, from.username, to.username) >= 0) { from.tell(Text.of('You two are already duelling.').gray()); return; }
  d.pending = d.pending.filter(q => q.from != from.username);
  d.pending.push({ from: from.username, to: to.username, t: F5.nowMs() });
  f5duelSave(server, d);
  from.tell(Text.of('Naughty Duel: you challenged ' + to.username + '. They have ' + P5.DUEL_ACCEPT_S + ' s to type /festivity duel accept.').darkRed());
  to.tell(Text.of(from.username + ' challenges you to a Naughty Duel (' + P5.DUEL_MINUTES + ' min, the kill costs no Festivity). /festivity duel accept').darkRed());
  f5cmd(server, 'playsound minecraft:block.anvil.land master ' + to.username + ' ~ ~ ~ 0.6 0.6');
}
function f5duelAccept(server, p) {
  let d = f5duels(server), now = F5.nowMs(), c = null;
  for (let q of d.pending) if (q.to == p.username && now - q.t <= P5.DUEL_ACCEPT_S * 1000) c = q;
  if (!c) { p.tell(Text.of('No open duel challenge for you.').gray()); return; }
  let other = findPlayer(server, c.from); if (!other) { p.tell(Text.of(c.from + ' is gone.').gray()); return; }
  d.pending = d.pending.filter(q => q.to != p.username);
  d.active.push({ a: c.from, b: p.username, until: now + P5.DUEL_MINUTES * 60000 });
  f5duelSave(server, d);
  F5.announce(server, 'Naughty Duel: ' + c.from + ' vs ' + p.username + '! ' + P5.DUEL_MINUTES + ' minutes, no Festivity at stake.', 'dark_red');
  f5cmd(server, 'playsound minecraft:block.bell.use master @a ~ ~ ~ 1 0.5');
  F5.logEvent(server, c.from + ' and ' + p.username + ' fought a Naughty Duel');
}
function f5duelCancel(server, p) {
  let d = f5duels(server), n = d.pending.length + d.active.length;
  d.pending = d.pending.filter(q => q.from != p.username && q.to != p.username);
  let left = []; for (let x of d.active) { if (x.a == p.username || x.b == p.username) { let o = findPlayer(server, x.a == p.username ? x.b : x.a); if (o) o.tell(Text.of(p.username + ' called off the duel.').gray()); } else left.push(x); }
  d.active = left; f5duelSave(server, d);
  p.tell(Text.of(n > d.pending.length + d.active.length ? 'Duel called off.' : 'You have no duel.').gray());
}
function f5duelTick(server) {   // expire old challenges and finished duels (every 5 s)
  let d = f5duels(server); if (!d.pending.length && !d.active.length) return;
  let now = F5.nowMs(), changed = false;
  let pend = d.pending.filter(q => now - q.t <= P5.DUEL_ACCEPT_S * 1000); if (pend.length != d.pending.length) { d.pending = pend; changed = true; }
  let act = []; for (let x of d.active) { if (now > x.until) { changed = true; F5.announce(server, 'The duel between ' + x.a + ' and ' + x.b + ' ends in a draw.', 'gray'); } else act.push(x); }
  if (changed) { d.active = act; f5duelSave(server, d); }
}
// Fest.score wrapper: duel kills score nothing; baby_born carries a 48 h per-player cooldown. Wraps whatever quests draft wrapped before (load order 25 > 24).
(function () {
  try { FEST.ACTIONS.baby_born = { pts: P5.BABY_PTS, cap: P5.BABY_PTS }; } catch (e) { console.warn('[Festivity5] baby_born action not added: ' + e); }
  var orig = Fest.score;
  Fest.score = function (server, player, key, mult, reason) {
    try {
      if (key == 'kill_player' && player && reason && String(reason).indexOf('killed ') == 0) {
        var victim = String(reason).substring(7), d = f5duels(server), i = f5duelOf(d, player.username, victim);
        if (i >= 0) {
          d.active.splice(i, 1); f5duelSave(server, d);
          F5.announce(server, player.username + ' won the Naughty Duel against ' + victim + '. No Festivity lost.', 'dark_red');
          F5.logEvent(server, player.username + ' won a Naughty Duel against ' + victim);
          return 0;
        }
      }
      if (key == 'baby_born' && player) {
        var last = player.persistentData.getLong('fest_lastBaby') || 0;
        if (last && F5.nowMs() - last < P5.BABY_COOLDOWN_H * 3600000) { f5log('baby_born on cooldown for ' + player.username); return 0; }
        player.persistentData.putLong('fest_lastBaby', F5.nowMs());
      }
    } catch (e) {}
    return orig(server, player, key, mult, reason);
  };
})();

// ===================== M. GINGERBREAD HOUSE RAID (v14, Josh 20:09 UTC 11-08) =====================
// Assets' gingerbread house carries a marker armor stand tagged fest_gbhouse and a chest. Opening a chest within GBHOUSE_RADIUS of a marker
// wakes the house once: the marker goes, 1 s later a Rotten Gingerbread Man + GBHOUSE_PARTS parts (Variant 0..3) rise 6 blocks from the marker
// on the player's side (the door side), tagged fest_minion fest_gbhouse_wave (no name): dawn kills them like every other minion. Any band, any time,
// no Festivity change. Chest loot: festivity_gbhouse_loot.js (chop:chests/gingerbread_house).
function f5gbhouseMarker(level, x, y, z) {
  let r = P5.GBHOUSE_RADIUS, list;
  try { list = level.getEntitiesWithin(AABB.of(x - r, y - r, z - r, x + r, y + r, z + r)); } catch (q) { return null; }
  for (let e of list) { try { if (f5type(e) == 'minecraft:armor_stand' && f5has(e, 'fest_gbhouse')) return e; } catch (q) {} }
  return null;
}
function f5gbhouseWake(server, p, bx, by, bz) {
  let m = f5gbhouseMarker(p.level, bx, by, bz); if (!m) return false;
  let mx = m.x, my = m.y, mz = m.z;
  // v15: 1 in 4 woken houses also has a stray buddy (jar 0.8.0 `festivity buddies <n>` at the marker); unknown command on an older jar fails silently
  if (Math.floor(Math.random() * 4) == 0) {
    try {
      let r = f5cmd(server, 'execute positioned ' + Math.floor(mx) + ' ' + Math.floor(my) + ' ' + Math.floor(mz) + ' run festivity buddies 1');
      f5log('gingerbread house stray buddy at ' + Math.floor(mx) + ' ' + Math.floor(my) + ' ' + Math.floor(mz) + ' (result ' + r + ')');
    } catch (q) { f5log('stray buddy command: ' + q); }
  }
  m.discard();   // one raid per house
  let dx = p.x - mx, dz = p.z - mz, h = Math.sqrt(dx * dx + dz * dz); if (h < 0.1) { dx = 1; dz = 0; h = 1; }
  let sx = mx + dx / h * P5.GBHOUSE_DOOR_DIST, sz = mz + dz / h * P5.GBHOUSE_DOOR_DIST, sy = surfaceY(p.level, Math.floor(sx), Math.floor(sz));
  if (Math.abs(sy - my) > 6) sy = Math.floor(my);
  f5cmd(server, 'playsound minecraft:block.sweet_berry_bush.pick_berries master @a ' + Math.floor(mx) + ' ' + Math.floor(my) + ' ' + Math.floor(mz) + ' 1 0.6');
  server.scheduleInTicks(20, () => {
    try {
      summon(server, 'minecraft:skeleton', sx, sy, sz, 'Rotten Gingerbread Man', 'fest_t3 fest_gbhouse_wave', '{HandItems:[{id:"minecraft:wooden_sword",count:1},{}],active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1,show_particles:0b}]}');
      for (let i = 0; i < P5.GBHOUSE_PARTS; i++) {
        let v = i % 4, tag = ['fest_gb_head', 'fest_gb_arm', 'fest_gb_leg', 'fest_gb_torso'][v];
        f5cmd(server, 'summon ' + fid('minecraft:slime') + ' ' + (sx + f5rnd(-1.5, 1.5)).toFixed(2) + ' ' + (sy + 0.5).toFixed(2) + ' ' + (sz + f5rnd(-1.5, 1.5)).toFixed(2) + ' {Size:0,PersistenceRequired:1b,Variant:' + v + 'b,Tags:["fest_minion","fest_t3","fest_gbpart","fest_gbhouse_wave","' + tag + '"],active_effects:[{id:"minecraft:speed",amplifier:1,duration:-1,show_particles:0b},{id:"minecraft:jump_boost",amplifier:1,duration:-1,show_particles:0b}]}');
      }
      f5cmd(server, 'playsound minecraft:entity.generic.explode master @a ' + Math.floor(sx) + ' ' + Math.floor(sy) + ' ' + Math.floor(sz) + ' 0.4 0.9');
      f5cmd(server, 'playsound minecraft:block.note_block.chime master @a ' + Math.floor(sx) + ' ' + Math.floor(sy) + ' ' + Math.floor(sz) + ' 1 0.7');
      f5cmd(server, 'particle minecraft:item minecraft:cookie ' + sx.toFixed(1) + ' ' + (sy + 1) + ' ' + sz.toFixed(1) + ' 1.5 1 1.5 0.1 40');
      f5cmd(server, 'title @a[x=' + Math.floor(mx) + ',y=' + Math.floor(my) + ',z=' + Math.floor(mz) + ',distance=..24] actionbar ' + F5.jsonText('The house is awake.', 'gold'));
      F5.logEvent(server, p.username + ' woke a gingerbread house');
      f5log('gingerbread house raid at ' + Math.floor(mx) + ' ' + Math.floor(my) + ' ' + Math.floor(mz) + ' for ' + p.username);
    } catch (q) { console.warn('[Festivity5] gbhouse wave: ' + q); }
  });
  return true;
}
// trigger: PlayerEvents.chestOpened when this KubeJS has it, else a right-click on a chest block
(function () {
  try {
    PlayerEvents.chestOpened(event => {
      try { let p = event.player, b = event.block; if (!p || !b) return; f5gbhouseWake(p.server, p, b.x, b.y, b.z); } catch (q) {}
    });
    console.log('[Festivity5] gingerbread house trigger: PlayerEvents.chestOpened');
    return;
  } catch (e) { console.log('[Festivity5] PlayerEvents.chestOpened not available (' + e + '); using BlockEvents.rightClicked on chests'); }
  BlockEvents.rightClicked(event => {
    try {
      let p = event.player, b = event.block; if (!p || !b) return;
      let id = String(b.id); if (id != 'minecraft:chest' && id != 'minecraft:trapped_chest') return;
      f5gbhouseWake(p.server, p, b.x, b.y, b.z);
    } catch (q) {}
  });
})();

// ===================== L. MCA BABY DETECTION (v12): poll the Romantic Expansion pregnancy state, credit baby_born to both parents =====================
// Verified against the sources (2026-11-08): MCA Reborn, branch 1.21.1 (modid mca, package net.conczin.mca) has NO birth event; babies are BabyItem
// stacks. The Romantic Expansion add-on (modid mcaromanticexpansion, 1.0.5, package com.xiaoshi2022.mcaromanticexpansion) runs player pregnancies:
// PregnancyManager.PregnancyData { PartnerUUID, StartTime (game time), DurationTicks = 12000, Active }, kept in memory while online and in
// player.getPersistentData() "mcaromanticexpansion_pregnancy" across logouts. Birth = PregnancyAttemptHandler player tick when
// gameTime - StartTime >= DurationTicks: BabyItem.createItem(mother, partner) into the inventory + removePregnancyPeriod (isPregnant flips false).
// The same flip also happens on: death of either parent (onPlayerDeath / clearPartnerPregnancyIfDead / respawn guard), /pregnancy cancel and
// /pregnancy complete (op shortcut). Its CriterionTriggerRegister has no pregnancy/birth trigger and the NeoForge bus events (MarriageChangedEvent...)
// are not reachable from KubeJS. So: poll RomanticExpansionAPI.getRelationshipManager().isPregnant(player) every BABY_POLL_TICKS for online players;
// a true -> false flip counts as a birth only when (a) the player stayed online since the first true reading, (b) that reading is >= BABY_MIN_TRACK_MS
// old, (c) neither parent died in the last BABY_DEATH_GRACE_MS, (d) when PregnancyManager is reachable, the pregnancy ran its DurationTicks (minus
// BABY_END_SLACK_TICKS), so /pregnancy cancel and early resets never pay. Read-only: nothing here writes MCA, add-on or villager data.
// Fallbacks: /festivity credit <player> baby_born (core; op / reward function, one parent) and /festivity babyborn <player> (below: credits the
// player AND the online MCA spouse through the same path; for a future datapack function or FTB reward). The 48 h per-player cooldown and the
// cap stay in the Fest.score wrapper (section K). If any part is unavailable the feature logs one line and does nothing.
var f5_mcaApi = null, f5_mcaTried = false;
var f5_preg = {};      // uuid -> { since: ms of the first true reading, last: ms, name, partner: uuid string or '', start: game time or null, dur: ticks or null }
var f5_deaths = {};    // uuid -> ms of the player's last death (the add-on clears a pregnancy on death: a loss, not a birth)
function f5mca() {
  if (f5_mcaTried) return f5_mcaApi;
  f5_mcaTried = true;
  try {
    var hasMca = Platform.isLoaded('mca'), hasRe = Platform.isLoaded('mcaromanticexpansion');
    if (!hasMca || !hasRe) { console.log('[Festivity5] MCA baby detection off (mods: mca ' + hasMca + ', mcaromanticexpansion ' + hasRe + ')'); return null; }
    var API = Java.loadClass('com.xiaoshi2022.mcaromanticexpansion.api.RomanticExpansionAPI');
    var rm = API.getRelationshipManager();
    if (!rm) throw 'getRelationshipManager() returned null';
    var pm = null;
    try { pm = Java.loadClass('com.xiaoshi2022.mcaromanticexpansion.util.PregnancyManager'); } catch (x) { pm = null; console.log('[Festivity5] PregnancyManager not reachable (' + x + '): birth check uses the time rule only'); }
    f5_mcaApi = { rm: rm, pm: pm };
    var v = ''; try { v = String(API.getAPIVersion()); } catch (x) {}
    console.log('[Festivity5] MCA baby detection ON (RomanticExpansionAPI ' + v + ', poll every ' + P5.BABY_POLL_TICKS + ' ticks' + (pm ? ', duration check' : '') + ')');
  } catch (e) { f5_mcaApi = null; console.log('[Festivity5] MCA baby detection off (' + e + ')'); }
  return f5_mcaApi;
}
function f5uuid(p) { try { return String(p.uuid); } catch (x) { return ''; } }
function f5byUuid(server, id) { if (!id) return null; for (let p of F5.online(server)) if (f5uuid(p) == id) return p; return null; }
function f5babyTick(server) {
  var api = f5mca(); if (!api) return;
  var now = F5.nowMs(), seen = {};
  for (let p of F5.online(server)) {
    var id = f5uuid(p); if (!id) continue; seen[id] = true;
    var preg = false;
    try { preg = !!api.rm.isPregnant(p); } catch (e) { f5log('isPregnant failed for ' + p.username + ': ' + e); continue; }
    var prev = f5_preg[id];
    if (preg) {
      if (!prev) { prev = { since: now, last: now, name: p.username, partner: '', start: null, dur: null }; f5_preg[id] = prev; f5log('pregnancy seen: ' + p.username); }
      prev.last = now;
      if (api.pm && prev.start === null) {
        try { var d = api.pm.getPregnancyData(p.uuid); if (d) { prev.partner = String(d.getPartnerUUID()); prev.start = Number(d.getStartTime()); prev.dur = Number(d.getDurationTicks()); } }
        catch (e) { prev.start = -1; f5log('getPregnancyData failed: ' + e); }
      }
    } else if (prev) {
      delete f5_preg[id];
      f5babyEnded(server, p, prev, now);
    }
  }
  for (var k in f5_preg) if (!seen[k]) delete f5_preg[k];   // logged out: the add-on drops its memory cache at logout, so a later flip would be a reload, not a birth
}
function f5babyEnded(server, p, prev, now) {
  var why = null, me = f5uuid(p);
  if (now - prev.since < P5.BABY_MIN_TRACK_MS) why = 'tracked only ' + Math.round((now - prev.since) / 1000) + ' s';
  else if (f5_deaths[me] && now - f5_deaths[me] < P5.BABY_DEATH_GRACE_MS) why = p.username + ' died';
  else if (prev.partner && f5_deaths[prev.partner] && now - f5_deaths[prev.partner] < P5.BABY_DEATH_GRACE_MS) why = 'partner died';
  else if (prev.start !== null && prev.start >= 0 && prev.dur) { var ran = F5.gameTime(server) - prev.start; if (ran < prev.dur - P5.BABY_END_SLACK_TICKS) why = 'ended after ' + ran + ' of ' + prev.dur + ' ticks (cancelled)'; }
  if (why) { f5log('pregnancy of ' + p.username + ' ended, not a birth: ' + why); return; }
  var partner = f5byUuid(server, prev.partner);
  if (!partner) partner = f5spouse(server, p, f5mca());
  f5babyBorn(server, p, partner, 'poll');
}
function f5spouse(server, p, api) {   // married through MCA (RelationshipState MARRIED_TO_PLAYER) and the spouse is online; else null
  if (!api) return null;
  try { if (!api.rm.isMarried(p)) return null; var o = api.rm.getPartnerUUID(p); if (!o || !o.isPresent()) return null; return f5byUuid(server, String(o.get())); } catch (e) { return null; }
}
function f5babyBorn(server, p, partner, how) {   // the one credit path: both parents through Fest.score (daily cap + the 48 h cooldown in section K)
  var d1 = F5.score(server, p, 'baby_born', 1, 'a baby was born'), d2 = 0;
  if (partner && f5uuid(partner) != f5uuid(p)) d2 = F5.score(server, partner, 'baby_born', 1, 'a baby was born');
  var who = p.username + (partner ? ' and ' + partner.username : '');
  F5.logEvent(server, 'a baby was born to ' + who);
  console.log('[Festivity5] baby born (' + how + '): ' + who + ' -> ' + (Math.round(d1 * 100) / 100) + ' / ' + (Math.round(d2 * 100) / 100));
  if (d1 > 0 || d2 > 0) { F5.announce(server, 'A baby was born to ' + who + '! The whole village feels warmer.', 'light_purple'); f5cmd(server, 'playsound minecraft:block.note_block.chime master @a ~ ~ ~ 0.8 1.4'); }
}
EntityEvents.death(event => {   // remember player deaths: a pregnancy that ends within BABY_DEATH_GRACE_MS of one is a loss, not a birth (read-only)
  try { var e = event.entity; if (e && e.isPlayer()) f5_deaths[String(e.uuid)] = F5.nowMs(); } catch (x) {}
});
PlayerEvents.loggedOut(event => { try { delete f5_preg[String(event.player.uuid)]; } catch (x) {} });
ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event;
  // /festivity babyborn <player> : advancement-free function path (datapack function / FTB reward, permission 2): credits the player and the online MCA spouse.
  event.register(Commands.literal('festivity')
    .then(Commands.literal('babyborn').requires(src => src.hasPermission(2))
      .then(Commands.argument('player', Arguments.PLAYER.create(event)).executes(ctx => {
        let s = ctx.source.server, p = Arguments.PLAYER.getResult(ctx, 'player');
        f5babyBorn(s, p, f5spouse(s, p, f5mca()), 'command');
        return 1;
      }))));
});
ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event;
  event.register(Commands.literal('festivity')
    .then(Commands.literal('duel')
      .then(Commands.literal('accept').executes(ctx => { let p = ctx.source.player; if (!p) return 0; f5duelAccept(ctx.source.server, p); return 1; }))
      .then(Commands.literal('cancel').executes(ctx => { let p = ctx.source.player; if (!p) return 0; f5duelCancel(ctx.source.server, p); return 1; }))
      .then(Commands.argument('player', Arguments.PLAYER.create(event)).executes(ctx => { let p = ctx.source.player; if (!p) return 0; f5duelChallenge(ctx.source.server, p, Arguments.PLAYER.getResult(ctx, 'player')); return 1; }))));
});
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event;
  let p5 = Commands.literal('p5').requires(src => src.hasPermission(2))
    .then(Commands.literal('santa').executes(ctx => { santaFlyby(ctx.source.server, true); return 1; }))
    .then(Commands.literal('claws').executes(ctx => { let s = ctx.source.server; p2data(s).putBoolean('p2_clawsTonight', true); clawsArrive(s, false); ctx.source.sendSuccess(Text.of('[Festivity] manifestation released (silent). Watch your back.'), true); return 1; }))
    .then(Commands.literal('gingerbread').executes(ctx => { let p = ctx.source.player; if (!p) return 0; summon(ctx.source.server, 'minecraft:skeleton', p.x + 3, p.y, p.z, 'Rotten Gingerbread Man', 'fest_t3', '{HandItems:[{id:"minecraft:wooden_sword",count:1},{}]}'); return 1; }))
    .then(Commands.literal('elves').executes(ctx => { let p = ctx.source.player; if (!p) return 0; let s = ctx.source.server; for (let i = 0; i < 3; i++) summon(s, 'minecraft:stray', p.x + 4 + i, p.y, p.z, 'Sour Elf', 'fest_t1', '{CanPickUpLoot:1b,HandItems:[{id:"minecraft:stick",count:1},{}],HandDropChances:[0f,0f]}'); summon(s, 'minecraft:stray', p.x - 4, p.y, p.z, 'Sour Elf Snowballer', 'fest_t1 fest_snowballer', '{HandItems:[{id:"minecraft:snowball",count:16},{}],HandDropChances:[0f,0f]}'); ctx.source.sendSuccess(Text.of('[Festivity] 3 elves + 1 snowballer; captain/bomber roll in 2 s'), true); return 1; }))
    .then(Commands.literal('captain').executes(ctx => { let p = ctx.source.player; if (!p) return 0; let s = ctx.source.server; summon(s, 'minecraft:stray', p.x + 4, p.y, p.z, 'Sour Elf', 'fest_t1', '{HandItems:[{id:"minecraft:stick",count:1},{}]}'); s.scheduleInTicks(2, () => { for (let e of findByTag(s, 'fest_t1', { x: p.x, z: p.z }, 8)) { if (f5has(e, 'fest_captain')) continue; f5_seen[String(e.uuid)] = 1; e.addTag('fest_captain'); f5scale(s, e, P5.CAPTAIN_SCALE); f5cmd(s, 'data merge entity ' + e.uuid + ' {HandItems:[{id:"minecraft:iron_sword",count:1},{id:"chop:present_sack",count:1}]}'); break; } }); return 1; }))
    .then(Commands.literal('bomber').executes(ctx => { let p = ctx.source.player; if (!p) return 0; let s = ctx.source.server; summon(s, 'minecraft:stray', p.x + 6, p.y, p.z, 'Sour Elf Bomber', 'fest_t1 fest_bomber', '{HandItems:[{id:"' + presentItem() + '",count:1},{}]}'); for (let e of findByTag(s, 'fest_bomber', { x: p.x, z: p.z }, 10)) f5_seen[String(e.uuid)] = 1; return 1; }))
    .then(Commands.literal('hound').executes(ctx => { let p = ctx.source.player; if (!p) return 0; summon(ctx.source.server, 'minecraft:wolf', p.x + 3, p.y, p.z, 'Frost Hound', 'fest_t3 fest_hound', '{AngerTime:999999}'); f5cmd(ctx.source.server, 'give ' + p.username + ' chop:frozen_treat 3'); return 1; }))
    .then(Commands.literal('reindeer').executes(ctx => { let p = ctx.source.player; if (!p) return 0; let s = ctx.source.server; f5cmd(s, 'summon ' + fid('minecraft:horse') + ' ' + Math.floor(p.x + 3) + ' ' + Math.floor(p.y) + ' ' + Math.floor(p.z) + ' {Variant:3,Tame:1b,Tags:["fest_reindeer","fest_wildreindeer"]}'); f5cmd(s, 'give ' + p.username + ' chop:bell_necklace 1'); return 1; }))
    .then(Commands.literal('freeelf').executes(ctx => { let p = ctx.source.player; if (!p) return 0; spawnFreedElf(ctx.source.server, p.x + 2, p.y, p.z + 2, p.username); return 1; }))
    .then(Commands.literal('kit').executes(ctx => { let p = ctx.source.player; if (!p) return 0; let s = ctx.source.server; for (let it of ['chop:sour_candy 8', 'chop:rocky_snowball 8', 'chop:present_sack 1', 'chop:gingerbread_chunk 9', 'chop:rotten_cookie 2', 'chop:gingerbread_friend 1', 'chop:frozen_treat 3', 'chop:bell_necklace 1']) f5cmd(s, 'give ' + p.username + ' ' + it); return 1; }));
  event.register(Commands.literal('festivity').then(p5));
});
console.log('[Festivity] Phase 5 draft v15 loaded (buddy friend via pets v10 + gingerbread_part fallback, rare stray buddy at gingerbread houses, gingerbread house raid, lantern variant; jar carry: CarryTarget/CarryArrived when mod on, carry ' + P5.CARRY_SECONDS + ' s x3 timeout; mca baby poll every ' + P5.BABY_POLL_TICKS + ' ticks; v11 quality pass: dropItem numbers, simple hats hat, naughty duel, dawn sleigh gift, baby_born, log ' + P5.LOG + '; mod bridge ' + (F5_MOD ? 'ON: festivity:* entities' : 'off: vanilla bases') + '): manifestation leaps every ' + P5.CLAWS_LEAP_EVERY + ' ticks, box ' + P5.BOX_MIN + '-' + P5.BOX_MAX + ', santa every ' + P5.SANTA_EVERY_NIGHTS + ' nights, reindeer ' + P5.REINDEER_CHANCE);
// v11b hotfix (19:35 UTC): report the Simple Hats check at server load instead of on the first elf death, so Build sees the ON/off line.
ServerEvents.loaded(event => { try { f5simpleHat(); } catch (x) { console.log('[Festivity5] Simple Hats check failed: ' + x); } });
