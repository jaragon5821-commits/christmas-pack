// Chop's Christmas Spectacular - hide uncraftable items from JEI (client side, Nov 2 2026)
// Merrymaking pine mantels need Happy Hallows pine wood, which is not in the pack.
RecipeViewerEvents.removeEntries('item', event => {
  if (!Platform.isLoaded('merrymaking')) return
  ;['pine_mantel', 'aged_pine_mantel', 'exposed_pine_mantel', 'weathered_pine_mantel']
    .forEach(n => event.remove(`merrymaking:${n}`))
})
