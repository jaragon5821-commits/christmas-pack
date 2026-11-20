// chop_starter_kit.js v0.3.1 (Lorekeeper, 2026-11-20) - server script.
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
  PlayerEvents.loggedIn(event => {
    let p = event.player;
    let server = p.server, name = String(p.username);
    let gives = [];
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
