// chop_keys_atlas.js v0.1.0 (Scripts thread, 2026-11-08) - client script. Boss card D102 (keybind tutorial).
// Receives 'chop_keys' from /chopkeys (the "Show these keys in Keybind Atlas" links in Chop's Christmas Handbook)
// and opens Keybind Atlas 2.3.0 with its mod filter set to just those mods. When Atlas closes, the player's
// previous filter is put back, so their normal Atlas view is not changed.
// Uses Atlas' public static API (checked in the 2.3.0 jar): KeybindAtlasClientConfig.disabledMods()/setDisabledMods(List),
// KeyboardBindingCache.resolveSourceName(KeyMapping), ModDisplayNameLookup.findDisplayName(modId), new KeyboardScreen().
// Note: Atlas' filter list only holds mods that have at least one BOUND key. Unbound keys live in Atlas' Edit > Unassigned list.
// If Atlas is missing, opens the normal Controls screen instead.
(function () {
  let Atlas = null;
  try {
    Atlas = {
      Cfg: Java.loadClass('com.example.keybindatlas.KeybindAtlasClientConfig'),
      Cache: Java.loadClass('com.example.keybindatlas.layout.KeyboardBindingCache'),
      Names: Java.loadClass('com.example.keybindatlas.ModDisplayNameLookup'),
      Screen: Java.loadClass('com.example.keybindatlas.render.KeyboardScreen')
    };
  } catch (e) { console.warn('[chop keys] Keybind Atlas classes not found, will use Controls: ' + e); Atlas = null; }
  const ArrayList = Java.loadClass('java.util.ArrayList');
  let savedFilter = null, atlasWasOpen = false;

  function filterFor(mods) {
    let wantedNames = {};
    mods.forEach(id => {
      try { let n = Atlas.Names.findDisplayName(id); if (n.isPresent()) wantedNames[String(n.get())] = true; } catch (e) {}
    });
    let all = {}, wanted = {};
    Client.options.keyMappings.forEach(m => {
      let src = null;
      try { src = String(Atlas.Cache.resolveSourceName(m)); } catch (e) { return; }
      if (!src) return;
      all[src] = true;
      let name = String(m.getName()).toLowerCase();
      if (wantedNames[src] || mods.some(id => name.indexOf(id) >= 0)) wanted[src] = true;
    });
    let disabled = new ArrayList();
    Object.keys(all).forEach(s => { if (!wanted[s]) disabled.add(s); });
    return { disabled: disabled, wantedCount: Object.keys(wanted).length };
  }

  function open(modsCsv) {
    let mods = modsCsv.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
    if (!Atlas) {
      let KeyBindsScreen = Java.loadClass('net.minecraft.client.gui.screens.options.controls.KeyBindsScreen');
      Client.setScreen(new KeyBindsScreen(null, Client.options));
      return;
    }
    if (mods.length > 0) {
      let f = filterFor(mods);
      if (f.wantedCount > 0) {
        if (savedFilter == null) savedFilter = new ArrayList(Atlas.Cfg.disabledMods());
        Atlas.Cfg.setDisabledMods(f.disabled);
      }
      console.info('[chop keys] Atlas filter for ' + mods.join(',') + ': showing ' + f.wantedCount + ' source(s)');
    }
    Client.setScreen(new Atlas.Screen());
    atlasWasOpen = true;
  }

  NetworkEvents.dataReceived('chop_keys', event => {
    let mods = String(event.data.getString('mods'));
    Client.execute(() => { try { open(mods); } catch (e) { console.warn('[chop keys] open failed: ' + e); } });
  });

  // Put the player's own filter back once Atlas is closed.
  ClientEvents.tick(event => {
    if (!atlasWasOpen) return;
    let s = Client.screen;
    if (s != null && Atlas && s instanceof Atlas.Screen) return;
    atlasWasOpen = false;
    if (savedFilter != null) {
      try { Atlas.Cfg.setDisabledMods(savedFilter); } catch (e) { console.warn('[chop keys] restore failed: ' + e); }
      savedFilter = null;
    }
  });
})();
