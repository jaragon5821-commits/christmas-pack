// Chop's Christmas Spectacular - presents/treats tags + LootJS gift loot
// v0.2.0 (Scripts, 2026-11-09, Josh live test): FIX chests 'entirely full of single presents'. LootEntry.tag(tag) defaults to
//   expand=false, which in vanilla loot means 'drop ONE OF EVERY item in the tag' (~55 presents / dozens of treats per hit).
//   Now expand=true (one random item from the tag). Presents 10% -> 6%, treats 20% -> 12% with a 1-2 stack.
// v0.3.0 (Loot audit, 2026-11-09): REAL FIX for the 42-82 stack chest bloat. v0.2.0's expand=true did not help:
//   LootJS 3.7.0 addLoot() (AddLootAction.apply) calls entry.expand() and then createItemStack() on EVERY expanded
//   child, so a tag entry gives one of every item in the tag whether expand is true or false. A vanilla pool
//   (pool() -> LootPool.addRandomItems, 1 roll) picks ONE weighted child instead. Chances unchanged: 6% / 12%.
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
    // One pool per tag, 1 roll each: at most ONE present and ONE treat stack per chest.
    event.addTableModifier(LootType.CHEST)
      .pool(p => { p.addEntry(LootEntry.tag('chop:presents', true).randomChance(0.06)) })
      .pool(p => { p.addEntry(LootEntry.tag('chop:festive_treats', true).setCount([1, 2]).randomChance(0.12)) })
  })
}
