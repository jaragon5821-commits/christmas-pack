// Chop's Christmas Spectacular - presents/treats tags + LootJS gift loot
// Approved Nov 1 2026: LootJS 3.7.0 paired with chop:presents (Synergy Audit rows 17 + 20).
// Item ids read from the installed jars. Loot part runs only if LootJS is loaded.
const has = (mod) => Platform.isLoaded(mod)
const colors = ['white','light_gray','gray','black','brown','red','orange','yellow','lime','green','cyan','light_blue','blue','purple','magenta','pink']

ServerEvents.tags('item', event => {
  const presents = []
  if (has('supplementaries')) { presents.push('supplementaries:present'); colors.forEach(c => presents.push(`supplementaries:present_${c}`)) }
  if (has('seasonsgreetings')) colors.forEach(c => presents.push(`seasonsgreetings:${c}_gift_box`))
  if (has('winterly')) ['red','green','blue','purple','yellow','black','white','cyan','orange'].forEach(c => presents.push(`winterly:${c}_gift_box`))
  if (has('manyideas_christmas')) presents.push('manyideas_christmas:present')
  if (has('merrymaking')) presents.push('merrymaking:present')
  if (has('christmassgrandmascabinet')) ['red','green','blue','yellow'].forEach(c => presents.push(`christmassgrandmascabinet:${c}_decorative_present`))
  if (has('mcwholidays')) ['red','green','blue','yellow','cyan','magenta','purple','dark_blue'].forEach(c => presents.push(`mcwholidays:${c}_present`))
  presents.forEach(id => event.add('chop:presents', id))

  const canes = []
  if (has('snowyspirit')) canes.push('snowyspirit:candy_cane')
  if (has('merrymaking')) canes.push('merrymaking:candy_cane')
  if (has('winterly')) canes.push('winterly:red_candy_cane', 'winterly:green_candy_cane', 'winterly:blue_candy_cane')
  if (has('christmassgrandmascabinet')) canes.push('christmassgrandmascabinet:red_candy_cane', 'christmassgrandmascabinet:green_candy_cane', 'christmassgrandmascabinet:blue_candy_cane')
  canes.forEach(id => { event.add('chop:candy_canes', id); event.add('chop:festive_treats', id) })
  event.add('chop:festive_treats', '#c:foods/gingerbread_cookie')   // from chop_synergy_tags.js
})

if (has('lootjs')) {
  LootJS.modifiers(event => {
    // Every chest loot table (vanilla, YUNG's, Lootr, modded structures)
    event.addTableModifier(LootType.CHEST)
      .addLoot(LootEntry.tag('chop:presents').randomChance(0.10))
      .addLoot(LootEntry.tag('chop:festive_treats').randomChance(0.20))
  })
}
