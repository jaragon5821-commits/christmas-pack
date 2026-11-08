// Chop's Christmas Spectacular - Via Romana path blocks (Synergy Audit row 19)
// Only does anything once Via Romana is installed. Put it in after Via Romana loads cleanly.
// ColonyAutopilot lays DIRT_PATH + GRAVEL roads (read from its jar), so those are listed too.
ServerEvents.tags('block', event => {
  if (!Platform.isLoaded('via_romana')) return
  event.add('via_romana:path_block', ['minecraft:dirt_path', 'minecraft:gravel', 'minecraft:cobblestone'])
  if (Platform.isLoaded('mcwpaths')) event.add('via_romana:path_block', /^mcwpaths:/)
  // RoadWeaver: mod id and road block ids not confirmed yet. Check in TEST with F3/Jade,
  // then add them here, e.g. event.add('via_romana:path_block', 'roadweaver:<block>')
})
