// Chop namespace display name (Josh 2026-11-07 06:05 UTC: Jade showed "Chop" on an ornament). Startup script -> needs a game restart.
// Route A: KubeJS Platform mod-name override (kubejs.com/wiki/tutorials/changing-mod-names). Guarded: "chop" may not exist as a mod entry.
// Route B (client lang key jade.modName.chop, see MODNAME_SNIPPET_en_us.json) covers Jade when route A does nothing.
const CHOP_DISPLAY_NAME = 'Festivity'; // change here if Josh picks another name
try {
  if (Platform.mods.chop) { Platform.mods.chop.name = CHOP_DISPLAY_NAME; console.log('[Chop] namespace display name set via Platform.mods: ' + CHOP_DISPLAY_NAME); }
  else console.log('[Chop] Platform.mods.chop not present; relying on jade.modName.chop lang key');
} catch (e) { console.warn('[Chop] mod name override failed: ' + e); }
