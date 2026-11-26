/**
 * 交叉页专属 why-it-fits 文案。
 *
 * 外层 key = 交叉页 URL slug（`${feelWord}-${genre.toLowerCase()}`），
 * 内层 key = games.json 的 slug，value = 40–90 词的英文短评。
 *
 * 覆盖范围（刻意不全量生成，避免模板化门页）：
 *   - 6 个小页全量手写；
 *   - 2 个大页只写新排序下的前 12 张，其余卡片 reason 留空，不做模板补位。
 *
 * 写作约束：
 *   - 每条同时落到「该游戏的具体机制」和「该页的 feel」两点；
 *   - 禁止 perfect for / guaranteed / the best / everyone will 等绝对表述；
 *   - 全站无逐字重复，同页句首结构至少三种，不一游戏名套同一句式；
 *   - 体验与 feel 冲突的条目不写（如 cozy-puzzle 里的 bulb-boy / pony-island
 *     已由 cross-exclusions 剔除，不在此供稿）。
 */

export const crossReasons: Record<string, Record<string, string>> = {
  'cozy-puzzle': {
    threes:
      'Rather than racing a clock, Threes! asks you to slide numbered tiles until matching pairs fuse into larger ones. The board stays calm and uncluttered, and a clumsy merge costs only a few seconds of thought. Its gentle palette and soft chimes turn each small combination into the kind of quiet satisfaction that suits a relaxed break.',
    prune:
      'You shape a growing tree by dragging branches toward light and away from falling fruit, and no timer pushes you along. Each level is a small, self-contained garden you can study at leisure. The muted colours and slow growth make pruning feel like tending a plant rather than clearing a test.',
    'a-monsters-expedition':
      'The entire puzzle is pushing over pre-weakened trees to lay flat paths between fenced exhibits. There are no enemies and no fail state, so progress comes from reading the map and thinking ahead. That unhurried, curious wandering is what gives this little expedition its cosy rhythm.',
    fez:
      'Fez lets you rotate a two-dimensional view by ninety degrees to reveal hidden ledges and reconnect platforms. Death simply returns you to the last safe spot, so experimenting never stings. Pastel villages and a mellow soundtrack keep the mood warm while your brain quietly works out the geometry.',
    'world-of-goo':
      'You build bridges and towers from sticky balls, dragging them into place while gravity does the rest. Failed structures collapse harmlessly and can be rebuilt in seconds, which removes any sting from trial and error. The hand-drawn look and gentle music make each stable construction feel quietly rewarding.',
    'labyrinth-2':
      'A bright square has to reach a transparent exit through grids that grow from ten by ten upward. The mazes escalate in complexity, but there is no countdown and no penalty for a wrong turn. Tracing a route at your own pace gives this one a calm, almost meditative pull.',
    'grindstone-2':
      'You trace paths through runs of identical creeps to cut huge combos, then spend the grindstones you earn on new gear for the climb. Enemies turn hostile the longer you linger, so each board asks for a quick read of the colour layout. The growing arsenal gives the puzzle battles a steady sense of progress.',
    'the-witness':
      'You draw a single continuous line across a panel to satisfy a set of visual rules, one puzzle at a time. Nothing times you and nothing punishes a wrong attempt; you simply lift and try again. Wandering the island between panels keeps the whole experience unhurried and reflective.',
    florence:
      'Florence tells its story through tiny interactive vignettes, from assembling a dialogue by sliding word fragments to piecing a photograph back together. Each interaction is brief and tactile rather than demanding. The soft illustration style and everyday intimacy of the relationship give it a warm, low-key charm.',
    machinarium:
      'You guide a small robot by clicking hotspots and combining found objects, with no dialogue and no timers anywhere. Solutions come from noticing how the mechanical world fits together, not from speed. Its hand-painted, slightly worn settings give the tinkering a gentle, storybook warmth.',
  },

  'cozy-platformer': {
    fez: 'Rotating the world a quarter turn turns a flat painting into a walkable ledge, and Fez never rushes that discovery. Checkpoints are generous and there is no strict fail state to dread. Sun-drenched rooftops and a relaxed soundtrack make the exploration feel like a slow holiday.',
    'ori-and-the-will-of-the-wisps':
      'Movement here flows, as you dash, wall-jump and grapple between hand-painted trees without ever fighting the controls. The pacing invites detours to inspect glowing flora. Sweeping strings and layered forest art carry a warmth that sits comfortably with the platforming.',
    'spelunky-2':
      'Every run drops you into hand-drawn caves where shops and shrines reward a careful look. The art has a storybook texture and the underground layers invite curiosity even when a run ends early. Its charm lives in the detailed, lived-in places you pass through rather than in speed.',
    'sonic-adventure-2':
      'Collecting rings and switching between speed and mechanised characters keeps the movement playful rather than punishing. Checkpoints are frequent, so replaying a stretch is painless. Bright cities and a buoyant soundtrack carry a light-hearted mood through the platforming, with little pressure to rush a level.',
    'rayman-legends':
      'Rayman Legends hands you a floaty jump and then fills the screen with musical stages and hidden lanes. Mistakes cost seconds, not progress, and the pace stays forgiving. The painted backgrounds and cheerful rhythm make the whole thing feel like a playful romp.',
    'hollow-knight':
      'You map a decaying kingdom one careful jump at a time, and the game rewards patience with shortcuts and secrets. Benches let you pause and recover between stretches. The melancholy, hand-drawn scenery and quiet ambience give the exploration a gentle, contemplative pull.',
    owlboy:
      'Owlboy floats rather than runs, letting you hover across pixel-art scenery while carrying companions who solve environmental puzzles. There is no harsh timer pushing you onward. The soft colours and thoughtful character moments keep the mood warm and unhurried, and you can linger over a view.',
    'ori-and-the-blind-forest':
      'You guide a small spirit through a glowing forest by chaining jumps and ability upgrades. Death returns you to a nearby spirit tree, so trying again is quick. Watercolour backdrops and a tender score wrap the platforming in a calm, emotional atmosphere.',
    'ori-and-the-blind-forest-definitive-edition':
      'This edition adds extra abilities and revised checkpoints to the same luminous forest journey. Movement stays fluid and forgiving, and the new options ease the rougher stretches. The painterly light and gentle music keep the whole trip soothing without flattening the challenge.',
    psychonauts:
      'Psychonauts sends you leaping through the mindscapes of eccentric characters, where platforms obey dream logic instead of physics. The tone stays comic and strange rather than stern. Colourful, surreal stages make the jumping feel like wandering through someone else imagination.',
    'rayman-origins':
      'A simple jump and a helico-hover carry you through bright, dense levels packed with secrets and musical interludes. The difficulty leans friendly and retries are instant. Its saturated, hand-drawn world keeps the mood cheerful and easy to dip into whenever a short session is enough.',
    'sonic-mania':
      'Sonic Mania returns to loop-de-loops and spin-dashes with pixel-art stages that reward a light touch on the controls. A checkpoint after each act keeps setbacks small. The retro bright palette and upbeat tracks give the speed a playful, low-stress feel.',
    moss: 'Moss places a tiny mouse in a storybook woodland you can tilt and peek around, guiding her across ledges and past puzzles. The pace is deliberate and gentle. Soft lighting, lush miniature scenery and a warm narrator make the traversal quietly charming.',
    'dust-an-elysian-tail':
      'You sweep through a painted fantasy land with a sentient sword, stringing together aerial combos as you explore. The combat is flashy but forgiving, and progress is steady. Its lush painted backdrops and easygoing tone give the platforming a relaxed, storybook feel.',
  },

  'cozy-simulation': {
    prune:
      'In Prune the simulation is a growing tree: you drag branches toward light and away from fruit to shape how it spreads. There is no quota or clock, only small gardens to tend. Muted greens and slow growth make the loop feel like quiet time in a greenhouse.',
    'ticket-to-ride':
      'You claim railway routes by playing sets of coloured cards, weighing short connections against long ones. Turns are deliberate and there is no real-time pressure. The clean board layout and tactile route-building give it a calm, sociable rhythm that unfolds slowly over an evening.',
    'microsoft-flight-simulator':
      'Microsoft Flight Simulator lets you pilot small aircraft over a live-rendered world, following routes or simply flying toward the horizon. You set your own pace and there is no scoring clock. Calm skies, detailed terrain and cockpit ambience make it a soothing way to wander.',
    'stardew-valley':
      'Stardew Valley gives you a farm, a village and a flexible daily routine of planting, fishing and talking to neighbours. Nothing forces you to optimise, and seasons pass slowly. Its pixel-art charm and gentle music turn routine chores into a comforting habit.',
    'overcooked-all-you-can-eat':
      'Overcooked asks you to chop, cook and pass dishes across increasingly inventive kitchens, each built around a tight service window. The all-you-can-eat set lets you revisit stages until a layout clicks, so a rough first try is not the end of it. Bright, toy-like kitchens keep the chaos good-natured rather than grim, and the hand-offs make a crowded counter feel like a shared joke.',
    'the-sims-3':
      'You build a household and watch small simulated lives unfold, from careers to awkward neighbourhood parties. There is no win condition pulling you along. The freedom to decorate and simply observe gives the game a relaxed, dollhouse kind of calm.',
    'dirt-rally':
      'DiRT Rally puts you on narrow point-to-point stages where careful throttle control matters more than outright speed. You can replay a stage as often as you like to find a cleaner line. Detailed cars and changing weather make the practice absorbing rather than tense.',
    'game-dev-story':
      'You run a tiny games studio, hiring staff and choosing genres while your releases climb the charts. Progress happens in gentle, readable steps with no live pressure. The playful screenshots and steady growth loop give the management a cosy, hobbyist charm.',
    'turbo-dismount':
      'Turbo Dismount stages elaborate crashes and then lets you replay them from any angle with a slow-motion camera. The appeal is less about a high score than about experiments with vehicles and physics. The dry, slapstick tone keeps the destruction oddly relaxing to watch.',
    'cities-skylines':
      'You zone a blank map into a working city, laying roads and watching neighbourhoods grow around your choices. Problems appear gradually and can be solved at your own pace. The satisfying part is the slow, visible hum of a place you built yourself.',
    '80-days':
      '80 Days turns a round-the-world trip into a chain of route choices, each city described in vivid, compact prose. You decide how far to push your budget and when to stop. Its paper-map presentation and conversational writing make the journey feel leisurely.',
    'dungeon-village':
      'You develop a small frontier town, and visiting adventurers head out to dungeons and return with coin to spend. The loop runs on its own gentle schedule. Cheerful pixel art and simple growth make it an easy game to check in on and put down.',
    'pinball-fx2':
      'Pinball FX2 recreates the feel of a physical table with themed boards and satisfying flipper feedback. Each ball is a short, self-contained run with no long-term penalty. The bright tables and punchy sound make it an easy, low-commitment way to unwind.',
  },

  'hard-puzzle': {
    'a-monsters-expedition':
      "A Monster's Expedition hides its difficulty in spatial planning: you topple specific trees to connect fenced exhibits in the right order. There is no timer, only the quiet challenge of seeing which route the layout allows. Wrong moves cost a reset, so the thinking stays deliberate.",
    braid:
      'Braid builds its puzzles around a rewindable clock, letting you undo seconds and layer your own earlier actions into a solution. Time behaves differently in each world, so the rules must be relearned. That constant reframing makes even small rooms demand careful thought.',
    'n-nplusplus':
      'N++ is a momentum platformer disguised as a puzzle: you ricochet between walls to collect gold while avoiding nimbi. Each screen is a compact geometry problem you solve through movement. Hundreds of concise rooms keep the challenge sharp and strictly skill-based.',
    'world-of-goo':
      'World of Goo asks you to engineer stable structures from living balls under realistic gravity. The later islands layer wind, pipes and limited pieces onto the same idea. Solutions reward patience and structural insight rather than quick reflexes, and a collapsed tower is simply part of the work.',
    limbo:
      'Limbo gives you almost no guidance, so each trap, lever or shadowy creature becomes a puzzle you work out by watching. The monochrome silhouettes hide details that matter. Trial and error is the method, and the answers are rarely signposted.',
    'the-swapper':
      'The Swapper arms you with a device that clones you and lets you swap minds between copies. That single rule produces chamber after chamber of spatial and timing puzzles. The cold, painted station setting keeps the mood thoughtful as the logic deepens.',
    'the-witness':
      'The Witness packs a full vocabulary of line-drawing rules onto a single island, teaching most of them without words. Later panels combine earlier rules in ways that resist a quick glance. The difficulty is entirely in perception, and you set the pace.',
    'the-talos-principle':
      'The Talos Principle layers laser beams, sensors and forbidden doors into large outdoor puzzle areas. Early rooms teach one mechanism at a time; later ones combine several at once. Reading the environment carefully matters more than moving quickly, and you are free to revisit any puzzle.',
    'papers-please':
      'Papers, Please makes a hard puzzle out of bureaucracy: you compare passports, dates and permits against a shifting rulebook. Every correct or wrong decision carries a consequence for your family. The pressure comes from attention to detail, not an action clock.',
    machinarium:
      'Machinarium is a point-and-click adventure whose item combinations are pure logic puzzles with no hint system holding your hand. You inspect machines, collect parts and work out the sequence yourself. Its wordless design leaves the reasoning entirely to you, so each solved device feels earned through observation.',
    humanity:
      'Humanity hands you a marching crowd of Shiba Inu and asks you to route them through grids by commanding jumps, turns and transforms. Early stages are simple; later ones demand precise ordering of many commands. The challenge is planning a whole sequence at once.',
    spacechem:
      'SpaceChem turns chemistry into factory design: you program two walkers to bond and split atoms into a target molecule. Soon you are optimising for fewer cycles and tighter layouts. It is a demanding systems puzzle that rewards careful, iterative thinking.',
  },

  'funny-puzzle': {
    'portal-2':
      "Portal 2 builds its jokes straight into the tests, with Wheatley's ramblings punctuating puzzles about momentum and portals. Solving a chamber often means laughing at the absurd setup first. The writing stays witty while the physics challenges remain genuinely clever.",
    'a-monsters-expedition':
      "A Monster's Expedition is dry rather than loud: its joke is a whole museum built for monsters who study human exhibits. The tree-toppling puzzles are gentle, and the narration treats the absurd premise completely seriously. That straight face is where the humour lives.",
    'the-longest-journey':
      'The Longest Journey pairs a sprawling parallel-world mystery with a cast of delightfully odd characters. Its puzzles are classic inventory affairs, but the comic timing of the dialogue carries them. Expect wit and eccentricity rather than outright slapstick, with conversations that carry half the appeal.',
    'world-of-goo':
      'World of Goo finds comedy in the goo itself, little blobs that squeak, complain and occasionally get flung across a gap. The physics puzzles are clever, but the personalities give each mishap a comic beat. Its dry charm makes failure entertaining.',
    portal:
      "Portal's humour is minimalist and deadpan: a calm voice guides you through test chambers while the situation quietly goes wrong. The portal-and-momentum puzzles are sharp, and the jokes arrive through the gap between instructions and reality. No punchline needs speaking aloud.",
    'there-is-no-game-wd':
      'There Is No Game builds its whole premise on refusing to be a game, then drags you through parodies of game genres. The puzzles are point-and-click tricks that break their own rules. Its meta jokes land because the format keeps cheerfully collapsing.',
    paradigm:
      'Paradigm is a surreal adventure whose puzzles sit inside a strange Eastern European fable, complete with a talking, candy-vomiting sloth. The dialogue is absurd and the situations escalate wildly. The comedy comes from how earnestly the bizarre world is played straight.',
    'pony-island':
      'Pony Island presents itself as a broken arcade cabinet and lets you repair it by sabotaging its own demonic systems. The puzzles disguise themselves as crude old games before the joke turns. Its sharp, knowing humour is aimed squarely at game conventions.',
    'grim-fandango-remastered':
      'Grim Fandango pairs a film-noir afterlife with a department run by bureaucratic worms. Its inventory puzzles are clever, but the wisecracking dialogue is the real draw. The remaster keeps the dry, theatrical wit intact, and odd jobs with stranger clients keep the story moving between puzzles.',
  },

  'dark-shooter': {
    bioshock:
      "BioShock builds its dread from Rapture itself, a flooded art-deco city whose grand halls glow with flickering neon and old propaganda. Combat is loud, but the unease comes from the audio logs and what the city slowly reveals. Its bleak setting gives the shooting real weight.",
    'metal-gear-solid-v-the-phantom-pain':
      "Metal Gear Solid V trades bombast for hot African afternoons and quiet enemy camps, where a single guard's routine becomes a puzzle. The stealth is patient and the story stays morally murky. Its sun-bleached military bases feel uneasy precisely because they are so ordinary.",
    'metro-redux':
      'Metro 2033 Redux pushes you through dark tunnels where your gas mask, filter supply and a flickering lighter matter as much as ammunition. The station interiors are cramped and the surface is worse. Scarcity and near-silence make every encounter feel grim.',
    'bioshock-2':
      "BioShock 2 returns to Rapture, this time as a Big Daddy, and the underwater city's decay shows in its cracked windows and broken pillars. The tone stays cold and morally uneasy. Cycling through its flooded halls keeps the darkness thick.",
    fear: "F.E.A.R. pairs slow-motion gunfights with a child's ghost whose appearances warp the room around you. Corridors are dim, grey and full of unsettling sound design. The horror lingers in the pauses between firefights, not just during them, where a flicker at the edge of vision is warning enough.",
    'doom-3':
      'Doom 3 slows the series down into a haunted Mars base, where flickering lights and scrawled walls build tension between fights. You read logs and navigate dark maintenance tunnels with a flashlight. The dread comes from not seeing what is waiting.',
    'max-payne-3':
      'Max Payne 3 keeps the bullet-time but wraps it in a grim, sun-scorched Brazil of corrupt cops and private militias. The story is cynical and the violence feels heavy rather than heroic. Its bleak tone sits in the dialogue as much as the gunfights.',
    'dead-space':
      'Dead Space turns a mining ship into a place of dread, with groaning walls, flickering monitors and a suit whose health reads along its own spine. Combat is deliberately heavy and ammunition is scarce. The atmosphere is a threat as much as the creatures.',
    'system-shock-enhanced-version':
      'System Shock puts you on a station overrun by a rogue AI whose messages taunt you between encounters. Its cyan terminals, dark corridors and voice-driven menace set a cold, paranoid mood. Every solved terminal deepens the unease rather than easing it.',
  },

  // 大页只供新排序下的前 12 张；其余卡片 reason 留空，不做模板补位。
  'atmospheric-shooter': {
    'portal-2':
      "Portal 2's atmosphere is built from vast, sterile test chambers and the dry echo of a machine left empty far too long. Aperture's clean white corridors slowly reveal decay underneath. The mood comes from the place, not just from the puzzles.",
    'call-of-duty':
      'Call of Duty moves from the Camp Toccoa training grounds to airborne drops over Normandy and on into Berlin, with three armies carrying the campaign. Briefings and slideshows set up each mission, and the WWII staging leans on squad chatter and smoke. Its atmosphere lives in that careful build to each battle.',
    'fallout-3':
      'Fallout 3 asks you to cross a sun-bleached Capital Wasteland of ruined suburbs and dust storms, an old radio playing softly as you go. The silences between encounters are as memorable as the fights. Its desolation is the reason to keep exploring.',
    'return-to-castle-wolfenstein':
      'Return to Castle Wolfenstein puts you in a dark fortress where wet stone, torchlight and low humming machinery set the tone. Stealth sections make the corridors feel watched. The setting weight comes from those details rather than the gunfire alone.',
    'counter-strike-source':
      'Counter-Strike: Source strips shooting down to tense, echoing maps where a single footstep can give you away. The Source engine lighting and reverberant sound give dusty corridors real presence. The mood is all anticipation before the first shot, with every corner holding a held breath.',
    'call-of-duty-united-offensive':
      'United Offensive expands the original with larger, harsher battlefields, from snowbound villages to open fields under smoke. Artillery barrages and suppressed viewpoints change how a map feels moment to moment. Its atmosphere grows from that scale, and a route can feel completely different on a second pass.',
    'modern-warfare-2':
      'Modern Warfare 2 moves from snowy ridges to rain-slick streets, and each setting is defined by weather and light as much as by enemies. The sound design puts you inside a large, chaotic battle. Its cinematic set-pieces carry an uneasy realism.',
    'call-of-duty-2':
      'Call of Duty 2 pushes you through grey European streets and frozen fronts where visibility shifts with smoke and falling snow. Voice chatter and distant artillery fill the space between objectives. Its mood comes from that constant, low-grade pressure, with cold and noise that never quite let up.',
    'half-life-2':
      'Half-Life 2 drops you into City 17, a place of grim concrete, Combine towers and watched streets. Its atmosphere lives in small details: a distant broadcast, a drone hum, a family abandoned flat. The quiet stretches are what make the world feel occupied.',
    'half-life':
      'Half-Life begins with a quiet subway ride and an odd experiment, then lets Black Mesa fluorescent labs and alien caverns take over. The pacing moves from sterile corridors toward something far stranger. Its atmosphere is the slow discovery that the facility is losing control.',
    bioshock:
      "BioShock's Rapture is an underwater city whose grand corridors glow through water and glass. The atmosphere is announced before you fire a shot, through a statue, a slogan and a voice crackling over the radio. The place stays with you longer than any firefight.",
    'red-dead-redemption':
      'Red Dead Redemption builds its mood from wide, empty plains, long sunsets and a fading outlaw life. Riding between camps takes time, and that time is the point. Its atmosphere is the feeling of a world winding down around you.',
  },

  'atmospheric-strategy': {
    'rome-total-war-collection':
      'Rome: Total War sets its battles against a map of sun-lit provinces and marble cities, with armies that fill the horizon. The campaign turns borders into slowly shifting lines. Its atmosphere comes from the scale, the sense of watching history unfold.',
    'world-of-goo':
      'World of Goo is quiet where most strategy games are loud: a wind-up island, soft pastel slopes and balls that hum as they connect. The pace is contemplative rather than urgent. Its atmosphere lives in the gentle, slightly melancholy world around the puzzles.',
    'empire-total-war':
      'Empire: Total War moves the series into an age of sail, where broadside duels happen under grey skies and cannon smoke. Campaign maps are vast and slow to unfold. The mood is one of distant empires and long, deliberate wars.',
    'xcom-enemy-unknown':
      'XCOM: Enemy Unknown makes each turn feel heavy, as a squad advances under a threat that could emerge from any roof. The base dim corridors and the alien designs carry a cold, investigative mood. Every decision is shadowed by possible loss.',
    'rise-of-nations-extended-edition':
      'Rise of Nations compresses centuries into one flowing map, where borders redraw and eras change under your hand. Its atmosphere is one of steady, sweeping change. Watching a small state become an empire gives the campaign its quiet pull, and the pace rewards a long view.',
    rimworld:
      'RimWorld sets its colony on an alien tile where weather, wildlife and mood matter as much as construction. Fires, cold snaps and raider trails make the map feel alive and indifferent. Its atmosphere grows from the stories your colonists accumulate.',
    'warhammer-40000-dawn-of-war-dark-crusade':
      'Dawn of War: Dark Crusade wraps its battles in gothic spires, fog and the machinery of a grim far future. Each stronghold has its own visual character. The atmosphere is one of slow, grinding war between ancient, hostile powers, with territory changing hands after hard, deliberate fights.',
    'total-annihilation':
      'Total Annihilation plays out across vast maps where units stream in endless lines and the horizon fills with construction. Its scale gives the battles a strangely calm, industrial rhythm. The mood is of two exhausting armies wearing each other down.',
    'homeworld-remastered-collection':
      'Homeworld unfolds in the silence of deep space, where your fleet drifts in three dimensions against a starfield. Commands feel deliberate and the distances are vast. Its atmosphere is the loneliness of a small refuge fleeing across the void, with every move measured against that emptiness.',
    frostpunk:
      'Frostpunk puts a generator at the centre of a frozen city, with steam, soot and endless snow pressing in from every side. Every law you pass changes the mood of the streets. Its atmosphere is the cold, hard weight of keeping people alive.',
    'shadow-tactics':
      'Shadow Tactics asks you to move small teams through snowy Japanese strongholds where a guard line of sight is everything. The pause-and-plan rhythm is patient and precise. Its atmosphere comes from the quiet, watchful stillness before a strike, where a single missed shadow can undo minutes of planning.',
    'command-conquer-3-tiberium-wars':
      'Command & Conquer 3 sets its battles on fields of crystalline Tiberium under a harsh, alien light. Bases spread in visible waves and the campaign moves between three distinct factions. Its atmosphere is one of bright, brittle worlds at war.',
  },
};
