// priority: 26
// FESTIVITY PETS (DRAFT v5, 2026-11-07) - pet Coal Gnome (Josh 17:00 UTC 11-06, card "Build it as proposed" 17:11 UTC).
// Needs festivity.js 0.2.10+, festivity_phase2.js (summon, surfaceY, dropItem, findByTag), Redomesticate (TEST) and the taming JSON
// kubejs/data/chop/redomesticate/taming/clinker_gnome.json + startup item chop:festive_heart.
// 1) CLINKER GNOMES: burnt-out Coal Gnomes (NoAI, grey, one of PET.POSES frozen poses via tags fest_pose1..N). Found: a dusk roll near a
//    random player (PET.CLINKER_CHANCE), Phase 4 leaves one at a broken Cursed Star (v11), debug /festivity pet clinker.
// 2) TAMING: right-click a Clinker with a Festive Heart. Redomesticate's data-driven taming does the owner/follow/stay/wander part
//    (any Mob, required_data Tags fest_clinker). This script then "relights" it: AI on, invulnerable off, 20 HP, name Coal Gnome, tag fest_pet.
// 3) WILD RANGED: wild Coal Gnomes (fest_minion endermites) 4-10 blocks from a player sometimes spit a coal chip (llama_spit, 1 dmg).
// 4) DROPS (v2, Josh 17:40 UTC): wild Coal Gnomes drop PET.DROP_MIN-DROP_MAX chop:coal_chip on death; 9 chips -> 1 coal (shaped 3x3).
//    Pets and Clinkers never drop chips.
// 5) v3: Redomesticate did not tame in round 1 (heart kept, RedomesticateTamed:0b). Now: if the mod has not tamed it 2 ticks later, the script
//    tames it itself through the mod's own API (ITameableEntity redomesticate$setTame/OwnerUUID + UniversalAIManager.applyPetAI),
//    consumes the heart in survival, then relights. /festivity pet tamedefs lists what the redomesticate:taming registry loaded.
//    Blaze Heart (Josh 20:05): same item id chop:festive_heart, recipe magma cream corners, blaze powder top/bottom, candy sides.
// 6) v4 (Josh notes 11-06): pet Coal Gnomes spit coal chips at hostile mobs near their owner; Clinkers also turn up in the NETHER
//    (ground-checked spot 30-60 blocks from a player there), preferring chunks that hold a structure; no pet cap.
// Villager safety: endermites only; no villagers, colonists or MCA data touched. Pets are never fest_minion (no sweeps, no scoring).
const PET = {
  CLINKER_CHANCE: 0.15, CLINKER_MIN: 30, CLINKER_MAX: 60, POSES: 4,
  CHIP_MIN: 4, CHIP_MAX: 10, CHIP_CHANCE: 0.10, CHIP_SPEED: 0.9,     // per gnome per second while in range
  PET_HP: 20, DROP_MIN: 1, DROP_MAX: 2, PET_CHIP_RANGE: 8, PET_CHIP_CHANCE: 0.5, NETHER_CLINKER_CHANCE: 0.15,
  CANDY: ['snowyspirit:candy_cane', 'seasonsgreetings:candy_cane', 'festive_delight:candy_cane', 'minecraft:cookie'],
  LOG: true, DEBUG_CMDS: false
};
const PT = Fest;
function ptcmd(server, s) { if (PET.DEBUG_CMDS) { try { return server.runCommand(s); } catch (e) { console.warn('[FestivityPets] cmd fallback: ' + e); } } return PT.cmd(server, s); }
function ptlog(s) { if (PET.LOG) console.log('[FestivityPets] ' + s); }
function ptrnd(a, b) { return a + Math.random() * (b - a); }
function ptfirst(ids) { for (let id of ids) { try { if (Item.exists(id)) return id; } catch (e) {} } return ids[ids.length - 1]; }
function ptplayers(server) { let out = []; for (let p of PT.online(server)) { try { if (String(p.level.dimension) == 'minecraft:overworld') out.push(p); } catch (e) { out.push(p); } } return out; }

// ---------- recipe: Blaze Heart = 4 magma cream corners, 2 blaze powder, 2 candy canes around a Ribbon Token (Nether gate) ----------
ServerEvents.recipes(event => {
  let candy = ptfirst(PET.CANDY);
  event.shaped('chop:festive_heart', ['MBM', 'SRS', 'MBM'], { M: 'minecraft:magma_cream', B: 'minecraft:blaze_powder', S: candy, R: 'chop:ribbon_token' }).id('chop:festive_heart');
  event.shaped('minecraft:coal', ['XXX', 'XXX', 'XXX'], { X: 'chop:coal_chip' }).id('chop:coal_from_chips');
  console.log('[FestivityPets] blaze heart recipe uses ' + candy + '; 9 coal chips -> coal');
});

// ---------- Clinker Gnomes ----------
function spawnClinker(server, x, y, z) {
  let pose = 1 + Math.floor(Math.random() * PET.POSES), yaw = Math.floor(Math.random() * 360);
  ptcmd(server, 'summon ' + fid('minecraft:endermite') + ' ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z) + ' {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Lifetime:0,Rotation:[' + yaw + 'f,0f],Tags:["fest_clinker","fest_pose' + pose + '"]}');
  ptlog('clinker gnome (pose ' + pose + ') at ' + Math.floor(x) + ' ' + Math.floor(y) + ' ' + Math.floor(z));
}
function ptGroundNear(level, x, z, yc) {   // first air-over-solid column near yc (works in the Nether; surfaceY does not)
  for (let dy = 0; dy <= 12; dy++) for (let sgn of [1, -1]) { let y = Math.floor(yc) + dy * sgn; try { let a = String(level.getBlock(x, y, z).id), b = String(level.getBlock(x, y - 1, z).id); if (a == 'minecraft:air' && b != 'minecraft:air' && b != 'minecraft:lava' && !b.includes('fire')) return y; } catch (e) {} }
  return -1;
}
function ptClinkerSpot(server, p) {   // 8 tries, prefer a chunk with a structure (dungeon, outpost...)
  let best = null;
  for (let i = 0; i < 8; i++) {
    let ang = Math.random() * Math.PI * 2, r = ptrnd(PET.CLINKER_MIN, PET.CLINKER_MAX), x = Math.floor(p.x + Math.cos(ang) * r), z = Math.floor(p.z + Math.sin(ang) * r);
    let nether = String(p.level.dimension) == 'minecraft:the_nether';
    let y = nether ? ptGroundNear(p.level, x, z, p.y) : surfaceY(p.level, x, z); if (y < 0) continue;
    let hasStruct = false; try { hasStruct = e4chunkHasStructure(p.level, x, z); } catch (e) {}
    if (hasStruct) return { x: x, y: y, z: z, level: p.level, struct: true };
    if (!best) best = { x: x, y: y, z: z, level: p.level, struct: false };
  }
  return best;
}
let pt_lastClinkerDay = -1;
function clinkerRoll(server) {
  let ps = ptplayers(server); if (!ps.length) return;
  if (Math.random() > PET.CLINKER_CHANCE) { ptlog('no clinker tonight'); return; }
  let p = ps[Math.floor(Math.random() * ps.length)], s = ptClinkerSpot(server, p); if (!s) return;
  spawnClinker(server, s.x, s.y, s.z); ptlog('overworld clinker' + (s.struct ? ' near a structure' : ''));
}
function netherClinkerRoll(server) {
  let ps = []; for (let p of PT.online(server)) { try { if (String(p.level.dimension) == 'minecraft:the_nether') ps.push(p); } catch (e) {} }
  if (!ps.length || Math.random() > PET.NETHER_CLINKER_CHANCE) return;
  let p = ps[Math.floor(Math.random() * ps.length)], s = ptClinkerSpot(server, p); if (!s) return;
  let pose = 1 + Math.floor(Math.random() * PET.POSES), yaw = Math.floor(Math.random() * 360);
  ptcmd(server, 'execute in minecraft:the_nether run summon ' + fid('minecraft:endermite') + ' ' + s.x + ' ' + s.y + ' ' + s.z + ' {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Lifetime:0,Rotation:[' + yaw + 'f,0f],Tags:["fest_clinker","fest_pose' + pose + '"]}');
  ptlog('nether clinker (pose ' + pose + ') at ' + s.x + ' ' + s.y + ' ' + s.z + (s.struct ? ' near a structure' : ''));
}

// ---------- taming: Redomesticate tames, we relight ----------
var pt_tameApi = null, pt_tameApiTried = false;
function ptIsTamed(e) {
  if (!pt_tameApiTried) { pt_tameApiTried = true; try { pt_tameApi = Java.loadClass('com.evandev.redomesticate.util.TameableUtils'); ptlog('Redomesticate TameableUtils reachable'); } catch (x) { ptlog('Redomesticate TameableUtils not reachable (' + x + '); assuming the heart tamed it'); } }
  if (!pt_tameApi) return true;
  try { return !!pt_tameApi.isTamed(e); } catch (x) { return true; }
}
function relight(server, e, owner) {
  try {
    let tags = []; try { for (let t of e.tags) tags.push(String(t)); } catch (x) {}
    for (let t of tags) if (t == 'fest_clinker' || t.indexOf('fest_pose') == 0) e.removeTag(t);
    e.addTag('fest_pet');
    try { e.setNoAi(false); } catch (x) { ptcmd(server, 'data merge entity ' + e.uuid + ' {NoAI:0b}'); }
    try { e.setInvulnerable(false); } catch (x) { ptcmd(server, 'data merge entity ' + e.uuid + ' {Invulnerable:0b}'); }
    ptcmd(server, 'data merge entity ' + e.uuid + ' {Silent:0b}');
    ptcmd(server, 'attribute ' + e.uuid + ' minecraft:generic.max_health base set ' + PET.PET_HP);
    ptcmd(server, 'effect give ' + e.uuid + ' minecraft:instant_health 1 5 true');
    let pos = e.x.toFixed(1) + ' ' + (e.y + 0.3).toFixed(1) + ' ' + e.z.toFixed(1);
    ptcmd(server, 'particle minecraft:flame ' + pos + ' 0.4 0.3 0.4 0.05 25');
    ptcmd(server, 'particle minecraft:heart ' + pos + ' 0.5 0.5 0.5 0 5');
    ptcmd(server, 'playsound minecraft:block.fire.ambient master @a ' + pos + ' 1 0.8');
    ptcmd(server, 'playsound minecraft:block.campfire.crackle master @a ' + pos + ' 1 1.2');
    if (owner) ptcmd(server, 'tellraw ' + owner + ' ' + PT.jsonText('The Clinker Gnome crackles back to life. Its centre glows for you now.', 'gold'));
    PT.logEvent(server, (owner || 'someone') + ' relit a Clinker Gnome');
    ptlog('relit clinker -> pet coal gnome for ' + owner);
  } catch (x) { console.warn('[FestivityPets] relight: ' + x); }
}
var pt_aiMgr = null, pt_aiTried = false;
function ptForceTame(server, e, p) {
  // Fallback when Redomesticate's own handler did not match (registry/JSON issue): use its API directly.
  let ok = false;
  try { e.redomesticate$setTame(true); e.redomesticate$setTameOwnerUUID(p.uuid); ok = true; } catch (x) { ptlog('setTame API failed: ' + x); }
  try { e.redomesticate$setCommand(0); } catch (x) {}
  try { e.setTarget(null); e.setPersistenceRequired(); } catch (x) {}
  if (!pt_aiTried) { pt_aiTried = true; try { pt_aiMgr = Java.loadClass('com.evandev.redomesticate.content.entity.ai.UniversalAIManager'); } catch (x) { ptlog('UniversalAIManager not reachable: ' + x); } }
  if (pt_aiMgr) { try { pt_aiMgr.applyPetAI(e); } catch (x) { ptlog('applyPetAI failed: ' + x); } }
  ptlog('force-tamed clinker via API, ok=' + ok);
  return ok;
}
ItemEvents.entityInteracted(event => {
  try {
    let e = event.target, p = event.player; if (!e || !p || !e.tags || !e.tags.contains('fest_clinker')) return;
    if (String(event.item.id) != 'chop:festive_heart') return;
    let server = p.server, name = p.username, hand = event.hand;
    server.scheduleInTicks(2, () => {
      try {
        if (!e.isAlive() || !e.tags.contains('fest_clinker')) return;
        if (ptIsTamed(e)) { relight(server, e, name); return; }
        ptlog('heart used but Redomesticate did not tame it; forcing via API');
        if (!ptForceTame(server, e, p)) return;
        try { if (!p.isCreative()) { let st = p.getItemInHand(hand); if (String(st.id) == 'chop:festive_heart') st.shrink(1); } } catch (x) {}
        relight(server, e, name);
      } catch (x) { console.warn('[FestivityPets] heart: ' + x); }
    });
  } catch (x) {}
});

// ---------- wild Coal Gnome ranged: a chipped-off coal bit ----------
function coalChip(server, g, t) {
  let dx = t.x - g.x, dy = (t.y + 1) - (g.y + 0.3), dz = t.z - g.z, h = Math.sqrt(dx * dx + dy * dy + dz * dz); if (h < 0.5) return;
  let s = PET.CHIP_SPEED, mx = dx / h * s, my = dy / h * s + 0.12, mz = dz / h * s;
  ptcmd(server, 'summon minecraft:llama_spit ' + g.x.toFixed(2) + ' ' + (g.y + 0.3).toFixed(2) + ' ' + g.z.toFixed(2) + ' {Motion:[' + mx.toFixed(3) + 'd,' + my.toFixed(3) + 'd,' + mz.toFixed(3) + 'd],Tags:["fest_coalchip"]}');
  ptcmd(server, 'playsound minecraft:block.stone.hit master @a ' + Math.floor(g.x) + ' ' + Math.floor(g.y) + ' ' + Math.floor(g.z) + ' 1 0.6');
}
function chipTick(server) {
  for (let p of ptplayers(server)) {
    let r = PET.CHIP_MAX, list;
    try { list = p.level.getEntitiesWithin(AABB.of(p.x - r, p.y - 4, p.z - r, p.x + r, p.y + 4, p.z + r)); } catch (x) { continue; }
    for (let e of list) {
      try {
        if (!f5isType(e, 'minecraft:endermite') || !e.tags || !e.tags.contains('fest_minion') || e.tags.contains('fest_pet') || e.tags.contains('fest_clinker')) continue;
        let dx = e.x - p.x, dz = e.z - p.z, h = Math.sqrt(dx * dx + dz * dz);
        if (h < PET.CHIP_MIN || h > PET.CHIP_MAX || Math.random() > PET.CHIP_CHANCE) continue;
        coalChip(server, e, p);
      } catch (x) {}
    }
  }
}

// ---------- drops: wild Coal Gnomes leave coal chips ----------
function ptIsWildGnome(e) {
  try { return f5isType(e, 'minecraft:endermite') && e.tags && e.tags.contains('fest_minion') && !e.tags.contains('fest_pet') && !e.tags.contains('fest_clinker'); } catch (x) { return false; }
}
EntityEvents.death(event => {
  try {
    let e = event.entity; if (!ptIsWildGnome(e)) return;
    let n = PET.DROP_MIN + Math.floor(Math.random() * (PET.DROP_MAX - PET.DROP_MIN + 1));
    dropItem(e.server, e.x.toFixed(1), e.y.toFixed(1), e.z.toFixed(1), 'chop:coal_chip', n);
    ptlog('coal gnome died -> ' + n + ' coal chip(s)');
  } catch (x) { console.warn('[FestivityPets] death drop: ' + x); }
});

// ---------- pet Coal Gnomes guard their owner: spit coal chips at hostile mobs ----------
function petChipTick(server) {
  for (let g of findByTag(server, 'fest_pet', null)) {
    try {
      if (!f5isType(g, 'minecraft:endermite') || Math.random() > PET.PET_CHIP_CHANCE) continue;
      let r = PET.PET_CHIP_RANGE, list = g.level.getEntitiesWithin(AABB.of(g.x - r, g.y - 3, g.z - r, g.x + r, g.y + 3, g.z + r)), best = null, bd = 1e9;
      for (let e of list) {
        try {
          if (!e.isAlive() || e.isPlayer() || (e.tags && (e.tags.contains('fest_pet') || e.tags.contains('fest_clinker') || e.tags.contains('fest_elf')))) continue;
          let mon = false; try { mon = e.isMonster(); } catch (x) { mon = !!(e.tags && e.tags.contains('fest_minion')); }
          if (!mon) continue;
          let dx = e.x - g.x, dz = e.z - g.z, d = dx * dx + dz * dz; if (d < bd && d > 2) { bd = d; best = e; }
        } catch (x) {}
      }
      if (best) coalChip(server, g, best);
    } catch (x) {}
  }
}

ServerEvents.tick(event => {
  let server = event.server;
  if (server.tickCount % 20 != 0 || PT.onlineCount(server) == 0) return;
  chipTick(server); petChipTick(server);
  if (server.tickCount % 100 != 0) return;
  let t = PT.dayTime(server) % 24000, day = PT.dayCount(server);
  if (t >= 13000 && t < 13600 && day != pt_lastClinkerDay && !PT.inGrace(server)) { pt_lastClinkerDay = day; clinkerRoll(server); netherClinkerRoll(server); }
});

// ---------- debug: /festivity pet clinker | heart | chip | chips | tamedefs | info ----------
ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event;
  let root = Commands.literal('pet').requires(src => src.hasPermission(2))
    .then(Commands.literal('clinker').executes(ctx => { let p = ctx.source.player; if (!p) return 0; spawnClinker(ctx.source.server, p.x + ptrnd(-3, 3), p.y, p.z + ptrnd(-3, 3)); ctx.source.sendSuccess(Text.of('[Festivity] Clinker Gnome placed'), true); return 1; }))
    .then(Commands.literal('heart').executes(ctx => { let p = ctx.source.player; if (!p) return 0; ptcmd(ctx.source.server, 'give ' + p.username + ' chop:festive_heart 1'); return 1; }))
    .then(Commands.literal('chip').executes(ctx => { let p = ctx.source.player; if (!p) return 0; let list = findByTag(ctx.source.server, 'fest_minion', { x: p.x, z: p.z }, 16), n = 0; for (let e of list) if (f5isType(e, 'minecraft:endermite') && !e.tags.contains('fest_pet')) { coalChip(ctx.source.server, e, p); n++; } ctx.source.sendSuccess(Text.of('[Festivity] ' + n + ' coal gnome(s) spat'), true); return 1; }))
    .then(Commands.literal('chips').executes(ctx => { let p = ctx.source.player; if (!p) return 0; ptcmd(ctx.source.server, 'give ' + p.username + ' chop:coal_chip 9'); return 1; }))
    .then(Commands.literal('netherclinker').executes(ctx => { let p = ctx.source.player; if (!p) return 0; let s = ctx.source.server, sp = ptClinkerSpot(s, p); if (!sp) { ctx.source.sendSuccess(Text.of('[Festivity] no ground found'), true); return 0; } ptcmd(s, 'execute in ' + String(p.level.dimension) + ' run summon ' + fid('minecraft:endermite') + ' ' + sp.x + ' ' + sp.y + ' ' + sp.z + ' {NoAI:1b,Silent:1b,PersistenceRequired:1b,Invulnerable:1b,Lifetime:0,Tags:["fest_clinker","fest_pose2"]}'); ctx.source.sendSuccess(Text.of('[Festivity] clinker at ' + sp.x + ' ' + sp.y + ' ' + sp.z + (sp.struct ? ' (structure chunk)' : '')), true); return 1; }))
    .then(Commands.literal('tamedefs').executes(ctx => { let s = ctx.source.server, out = 'none'; try { let K = Java.loadClass('com.evandev.redomesticate.api.taming.TamingDefinition').REGISTRY_KEY; let keys = []; for (let k of s.registryAccess().registryOrThrow(K).keySet()) keys.push(String(k)); out = keys.length + ': ' + keys.join(', '); } catch (x) { out = 'error ' + x; } ctx.source.sendSuccess(Text.of('[Festivity] taming defs ' + out), true); ptlog('taming defs ' + out); return 1; }))
    .then(Commands.literal('info').executes(ctx => { let s = ctx.source.server, c = findByTag(s, 'fest_clinker', null).length, q = findByTag(s, 'fest_pet', null).length; ctx.source.sendSuccess(Text.of('[Festivity] clinkers ' + c + ', pet coal gnomes ' + q), true); return 1; }));
  event.register(Commands.literal('festivity').then(root));
});

console.log('[Festivity] Pets draft v7 loaded (mod bridge via fid/f5isType): clinker chance ' + PET.CLINKER_CHANCE + ', poses ' + PET.POSES + ', coal chip ' + PET.CHIP_CHANCE + '/s at ' + PET.CHIP_MIN + '-' + PET.CHIP_MAX + ', drops ' + PET.DROP_MIN + '-' + PET.DROP_MAX + ' chips');
