// chop_starter_kit.js v0.3.0 (Rune, 2026-11-18) - server script.
// v0.3.0 (work queue: bookbag in the first-join kit; id festivity:bookbag from Toybox 11-18, not registered yet): also gives
//         one Bookbag once per player (own flag 'chopBookbag'), only when the item exists. Until the build with it
//         installs this does nothing; players who joined earlier get the bag on their next login after it ships.
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
  const BOOKBAG = 'festivity:bookbag';
  function hasItem(id) { try { return BuiltInRegistries.ITEM.containsKey(ResourceLocation.parse(id)); } catch (e) { return false; } }
  PlayerEvents.loggedIn(event => {
    let p = event.player;
    if (!p.persistentData.getBoolean('chopBookbag') && hasItem(BOOKBAG)) {   // v0.3.0
      p.persistentData.putBoolean('chopBookbag', true);
      let bs = p.server, bn = String(p.username);
      bs.scheduleInTicks(70, () => {
        try { bs.runCommandSilent('give ' + bn + ' ' + BOOKBAG + ' 1'); console.info('[chop kit] ' + bn + ' got the Bookbag'); }
        catch (e) { console.warn('[chop kit] bookbag failed: ' + e); }
      });
    }
    if (p.persistentData.getBoolean('chopHandbook')) return;
    if (!BuiltInRegistries.ITEM.containsKey(ResourceLocation.parse('guideme:guide'))) return;
    p.persistentData.putBoolean('chopHandbook', true);
    let server = p.server, name = String(p.username);
    server.scheduleInTicks(60, () => {
      try { server.runCommandSilent('give ' + name + ' ' + HANDBOOK + ' 1'); console.info('[chop kit] ' + name + ' got the Handbook'); }
      catch (e) { console.warn('[chop kit] handbook failed: ' + e); }
    });
  });
})();
