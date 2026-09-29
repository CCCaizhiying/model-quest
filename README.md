# ⚔ Model Quest · 模型屠龙录

> **致敬《勇者斗恶龙》的 AI 大模型查询站。**
> 当前综合最强的大模型，是盘踞龙座的「恶龙」；其余 400+ 大模型，皆为前来讨伐的勇者。
> **屠龙者，终成恶龙。**

一个把 AI 大模型数据「世界观化」的静态查询站：Next.js 静态导出、零后端、零 API key，全部像素形象程序化拼装，数据多源自动同步。

## 玩法（六大模块）

| 模块 | 说明 |
|---|---|
| 🐉 **屠龙榜**（首页） | 魔王城展示现任恶龙（ECI 榜首）+ 七路榜首挑战者 + 职业与门派速览 |
| 🗺 **村庄广场** | 东土/西洋两大陆 28 个门派据点（厂商），按规模分街，品牌徽标一眼认门 |
| 🏟 **武斗大会** | 七大赛制排行榜：综合智力 / 编程 / 最划算 / 耐力 / 平民英雄会 / 新秀登场 / 综合战力，支持阵营与大陆筛选 |
| 📜 **屠龙编年史** | 按月时间线 + **恶龙换代大事记**（依据 Epoch AI 实测日期回放推演历代加冕） |
| 📖 **勇者图鉴** | 每个模型一页：像素立绘、五维能力条、多源战绩表、系谱进化树，全量静态生成 |
| 🔍 **全站检索** | 认模型名、厂商名、能力词（试试输入「多模态」「开源」） |

## 世界观映射（数据 → RPG）

| RPG 属性 | 数据来源 |
|---|---|
| ⚔ 攻击 | Epoch AI 综合能力指数（ECI），**恶龙判定依据** |
| 🗡 剑术 | SWE-bench Verified，缺则回退 LiveBench 编码均值 |
| 🛡 体力 | 上下文窗口长度（对数映射） |
| 🍀 幸运 | 每百万 tokens 输入价（越便宜越幸运） |
| 💜 战力 | 综合评定：0.6×攻击 + 0.25×剑术 + 0.15×体力，×新鲜度系数 |
| 职业七种 | 模态：文本=战士、视觉=弓手、全模态=魔剑士、图像=画师、视频=幻术师、语音=吟游诗人、嵌入=符文师 |
| 体格 / 门派 / 阵营 | 参数量档位 / 厂商 / 开源义军 vs 王国骑士团 |

缺失数据的属性一律显示「？？？空槽」，**不臆造**。

## 榜单公平性设计

- **最划算大会**有中位数能力门槛：只有「便宜且够用」的模型能参赛，杜绝低能力 × 极低价的老模型霸榜
- **全榜单时效加权**：新鲜度系数（近 6 个月 = 1.0，每早 6 个月 ×0.85，下限 0.4），老模型自然沉底
- **不同赛制分数不混算**：SWE-bench 与 LiveBench 分开展示，综合战力的剑术项会如实标注回退来源
- **恶龙判定只用纯 ECI**，与综合战力、时效加权解耦

## 数据来源与许可

| 用途 | 来源 | 许可 |
|---|---|---|
| 模型元数据 / 价格 / 上下文 / 模态 | [models.dev](https://models.dev) | MIT |
| ECI、SWE-bench、GPQA、AIME、MATH | [Epoch AI Benchmarking Hub](https://epoch.ai/benchmarks) | CC-BY 4.0 |
| 编码能力补全 | [LiveBench](https://livebench.ai) | Apache-2.0 |
| 价格与上架日期补全 | [OpenRouter 目录](https://openrouter.ai) | 公开目录 API（仅补缺，不覆盖已有值） |

- 明确不使用 Artificial Analysis（禁止转存）与 LMArena 站点数据（禁止抓取）
- 逐项素材许可（Kenney Tiny Dungeon CC0、Fusion Pixel Font OFL、simple-icons CC0）见 [docs/NOTICE.md](docs/NOTICE.md)

## 快速开始

```bash
npm install
npm run sync      # 抓取 4 个数据源 → data/models.json（约 430 个模型 / 28 个厂商）
npm run logos     # 下载门派品牌徽标（simple-icons，CC0；失败自动回退像素徽章）
npm run dev       # 开发模式 http://localhost:3000（热更新）
```

生产构建与预览：

```bash
npm run build     # 静态导出到 out/（431 个图鉴页全量预渲染）
npm run preview   # 预览静态产物 http://localhost:3100
```

其他脚本：

| 脚本 | 说明 |
|---|---|
| `npm run check` | 数据管线自检（38 项断言：名称归一化、职业映射、匹配变体、新鲜度、综合战力…） |
| `npm run rebuild` | 一条龙：sync + logos + build |

### 自动数据更新（GitHub Actions）

仓库内置 [`.github/workflows/sync.yml`](.github/workflows/sync.yml)：**每 6 小时**自动抓取四源 → 自检 → 构建验证 → 有变化才提交推送，推送到 `main` 后连数据带页面一起保持最新。手动触发：仓库 **Actions** 页 → Sync data → Run workflow。调整频率改 `cron` 一行即可。

> 注意：GitHub 对连续 60 天无提交活动的仓库会自动暂停定时工作流，届时手动 Run 一次即恢复。

需要 Node.js 20+。无后端、无 API key、无用户数据收集。

## 工程结构

```
scripts/sync/              数据管线
  sources/modeldev.ts        models.dev 适配（厂商白名单 + 渠道过滤 + 日期变体裁决）
  sources/epoch.ts           Epoch AI ZIP 适配（内存解压 + 宽松列匹配）
  sources/livebench.ts       LiveBench 适配（编码均值 + 推理档后缀剥除）
  sources/openrouter.ts      OpenRouter 适配（缺失价格/日期补全，不覆盖已有值）
  lib/match.ts               名称三级模糊匹配（精确 / 后缀剥离 / 前缀 + 日期消歧）
  run.ts                     抓取 → 匹配 → 恶龙判定 → 产物（models.json / sync-report / search-index）
  selftest.ts                38 项纯函数自检
src/lib/                   站点核心库
  pixelmap.ts                像素图基础件（手工像素图 → 游程/贪心矩形合并 SVG）
  kenney-extra.ts            恶龙与王座（Tiny Dungeon 风格手绘补绘）
  crest.ts                   门派像素徽章（官方图标缺失时兜底）
  rank.ts                    榜单 / 能力条 / 新鲜度 / 综合战力 / 恶龙换代推演
  snapshot.ts                构建期快照读取
src/data/vendor-registry.ts  门派登记表（全站唯一人工常识表：厂商、主色、口号、渠道过滤规则）
src/app/                   六大模块页面（App Router，静态导出）
```

**两个值得看的设计**：

1. **名称三级模糊匹配**——ECI 榜的 `DeepSeek V4 Flash 0731` 与 models.dev 的 `deepseek-v4-flash-0731` 能对上：精确键 → 变体后缀剥离（beta/preview/日期/推理档）→ 前缀双向匹配 + 基准日期消歧（唯一才接受，绝不瞎猜）
2. **日期变体裁决**——先保留全部日期快照，评测匹配后再裁决：有独立成绩的留下（0731 是独立版本），纯渠道快照并入基础条目

## 声明

- 本站为独立的原创致敬作品，与 Square Enix《勇者斗恶龙》（Dragon Quest）无任何关联；仅采用不受版权保护的「像素 JRPG」通用风格语言
- 代码以 MIT 许可开源；第三方素材与数据的许可逐项见 [docs/NOTICE.md](docs/NOTICE.md)

## Roadmap

- [ ] 恶龙换代监测升级：积累真实同步快照，与回放推演互相印证
- [ ] HuggingFace 参数量补全（消除「？？级体格」空槽）
- [ ] GitHub Actions 定时 sync + 自动部署
- [ ] 吊桥主题皮肤（水流动画 + 龙穴）
- [ ] 英文版 i18n

## 致谢

- [liyupi/ai-model-world](https://github.com/liyupi/ai-model-world) —— 灵感蓝本与数据源选型参考
- [Kenney](https://kenney.nl) —— 精美的 CC0 像素素材
- [TakWolf/fusion-pixel-font](https://github.com/TakWolf/fusion-pixel-font) —— 开源像素字体
- [Epoch AI](https://epoch.ai) / [models.dev](https://models.dev) / [LiveBench](https://livebench.ai) —— 公开数据支撑
