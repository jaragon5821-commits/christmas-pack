// Festivity pet items (startup script: needs a game restart, not just /reload). DRAFT v4 2026-11-08 (tooltip names the script revive; v3 2026-11-06).
// chop:coal_chip - dropped by wild Coal Gnomes (Josh 17:40 UTC 11-06); 9 chips craft 1 coal.
// chop:festive_heart - shown as "Blaze Heart" (Josh 20:05: relight item must be Nether-gated); relights a Clinker Gnome (burnt-out Coal Gnome) into your own pet Coal Gnome (Redomesticate taming JSON).
StartupEvents.registry('item', event => {
  event.create('chop:coal_chip').displayName('Coal Chip').maxStackSize(64).tooltip('A chipped-off bit of Coal Gnome. Nine make a coal.');
  event.create('chop:festive_heart').displayName('Blaze Heart').maxStackSize(16).rarity('rare').tooltip('Nether-hot. Right-click a Clinker Gnome to wake it as your pet Coal Gnome.');
  console.log('[Festivity] pet items v4 registered (coal_chip, festive_heart)');
});
