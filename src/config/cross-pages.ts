/**
 * 感受 × 品类交叉长尾页配置（第二阶段，8 个经过人工复核的组合）。
 *
 * 设计要点：
 * 1. URL 与 H1 一律「Feel 在前、Genre 在后」的自然搜索语序，
 *    例如 /feels/cozy-puzzle/ → "Cozy Puzzle Games"。
 * 2. feelWord 是搜索用语（difficult 在玩家侧的真实说法是 hard），
 *    feelTag 才是 feel-tags.json 里的真实标签，两者必须分开存储：
 *    页面展示 / URL 用 feelWord，数据筛选 / 回链用 feelTag。
 * 3. intro 是每页 100–150 词的专属英文导语，把两个维度自然结合，
 *    内容只陈述数据能支撑的事实（命中该 feel + 该 genre），不编造评价。
 *    8 段导语互不重复，避免被判为模板化门页（doorway page）。
 *
 * 本文件同时被交叉页路由和单标签页的「Top Genres」内链模块复用，
 * 保证新增/删除组合时两边不会失同步。
 */

export interface CrossPageConfig {
  /** URL 段 + H1 使用的自然搜索词（小写连字符），如 hard-puzzle 的 hard */
  feelWord: string;
  /** feel-tags.json 中的真实感受标签，如 hard 对应的 difficult */
  feelTag: string;
  /** games.json 的 genres 字段中真实出现的品类字符串 */
  genre: string;
  /** 页面 H1 标题 */
  h1: string;
  /** 100–150 词专属英文导语 */
  intro: string;
}

export const CROSS_PAGES: readonly CrossPageConfig[] = [
  {
    feelWord: 'atmospheric',
    feelTag: 'atmospheric',
    genre: 'Shooter',
    h1: 'Atmospheric Shooter Games',
    intro:
      "Great shooters don't just test your aim — they pull you into a place you can almost smell. This collection brings together atmospheric shooters: games where fog, lighting, sound design and ruined environments do as much work as the gun in your hands. You'll find slow-burn tactical encounters, tension that builds in the silence between firefights, and worlds that linger after the credits roll. We picked every title here because it carries both the atmospheric feel tag and the Shooter genre in our catalog, so the shortlist reflects how a game actually feels rather than a marketing label. Whether you want a single-player descent into something strange or a carefully paced tactical campaign, these are the shooters that trade noise for mood. Browse the full list below and use the feel chips on each card to branch into related picks; top picks include a note on why they fit.",
  },
  {
    feelWord: 'atmospheric',
    feelTag: 'atmospheric',
    genre: 'Strategy',
    h1: 'Atmospheric Strategy Games',
    intro:
      'Strategy rewards patience, but atmosphere is what makes that patience feel worthwhile. Here you will find strategy games where weather, scale, sound and art direction turn every decision into a moment rather than a spreadsheet. Commanding a fleet through a storm or rebuilding a ruined province hits differently when the world around you feels alive and indifferent to your plans. Each game below carries both the atmospheric feel tag and the Strategy genre in our catalog, which keeps the list focused on titles that deliver thoughtful systems inside a memorable setting. These are slower, more deliberate games — the kind you return to for an hour and emerge from with a story. Top picks include a note on why they fit, so you can see exactly which mood the atmosphere delivers before you dive in.',
  },
  {
    feelWord: 'cozy',
    feelTag: 'cozy',
    genre: 'Puzzle',
    h1: 'Cozy Puzzle Games',
    intro:
      "Looking for a game that keeps your brain engaged but doesn't stress you out? These picks pair puzzle mechanics with softer cores — most are adventure or casual games with a layer of problem-solving rather than pure puzzle titles. We gathered every title that carries both the cozy feel tag and the Puzzle genre, then kept the ones whose mood suits an unhurried session. Expect approachable palettes, room to think things through, and the quiet satisfaction of a solution that finally clicks into place. The list is deliberately short: ten games, each chosen for how it feels rather than how loud it is, and ordered by how central Puzzle is before critic score. Each card below includes a short why-it-fits note, screenshots and a score badge so you can judge the fit before you commit. Start at the top for the most puzzle-forward picks and work down.",
  },
  {
    feelWord: 'cozy',
    feelTag: 'cozy',
    genre: 'Simulation',
    h1: 'Cozy Simulation Games',
    intro:
      'Some games ask nothing of you except to show up and tend to something small. These cozy simulation games are built around that promise: gentle routines, forgiving goals, and the pleasure of watching a little world respond to your care. Whether you are tending crops or running a modest shop, the loop is designed to soothe rather than compete. We selected each title because it holds both the cozy feel tag and the Simulation genre in our catalog — genuine systems in a calm presentation, not a themed screensaver. There are thirteen picks here, ordered by how central Simulation is to each game and then by critic score, each with screenshots and a short explanation of why it fits the mood. If you want a game to wind down with — one that suits a slow, unhurried pace — this is the right shelf to start on.',
  },
  {
    feelWord: 'cozy',
    feelTag: 'cozy',
    genre: 'Platformer',
    h1: 'Cozy Platformer Games',
    intro:
      'Platformers are usually sold on precision and punishing retries. These cozy platformers take a softer route: responsive movement, forgiving checkpoints, and worlds that invite you to look around instead of rushing past. Think hand-painted scenery, gentle traversal puzzles, and the simple joy of jumping through a place that was clearly built with care. Every game here carries both the cozy feel tag and the Platformer genre in our catalog, which keeps the shortlist honest about what it delivers — a warm mood attached to real platforming, not just a pleasant skin. We have sorted the picks by how central Platformer is to each game, then by critic score, so the most platform-focused entries come first; each card carries a why-it-fits note explaining the specific comfort it offers. Fourteen games, all easy to pick up and hard to leave.',
  },
  {
    feelWord: 'hard',
    feelTag: 'difficult',
    genre: 'Puzzle',
    h1: 'Hard Puzzle Games',
    intro:
      "Not every puzzle is meant to be solved over a quiet cup of tea. These hard puzzle games are the ones that make you stop, reconsider, and occasionally walk away before the answer arrives. They carry the difficult feel tag and the Puzzle genre in our catalog, so the difficulty here comes from layered rules and genuine brain-teasing that reveal themselves slowly. Expect mechanics that take time to unfold, solutions that reward lateral thinking, and the particular satisfaction of a problem you earned. We kept this list small on purpose: twelve titles with enough substance to justify the struggle, ordered by how central Puzzle is before critic score and annotated with a short why-it-fits note. If you like your puzzles patient, elegant and unapologetically demanding, start with the top-ranked pick below and read the screenshots before you dive in.",
  },
  {
    feelWord: 'funny',
    feelTag: 'funny',
    genre: 'Puzzle',
    h1: 'Funny Puzzle Games',
    intro:
      "Puzzles don't have to be solemn. These funny puzzle games pair clever mechanics with a sense of humour — games that make you laugh at the solution as often as you groan at the setup. You will find absurd premises, deadpan writing and jokes that are built into the rules rather than pasted on top of them. Each title below carries both the funny feel tag and the Puzzle genre in our catalog, so the comedy sits alongside real problem-solving rather than replacing it. There are nine picks, ordered by how central Puzzle is before critic score, and every card includes screenshots plus a short why-it-fits note so you can tell which kind of wit you are getting. If you want something that loosens you up while it stretches your brain, this is a good place to begin.",
  },
  {
    feelWord: 'dark',
    feelTag: 'dark',
    genre: 'Shooter',
    h1: 'Dark Shooter Games',
    intro:
      "These aren't shooters you play to feel good. Dark shooters trade bright set pieces for dread, moral discomfort and environments that seem to watch you back. The nine games below all carry the dark feel tag and the Shooter genre in our catalog, so the shortlist is defined by tone as much as by firepower — bleak settings, unsettling sound design and combat that feels heavy in the hands. Expect slow revelations, morally grey choices and victories that don't feel clean. We have ordered the list by how central Shooter is before critic score, and each card carries a why-it-fits note explaining which shade of darkness it delivers, along with screenshots and a score badge. If you are drawn to shooters with weight and atmosphere rather than spectacle alone, start here and work through the full set.",
  },
];

/** 供交叉页按 params 反查配置：key 为 `${feelWord}-${genre.toLowerCase()}` */
export const CROSS_BY_SLUG: ReadonlyMap<string, CrossPageConfig> = new Map(
  CROSS_PAGES.map((config) => [
    `${config.feelWord}-${config.genre.toLowerCase()}`,
    config,
  ]),
);

/** 供单标签页「Top Genres」模块使用：取该 feel 的所有交叉页 */
export function crossPagesForFeel(feelTag: string): CrossPageConfig[] {
  return CROSS_PAGES.filter((config) => config.feelTag === feelTag);
}

/** 交叉页的 URL（feel 在前、genre 在后） */
export function crossHref(config: CrossPageConfig): string {
  return `/feels/${config.feelWord}-${config.genre.toLowerCase()}/`;
}

/** 内链锚文本：自然搜索语序的 "Cozy Puzzle" / "Hard Puzzle" */
export function crossLabel(config: CrossPageConfig): string {
  const word = config.feelWord.replace(/(^|-)(\w)/g, (_m, sep: string, ch: string) =>
    sep ? ` ${ch.toUpperCase()}` : ch.toUpperCase(),
  );
  return `${word} ${config.genre}`;
}
