# NOTICE — 素材与数据许可清单

## 代码

- 本项目代码：[MIT License](../LICENSE)。第三方素材与数据的许可见下文各节。

## 字体

- **Fusion Pixel Font**（12px proportional，zh_hans 子集，`public/fonts/fusion-pixel-12px-zh_hans.woff2`）
  - © TakWolf，许可：SIL Open Font License 1.1
  - 许可文本：`public/fonts/OFL.txt`
  - 来源：https://github.com/TakWolf/fusion-pixel-font

## 像素素材

- **Kenney Tiny Dungeon**（`public/sprites/td/tilemap_packed.png`，勇者/据点/道具瓦片）
  - © Kenney Vleugels（www.kenney.nl），许可：Creative Commons Zero（CC0 1.0），可商用、无需署名（自愿署名以示支持）
  - 来源：https://kenney.nl/assets/tiny-dungeon
  - 许可文本副本：`public/sprites/td/LICENSE.txt`
- **恶龙与王座立绘**（`src/lib/kenney-extra.ts`）：Tiny Dungeon 未收录龙/王座，本项目按其风格（16px 网格、深李紫描边、平涂色阶）手绘补齐，为本项目原创。

## 数据（构建期抓取，快照随仓库分发时需保留署名）

- **models.dev** — 模型元数据、价格、上下文窗口、模态。许可：MIT。https://models.dev
- **Epoch AI Benchmarking Hub**（`https://epoch.ai/data/benchmark_data.zip`）— ECI 综合能力指数、SWE-bench Verified、GPQA Diamond、AIME（Otis Mock）、MATH Level 5。
  - 许可：CC BY 4.0
  - 要求署名：
    > Epoch AI, 'Capabilities & benchmarking'. Published online at epoch.ai. Retrieved from 'https://epoch.ai/benchmarks'

## 未使用的数据源（合规考量）

- Artificial Analysis：其使用条款禁止转存，不使用。
- LMArena：禁止抓取其站点，不使用。

## 美术

- 勇者、门派据点瓦片：Kenney Tiny Dungeon（CC0，见上）；门派色调差异通过 CSS `hue-rotate` 实现，无素材改动。
- 恶龙、王座：本项目手绘（`src/lib/kenney-extra.ts`），风格对齐 Tiny Dungeon。
- 门派品牌徽标：simple-icons（CC0）或程序化像素徽章。
- 表情符号图标（职业 icon）使用平台系统 emoji，无额外许可负担。

## 商标声明

Model Quest 是独立的原创致敬作品，与 Square Enix Co., Ltd. 及其《勇者斗恶龙》（Dragon Quest / ドラゴンクエスト）系列无任何关联、无任何授权关系。本项目不使用、不复制、不模仿该系列的任何受版权保护的素材、角色、名称、音乐或UI设计；仅采用不受版权保护的「像素 JRPG」通用风格语言。
