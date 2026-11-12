// chop_festivity_pets.js  v0.1.2 (TEST)  - synergy thread, 2026-11-05 (Josh YES: "if a villager dies vibes are bad"; v0.1.1 boss D44: snowmen; v0.1.2 D47: tamed non-animals)
// priority: 0   (loads after festivity.js, priority 50)
// Festivity scores a villager / MCA villager / colonist death only when a player is the killer. If the killer is a
// tamed animal or mount (wolf, snow leopard, polar bear...), this blames its OWNER with Festivity 'kill_villager' (-5),
// through Fest.score (newcomer shield, caps and griefer brake apply). Owner must be online. Fire deaths stay with
// chop_festivity_fire.js; direct player kills stay with festivity.js (no double scoring).
// KubeJS 2101: IIFE, early return, no declarations inside nested blocks.
(function () {
  function ownerOf(server, a) {
    let o = null;
    try { o = a.getOwner(); } catch (e) {}
    if (o && o.isPlayer && o.isPlayer()) return o;
    let id = null;
    try { id = a.getOwnerUUID(); } catch (e) {}
    if (!id) return null;
    for (let q of server.players) if (String(q.uuid) == String(id)) return q;   // server.getPlayer aborts in 2101
    return null;
  }

  // v0.1.1 (boss D44): a player killing a Snowmancy snowman = Festivity 'kill_festive' (festivity.js only counts
  // snuffles / reindeer / golem ids; anything with those words is skipped here so it is never scored twice).
  EntityEvents.death(event => {
    let e = event.entity, t = String(e.type);
    if (!t.startsWith('snowmancy:') || /golem|reindeer|snuffles/.test(t)) return;
    let src = event.source, p = src ? src.player : null;
    if (!p || !p.isPlayer() || typeof Fest == 'undefined') return;
    try { Fest.score(p.server, p, 'kill_festive', 1, 'killed a snowman'); } catch (x) { console.warn('[chop pets] score failed: ' + x); }
  });

  // v0.1.2 (boss D47): festivity.js scores pet kills only for animals. Tamed mobs that are not animals (a RideableRavagers
  // ravager, anything with an owner) now cost Festivity 'kill_pet' when a player kills them, the same as a pet animal.
  function isTamed(server, e) {
    if (ownerOf(server, e)) return true;
    try { if (e.getOwnerUUID && e.getOwnerUUID()) return true; } catch (x) {}
    let tag = null;
    try { tag = e.nbt; } catch (x) {}
    if (!tag) return false;
    try { if (tag.getBoolean('Tame') || tag.getBoolean('Tamed') || tag.getBoolean('tamed') || tag.getBoolean('IsTamed')) return true; } catch (x) {}
    try { if (tag.hasUUID('Owner') || tag.hasUUID('OwnerUUID')) return true; } catch (x) {}
    try { if (String(tag.getString('Owner')).length > 0 || String(tag.getString('OwnerUUID')).length > 0) return true; } catch (x) {}
    return false;
  }
  EntityEvents.death(event => {
    let e = event.entity, t = String(e.type);
    if (e.isPlayer() || t.startsWith('minecolonies:') || t.startsWith('mca:') || t.startsWith('snowmancy:') || t == 'festivity:snowman_companion' || t == 'minecraft:villager') return;   // snowmen: kill_festive above
    try { if (e.isAnimal && e.isAnimal()) return; } catch (x) {}          // animals: festivity.js already scores them
    try { if (e.tags && e.tags.contains('fest_minion')) return; } catch (x) {}
    let src = event.source, p = src ? src.player : null;
    if (!p || !p.isPlayer() || typeof Fest == 'undefined') return;
    if (!isTamed(e.server, e)) return;
    try { Fest.score(p.server, p, 'kill_pet', 1, 'killed a pet'); } catch (x) { console.warn('[chop pets] score failed: ' + x); }
  });

  EntityEvents.death(event => {
    let e = event.entity, t = String(e.type);
    if (!(t.startsWith('minecolonies:') || t.startsWith('mca:') || t == 'minecraft:villager')) return;
    let src = event.source;
    if (!src || src.player) return;                    // player kills: festivity.js already scores them
    let a = null;
    try { a = src.actual; } catch (x) {}
    if (!a || a.isPlayer()) return;
    let p = ownerOf(e.server, a);
    if (!p || typeof Fest == 'undefined') return;
    try { Fest.score(e.server, p, 'kill_villager', 1, 'your pet killed a villager'); } catch (x) { console.warn('[chop pets] score failed: ' + x); }
  });
})();
