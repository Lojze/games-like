# Reddit 玩家讨论 · 隐藏感受需求词分析

> 生成时间：2026-11-23 02:42:44 UTC
> 数据源：Arctic Shift API `/api/posts/search`，r/gamingsuggestions，`limit=100` · `sort=desc` · `before` 游标分页 · 每次请求间隔 1000ms
> 性质：只读分析。未修改任何核心管道代码，未写回标签体系。

## 数据概览

| 指标 | 值 |
| --- | --- |
| 请求页数 | 10 |
| 抓取原始帖子 | 1000 |
| 有效语料（正文非空且非 [removed]/[deleted]） | 815 |
| 过滤掉 | 185 |
| 语料时间跨度 | 2026-11-10 ~ 2026-11-23 |
| 清洗后 token 数 | 91400 |
| 描述性候选词/短语总数 | 530 |

## 一、Top 50 高频描述词

`count` = 语料中出现的总次数；`docs` = 出现在多少个不同帖子里（更能反映普遍性）。
主榜只收**描述词与描述性短语**（体验载体名词、X-like 见第二、三节专项榜），并过滤只出现 1 次的长尾词。
类型：`word` 单词 / `phrase` 描述性短语 / `x-like` X-like 组合词。

| # | 词 / 短语 | count | docs | 类型 | 白名单 |
| ---: | --- | ---: | ---: | --- | --- |
| 1 | `open` | 155 | 113 | word | — |
| 2 | `fun` | 139 | 101 | word | — |
| 3 | `open world` | 77 | 54 | phrase | — |
| 4 | `dark` | 47 | 37 | word | ✅ dark |
| 5 | `deep` | 42 | 29 | word | — |
| 6 | `cozy` | 40 | 27 | word | — |
| 7 | `difficult` | 36 | 25 | word | ✅ difficult |
| 8 | `boring` | 27 | 21 | word | — |
| 9 | `simple` | 26 | 26 | word | — |
| 10 | `chill` | 25 | 22 | word | — |
| 11 | `immersive` | 22 | 16 | word | — |
| 12 | `realistic` | 21 | 16 | word | — |
| 13 | `satisfying` | 21 | 16 | word | — |
| 14 | `mechanic` | 20 | 16 | word | — |
| 15 | `tactical` | 19 | 16 | word | — |
| 16 | `weird` | 18 | 17 | word | — |
| 17 | `competitive` | 18 | 14 | word | — |
| 18 | `slow` | 17 | 16 | word | — |
| 19 | `open-world` | 17 | 10 | word | — |
| 20 | `grounded` | 17 | 9 | word | — |
| 21 | `complex` | 16 | 13 | word | — |
| 22 | `linear` | 16 | 10 | word | — |
| 23 | `fast` | 15 | 15 | word | — |
| 24 | `turn-based` | 15 | 15 | word | — |
| 25 | `library` | 15 | 14 | word | — |
| 26 | `relaxing` | 15 | 11 | word | ✅ relaxing |
| 27 | `engaging` | 14 | 12 | word | — |
| 28 | `grand` | 14 | 12 | word | — |
| 29 | `repetitive` | 14 | 12 | word | — |
| 30 | `meaningful` | 14 | 11 | word | — |
| 31 | `classic` | 13 | 12 | word | — |
| 32 | `narrative` | 13 | 12 | word | — |
| 33 | `endless` | 13 | 11 | word | — |
| 34 | `enjoyable` | 13 | 9 | word | — |
| 35 | `powerful` | 13 | 8 | word | — |
| 36 | `retro` | 12 | 11 | word | — |
| 37 | `casual` | 11 | 10 | word | — |
| 38 | `open worlds` | 11 | 10 | phrase | — |
| 39 | `playable` | 11 | 10 | word | — |
| 40 | `story-driven` | 11 | 10 | word | — |
| 41 | `pixel` | 11 | 9 | word | — |
| 42 | `challenging` | 11 | 8 | word | — |
| 43 | `curious` | 10 | 10 | word | — |
| 44 | `strange` | 10 | 9 | word | — |
| 45 | `graphic` | 10 | 8 | word | — |
| 46 | `rewarding` | 10 | 8 | word | — |
| 47 | `survive` | 10 | 8 | word | — |
| 48 | `isometric` | 9 | 9 | word | — |
| 49 | `beautiful` | 9 | 8 | word | — |
| 50 | `rich` | 9 | 8 | word | — |

## 二、专项提取：X-like 组合词

玩家常用「某游戏-like」直接表达想要的整体体验，这是白名单体系最容易漏掉的表达形式。

| # | 组合词 | count | docs | 指向 |
| ---: | --- | ---: | ---: | --- |
| 1 | `souls-like` | 4 | 3 | 游戏专名（参照系） |
| 2 | `diablo-like` | 1 | 1 | 玩法/体验类比 |
| 3 | `genshin-like` | 1 | 1 | 游戏专名（参照系） |
| 4 | `monster-like` | 1 | 1 | 玩法/体验类比 |
| 5 | `movie-like` | 1 | 1 | 玩法/体验类比 |
| 6 | `sandbox-like` | 1 | 1 | 玩法/体验类比 |
| 7 | `skyrim-like` | 1 | 1 | 游戏专名（参照系） |
| 8 | `zelda-like` | 1 | 1 | 游戏专名（参照系） |

## 三、专项提取：高频体验载体名词

这些不是标签，但能说明玩家最常从哪些维度描述需求（Open world / story / combat 等），可用于判断标签覆盖面。

| # | 载体词 | count | docs | | # | 载体词 | count | docs |
| ---: | --- | ---: | ---: | --- | ---: | --- | ---: | ---: |
| 1 | `world` | 205 | 113 | | 11 | `graphics` | 51 | 42 |
| 2 | `story` | 198 | 133 | | 12 | `exploration` | 40 | 27 |
| 3 | `feel` | 139 | 97 | | 13 | `progression` | 39 | 32 |
| 4 | `combat` | 132 | 79 | | 14 | `build` | 38 | 33 |
| 5 | `gameplay` | 112 | 75 | | 15 | `worlds` | 34 | 25 |
| 6 | `character` | 90 | 65 | | 16 | `art` | 28 | 18 |
| 7 | `characters` | 65 | 48 | | 17 | `puzzle` | 25 | 21 |
| 8 | `experience` | 63 | 50 | | 18 | `atmosphere` | 25 | 18 |
| 9 | `mechanics` | 57 | 46 | | 19 | `choices` | 25 | 17 |
| 10 | `horror` | 55 | 38 | | 20 | `customization` | 24 | 20 |

## 四、白名单命中与缺失对比

现有 15 个感受标签：`atmospheric`、`story-rich`、`relaxing`、`dark`、`funny`、`cute`、`difficult`、`punishing`、`short-session`、`exploration-driven`、`narrative-choice`、`combat-focused`、`puzzle-heavy`、`emotional`、`surreal`

### 4.1 Top 50 中已命中白名单

| 词 / 短语 | count | 命中的白名单词 |
| --- | ---: | --- |
| `dark` | 47 | `dark` |
| `difficult` | 36 | `difficult` |
| `relaxing` | 15 | `relaxing` |

### 4.2 白名单词在语料中的独立频次

（同时统计连字符写法与空格写法，例如 `story-rich` 与 `story rich`）

| 白名单词 | count | docs | 是否进 Top 50 |
| --- | ---: | ---: | --- |
| `atmospheric` | 2 | 1 | — |
| `story-rich` | 3 | 2 | — |
| `relaxing` | 15 | 11 | ✅ |
| `dark` | 47 | 37 | ✅ |
| `funny` | 8 | 7 | — |
| `cute` | 6 | 4 | — |
| `difficult` | 36 | 25 | ✅ |
| `punishing` | 1 | 1 | — |
| `short-session` | 0 | 0 | — |
| `exploration-driven` | 0 | 0 | — |
| `narrative-choice` | 0 | 0 | — |
| `combat-focused` | 3 | 3 | — |
| `puzzle-heavy` | 0 | 0 | — |
| `emotional` | 5 | 4 | — |
| `surreal` | 1 | 1 | — |

### 4.3 缺失但极有「感受」价值

筛选规则：不在 15 词白名单内、出现 ≥ 5 次、属于感受形容词 / 严格形容词形态 / 描述性短语；已排除泛评价词、纯负面词、以及只是现有标签口语变体的词。按「感受价值分」排序。

| 词 / 短语 | count | docs | 类型 |
| --- | ---: | ---: | --- |
| `cozy` | 40 | 27 | word |
| `immersive` | 22 | 16 | word |
| `satisfying` | 21 | 16 | word |
| `linear` | 16 | 10 | word |
| `engaging` | 14 | 12 | word |
| `enjoyable` | 13 | 9 | word |
| `casual` | 11 | 10 | word |
| `story-driven` | 11 | 10 | word |
| `challenging` | 11 | 8 | word |
| `rewarding` | 10 | 8 | word |
| `meaningful` | 14 | 11 | word |

### 4.4 Top 50 中的其余缺失项（高频但不建议直接做标签）

以下词虽高频，但因泛化 / 结构性 / 纯负面 / 只是现有标签的口语变体，未进入行动建议：

`open`(155)、`fun`(139)、`open world`(77)、`deep`(42)、`boring`(27)、`simple`(26)、`chill`(25)、`realistic`(21)、`mechanic`(20)、`tactical`(19)、`weird`(18)、`competitive`(18)、`slow`(17)、`open-world`(17)、`grounded`(17)、`complex`(16)、`fast`(15)、`turn-based`(15)、`library`(15)、`grand`(14)、`repetitive`(14)、`classic`(13)、`narrative`(13)、`endless`(13)、`powerful`(13)、`retro`(12)、`open worlds`(11)、`playable`(11)、`pixel`(11)、`curious`(10)、`strange`(10)、`graphic`(10)、`survive`(10)、`isometric`(9)、`beautiful`(9)、`rich`(9)

## 五、行动建议：最值得补充的标签

> 以下仅为**建议**，脚本不会写入 `config/feel-whitelist.ts`。是否纳入标签体系需人工确认。

### 1. `cozy` → 建议标签 `cozy`

- **语料证据**：出现 40 次，覆盖 27 个帖子（Top 50 第 6 位）。
- **维度理由**：低压力、温暖治愈的游玩节奏，玩家直接用来描述「想要的状态」；与 relaxing 重叠但更偏氛围与情绪
- **玩家原话**：「…e we like more than the rest we have done story horror cozy open world all of the above all of us are broke students so preferably game recs that wont break the bank some game…」
- **⚠️ 历史注意**：该词曾在白名单从 20 → 15 的精简中被删除（原因是 RAWG 数据源无有效供给）。若重新纳入，需同步在 `config/tag-aliases.ts` 补映射，并重新跑 `clean:tags` 验证 df ≥ 5，否则会再次变成空窗标签。

### 2. `immersive` → 建议标签 `immersive`

- **语料证据**：出现 22 次，覆盖 16 个帖子（Top 50 第 11 位）。
- **维度理由**：世界代入感与沉浸度，跨类型的核心诉求，不隶属于任何现有 15 词
- **玩家原话**：「…deliverance not sure since saw reviews that it is very immersive so it can be slow paced please do recommend more games if yall have any in mind after reading my preferences t…」
- **⚠️ 历史注意**：该词曾在白名单从 20 → 15 的精简中被删除（原因是 RAWG 数据源无有效供给）。若重新纳入，需同步在 `config/tag-aliases.ts` 补映射，并重新跑 `clean:tags` 验证 df ≥ 5，否则会再次变成空窗标签。

### 3. `satisfying` → 建议标签 `satisfying`

- **语料证据**：出现 21 次，覆盖 16 个帖子（Top 50 第 13 位）。
- **维度理由**：操作反馈与完成感，偏手感/系统正反馈
- **玩家原话**：「im looking for a game that involves a rewarding and satisfying loot experience im looking for a game that involves a rewarding and satisfying loot experience tldr looking for…」
- **落地前置**：先确认 RAWG 原始标签或 aliases 能提供有效供给，再跑 `clean:tags` / `compute:matches` 验证。

### 4. `linear` → 建议标签 `linear`

- **语料证据**：出现 16 次，覆盖 10 个帖子（Top 50 第 22 位）。
- **维度理由**：流程开放度（线性 vs 开放），玩家高频用来自述偏好
- **玩家原话**：「…enemies except wild animals maybe no harsh climates no linear story just one person surviving the closest game ive played to that is the long dark and i do really enjoy that g…」
- **落地前置**：先确认 RAWG 原始标签或 aliases 能提供有效供给，再跑 `clean:tags` / `compute:matches` 验证。

### 5. `engaging` → 建议标签 `engaging`

- **语料证据**：出现 14 次，覆盖 12 个帖子（Top 50 第 27 位）。
- **维度理由**：持续吸引注意力，属于参与度维度
- **玩家原话**：「…ples can be anything along these lines i want it to be engaging enough to be interesting but not require a whole lot of brain power since i want to be able to listen to an aud…」
- **落地前置**：先确认 RAWG 原始标签或 aliases 能提供有效供给，再跑 `clean:tags` / `compute:matches` 验证。

### 附：白名单精简时被删除的 5 个词在本批语料中的表现

（来自 `config/feel-whitelist.ts` 头部注释：当初因 RAWG 数据源无有效供给而从 20 词精简为 15 词）

| 词 | count | docs | 本批语料中的判断 |
| --- | ---: | ---: | --- |
| `podcast-friendly` | 0 | 0 | 本批语料几乎不出现，删除合理 |
| `immersive` | 22 | 16 | 玩家高频使用，值得重新评估 |
| `wholesome` | 1 | 1 | 本批语料几乎不出现，删除合理 |
| `tense` | 2 | 2 | 本批语料几乎不出现，删除合理 |
| `cozy` | 40 | 27 | 玩家高频使用，值得重新评估 |

## 六、方法与局限

- 清洗：统一小写 → 去 URL / markdown 链接 → 去标点（保留连字符）→ 空白归一。
- 三层过滤：通用停用词 273 个、语境通用词 180 个、游戏专有名词/平台 87 个；另有 62 个非感受形容词黑名单。
- 候选：① 感受形容词种子表 + 严格后缀（ous/ful/less/ive/able/ible/ish/ical/istic/ic/ary，词长 ≥ 6）；刻意排除 -y/-ing/-ed/-al，避免 every / going / loved / survival 这类通用词污染；② 描述性二元短语（描述词 + 体验载体名词）；③ `X-like` 连字符组合词。
- 体验载体名词与 X-like 单独成榜，避免高频名词（world / story / combat）淹没真正的描述词。
- 行动建议按「感受价值分」排序（频次 + 覆盖帖数 + 感受形容词加权 + 历史删除词加权），而非纯词频；泛评价词 / 纯负面词 / 仅能作为现有标签 alias 的词不进入建议。
- 无词性标注、无语义聚类，纯启发式；`count` 为词频而非独立玩家数，长帖会放大个别词。
- 单一 subreddit（r/gamingsuggestions）且有时间窗口偏差；它天然偏「求推荐」句式，高频词反映的是「索取的表达方式」，不等于全平台玩家偏好。
- 游戏专名排除表是简易版，可能残留个别专名，也可能误排除少数多义词；结论需人工复核。

