// chop_starter_kit.js v0.4.1 (Rune, 2026-11-22) - server script.
// v0.4.1 (Owl log scan 11-22 A6): runCommandSilent returns undefined in this KubeJS build, so 'rc > 0' was never true, the flag
//         chopBookbagV2 was never set and the give re-ran (and logged a warning) on every join. Success is now read from
//         Festivity's own marker (persistentData.PlayerPersisted.festivity_kit_bookbag, set by BookbagKit.giveOnce when it gives
//         the bag OR finds one already carried). A player who already has the marker is flagged without running the command.
//         A throw or a missing marker still retries at the next join.
// v0.4.0 (Tinker, 2026-11-20).
// v0.4.0: Bookbag v2 (boss 18:22Z). A new player gets ONE pre-filled Bookbag (Festivity: /festivity bookbag give <player>,
//         holds every guide book: Handbook, Festive Book, Field Guide, quest book, mod guides, MCA lore books) and nothing loose.
//         Existing players get one pre-filled bag on their next join, once (flag chopBookbagV2). Nothing is taken out of
//         anyone's inventory: players who already hold loose books keep them. The old per-book flags are set when the bag is
//         given so the loose-book code below can never hand out duplicates later. If the Festivity command node festivity/bookbag/give
//         does not exist (jar without Bookbag v2) the old loose-book behaviour runs unchanged.
// v0.3.1: boss YES (11-20): Field Guide (hearthkin:field_guide) added to the kit, own flag, given once when registered.
// v0.3.0: boss D323 (11-16): spawn kit = Handbook + Festive Book (Field Guide later). The Handbook part is unchanged
//         (same 'chopHandbook' flag, so nobody gets a second copy). Each extra book has its OWN flag and is given
//         once, only when its item is registered. Until Toybox ships the Festive Book item this does nothing.
//         FESTIVE_BOOK id is a placeholder [Unverified]: Toybox confirms the real id. Players who joined before the
//         book shipped get it once on their next login (same clean join: no chat line, no title).
// v0.2.0 (Josh 11-09 live test): spawn with ONLY the pack guide book. The sweater, hat, sled, sleeping bag,
//         cookies, torches and the written "Festivity Guide" are gone; that guide's text now lives in the
//         Handbook's "Getting Started" pages. The colony founder's satchel is switched off in
//         colonyautopilot-server.toml (spawnStarterKit = false), so no Town Hall / build tool / tome either.
// Gives Chop's Christmas Handbook (GuideME guide chopxmas:handbook) once per player (flag 'chopHandbook').
// CLEAN JOIN rule: no chat line, no title; the book just appears a few seconds after joining.
(function () {
  const BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
  const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation');
  const HANDBOOK = 'guideme:guide[guideme:guide_id="chopxmas:handbook"]';
  // [flag, item id that must be registered, give argument]. Field Guide added v0.3.1.
  const EXTRA_BOOKS = [
    ['chopKitFestiveBook', 'festivity:festive_book', 'festivity:festive_book'],
    ['chopBookbag', 'festivity:bookbag', 'festivity:bookbag'],  // Rune 19aaba3 (11-18): Bookbag once, only when registered
    ['chopKitFieldGuide', 'hearthkin:field_guide', 'hearthkin:field_guide']   // boss YES 11-20: Field Guide once, only when Hearthkin is installed
  ];
  const registered = id => BuiltInRegistries.ITEM.containsKey(ResourceLocation.parse(id));
  const KIT_FLAGS = ['chopBookbagV2', 'chopHandbook', 'chopKitFestiveBook', 'chopBookbag', 'chopKitFieldGuide'];
  function festKitGiven(pl) {   // v0.4.1: Festivity BookbagKit.GIVEN marker
    try { return pl.persistentData.getCompound('PlayerPersisted').getBoolean('festivity_kit_bookbag'); } catch (e) { return false; }
  }
  PlayerEvents.loggedIn(event => {
    let p = event.player;
    let server = p.server, name = String(p.username);
    let gives = [];
    // Bookbag v2: one pre-filled bag, once per player. Only when the Festivity command exists (it ships with the Bookbag v2
    // jar; the older Bookbag item alone is not enough). Flags are set only AFTER the command ran and the player is still online,
    // so a player who leaves or a failed give is simply retried at the next join.
    let giveNode = null;
    try { giveNode = server.getCommands().getDispatcher().findNode(['festivity', 'bookbag', 'give']); } catch (e) { giveNode = null; }
    if (!p.persistentData.getBoolean('chopBookbagV2') && registered('festivity:bookbag') && giveNode != null && festKitGiven(p)) {
      KIT_FLAGS.forEach(f => p.persistentData.putBoolean(f, true));   // v0.4.1: Festivity already gave (or saw) the bag
      return;
    }
    if (!p.persistentData.getBoolean('chopBookbagV2') && registered('festivity:bookbag') && giveNode != null) {
      server.scheduleInTicks(60, () => {
        let pl = server.getPlayerList().getPlayerByName(name);
        if (pl != null && pl.persistentData.getBoolean('chopBookbagV2')) return; // a relog queued a second callback
        if (pl == null) { console.info('[chop kit] ' + name + ' left before the Bookbag; will retry at next join'); return; }
        let threw = false;
        try { server.runCommandSilent('festivity bookbag give ' + name); } catch (e) { threw = true; console.warn('[chop kit] bookbag give failed: ' + e); }
        if (!threw && festKitGiven(pl)) {   // v0.4.1: Festivity's marker, not the command's return value
          KIT_FLAGS.forEach(f => pl.persistentData.putBoolean(f, true));
          console.info('[chop kit] ' + name + ' has the pre-filled Bookbag');
        } else if (!threw) console.warn('[chop kit] bookbag give ran but the Festivity marker is not set for ' + name + '; will retry at next join');
      });
      return;
    }
    if (!p.persistentData.getBoolean('chopHandbook') && registered('guideme:guide')) {
      p.persistentData.putBoolean('chopHandbook', true);
      gives.push(['Handbook', HANDBOOK]);
    }
    EXTRA_BOOKS.forEach(b => {
      if (p.persistentData.getBoolean(b[0]) || !registered(b[1])) return;
      p.persistentData.putBoolean(b[0], true);
      gives.push([b[1], b[2]]);
    });
    if (gives.length == 0) return;
    server.scheduleInTicks(60, () => {
      gives.forEach(g => {
        try { server.runCommandSilent('give ' + name + ' ' + g[1] + ' 1'); console.info('[chop kit] ' + name + ' got ' + g[0]); }
        catch (e) { console.warn('[chop kit] ' + g[0] + ' failed: ' + e); }
      });
    });
  });
})();
