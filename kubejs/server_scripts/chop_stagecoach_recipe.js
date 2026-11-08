// Chop's Christmas Spectacular - cheaper Stagecoach coach (Josh approved Nov 1 2026: 4 diamonds + gold)
// Original recipe stagecoach:<wood>_stagecoach = P C P / L D L / D G D with D = DIAMOND BLOCK, G = gold block (27 diamonds + 9 gold).
// New: same shape, D = plain diamond (4 total), G = gold block (9 gold, the closest single-slot match to "8 gold").
// Same recipe ids, so the originals are replaced, not duplicated.
if (Platform.isLoaded('stagecoach')) {
  ServerEvents.recipes(event => {
    const woods = ['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','bamboo','crimson','warped']
    woods.forEach(w => {
      event.shaped(`stagecoach:${w}_stagecoach`, ['PCP', 'LDL', 'DGD'], {
        P: `minecraft:${w}_planks`, C: '#c:chests/wooden', L: 'minecraft:lead',
        D: 'minecraft:diamond', G: 'minecraft:gold_block'
      }).id(`stagecoach:${w}_stagecoach`)
    })
  })
}
