// chop_carryon_animals.js v0.2.0 (Sleigh 2026-11-17; Toybox 2026-11-23) - boss: Carry On back, restricted to blocks and animals only.
// v0.2.0: Festivity rideables and rare creatures are never carried (boss 11-23: Carry On's sneak pickup stole the yak's chest click).
// Carry On reads the entity tag carryon:entity_whitelist when useWhitelistEntities = true (config/carryon-common.toml).
// This fills that tag with every registered entity type whose spawn category is an animal category, so villagers,
// MCA villagers, colonists, monsters, bosses and players (all MISC or MONSTER) can never be picked up.
ServerEvents.tags('entity_type', event => {
  let BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
  let animalCats = ['creature', 'water_creature', 'underground_water_creature', 'axolotls', 'ambient', 'water_ambient']
  let added = 0
  let rares = ['emberkit','rime_painter','letterwings','rimeshell','clinker_dove','glimmermole','nightwool','starfold_jelly','moonhopper','cairnling','caravan_yak','toadstool_shuffler','borealis_ray','clockwork_albatross','clinker_roc']
  let rideables = ['reindeer','lava_lizard','gingerbread_giant']
  let never = rares.concat(rideables).map(p => 'festivity:' + p)
  BuiltInRegistries.ENTITY_TYPE.keySet().forEach(id => {
    try {
      let type = BuiltInRegistries.ENTITY_TYPE.get(id)
      let cat = String(type.getCategory().getName())
      if (animalCats.indexOf(cat) >= 0 && never.indexOf(String(id)) < 0) {
        event.add('carryon:entity_whitelist', String(id))
        added++
      }
    } catch (e) {
      console.warn('[chop carryon] skipped ' + id + ': ' + e)
    }
  })
  console.info('[chop carryon] v0.2.0 animal whitelist entries: ' + added)
})
