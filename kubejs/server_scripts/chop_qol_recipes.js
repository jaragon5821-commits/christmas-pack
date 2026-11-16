// chop_qol_recipes.js v0.1.0 (Rune, 2026-11-16) - server script.
// Boss-approved QoL recipes (Board D252, batch 1, approved 11-16): saddle (leather + string + iron, the boss's own ask),
// name tag, iron/gold/diamond horse armor, and chainmail armor from iron nuggets. Vanilla has no recipe for any of these items,
// so these add recipes; nothing is replaced. Checked 11-16: no other KubeJS script or the Horseman jar adds a recipe for them.
// Patterns: horse armor uses vanilla's leather horse armor shape (X X / XXX / X X); chainmail uses the vanilla armor shapes.
ServerEvents.recipes(event => {
  // Saddle: L L L / S I S  (3 leather, 2 string, 1 iron ingot)
  event.shaped('minecraft:saddle', ['LLL', 'SIS'], {
    L: 'minecraft:leather', S: 'minecraft:string', I: 'minecraft:iron_ingot'
  }).id('chop:qol/saddle');

  // Name tag: string, paper and an iron nugget on a diagonal
  event.shaped('minecraft:name_tag', ['  S', ' P ', 'N  '], {
    S: 'minecraft:string', P: 'minecraft:paper', N: 'minecraft:iron_nugget'
  }).id('chop:qol/name_tag');

  // Horse armor: same shape as vanilla leather horse armor
  [['iron', 'minecraft:iron_ingot'], ['golden', 'minecraft:gold_ingot'], ['diamond', 'minecraft:diamond']].forEach(m => {
    event.shaped('minecraft:' + m[0] + '_horse_armor', ['X X', 'XXX', 'X X'], { X: m[1] })
      .id('chop:qol/' + m[0] + '_horse_armor');
  });

  // Chainmail armor from iron nuggets, vanilla armor shapes
  const N = { N: 'minecraft:iron_nugget' };
  event.shaped('minecraft:chainmail_helmet', ['NNN', 'N N'], N).id('chop:qol/chainmail_helmet');
  event.shaped('minecraft:chainmail_chestplate', ['N N', 'NNN', 'NNN'], N).id('chop:qol/chainmail_chestplate');
  event.shaped('minecraft:chainmail_leggings', ['NNN', 'N N', 'N N'], N).id('chop:qol/chainmail_leggings');
  event.shaped('minecraft:chainmail_boots', ['N N', 'N N'], N).id('chop:qol/chainmail_boots');
});
console.info('[chop qol] recipes v0.1.0: saddle, name tag, 3 horse armor, 4 chainmail');
