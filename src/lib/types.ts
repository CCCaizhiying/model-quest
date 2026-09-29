// Model Quest 全站共享类型：数据快照 schema 的唯一出处。
// scripts/sync 与 src/app 都从这里 import，保证管线产物与站点消费端一致。

export type Region = "cn" | "global";

/** 职业由模态能力推导：文本=战士、视觉=弓手、全模态=魔剑士、图像生成=画师、视频生成=幻术师、语音=吟游诗人、嵌入=符文师 */
export type Job =
  | "warrior"
  | "archer"
  | "spellblade"
  | "painter"
  | "illusionist"
  | "bard"
  | "runecaster";

export type ParamTier = "unknown" | "nano" | "small" | "mid" | "large" | "colossal";

export interface RPGModel {
  /** 全站唯一：{vendor}--{id} 归一化 */
  slug: string;
  id: string;
  name: string;
  vendor: string;
  family?: string;
  releasedAt?: string; // YYYY-MM-DD
  knowledgeCutoff?: string;
  contextTokens?: number;
  maxOutputTokens?: number;
  /** USD / 百万 token */
  priceIn?: number;
  priceOut?: number;
  openWeights: boolean;
  job: Job;
  reasoning: boolean;
  toolCall: boolean;
  modalities: { input: string[]; output: string[] };
  /** 从命名中解析的参数量（十亿），仅「官方命名自报」，非实测 */
  paramsB?: number;
  paramTier: ParamTier;
  scores: {
    eci?: number; // Epoch AI 综合能力指数
    sweBench?: number; // SWE-bench Verified（百分数）
    livebenchCoding?: number; // LiveBench 编码类均值（百分数，补全编码能力覆盖）
    gpqa?: number;
    aime?: number;
    mathLevel5?: number;
  };
  confidence: {
    eci: "measured" | "unknown";
    sweBench: "measured" | "unknown";
  };
}

export interface RPGVendor {
  id: string;
  name: string; // 展示名（中文）
  en: string;
  region: Region;
  /** 门派主色相（0-360），驱动像素形象配色 */
  hue: number;
  motto: string; // 门派口号
  modelCount: number;
  /** 门面模型：ECI 最高者，否则最新发布 */
  flagship?: string; // model slug
}

export interface DragonInfo {
  slug: string;
  name: string;
  vendor: string;
  /** eci = 综合能力指数实测榜首；provisional = 无评测数据时的透明暂定规则 */
  basis: "eci" | "provisional";
  eci?: number;
  /** 登基日（该模型的发布日期） */
  since?: string;
}

export interface Snapshot {
  generatedAt: string;
  dragon: DragonInfo | null;
  vendors: RPGVendor[];
  models: RPGModel[];
  stats: {
    vendorCount: number;
    modelCount: number;
    eciCoverage: number; // 0-1
    sweBenchCoverage: number;
  };
  sources: Record<string, { retrievedAt: string; license: string; note?: string }>;
  warnings: string[];
}

export const JOB_META: Record<Job, { zh: string; icon: string; desc: string }> = {
  warrior: { zh: "战士", icon: "⚔️", desc: "纯文本修行的经典剑士" },
  archer: { zh: "弓手", icon: "🏹", desc: "看得见图像的远程猎手" },
  spellblade: { zh: "魔剑士", icon: "🔮", desc: "文本图像音频视频皆通的魔剑士" },
  painter: { zh: "画师", icon: "🎨", desc: "以笔绘出图像的幻画师" },
  illusionist: { zh: "幻术师", icon: "🎬", desc: "编织动态影像的幻术师" },
  bard: { zh: "吟游诗人", icon: "🎵", desc: "发声成韵的吟游诗人" },
  runecaster: { zh: "符文师", icon: "📜", desc: "将万物铸为向量符文的学者" },
};
