// 模型名称归一化与匹配键生成。
// 目标：models.dev 的 id/name 与 Epoch AI 的展示名能对上同一个键。
// 例：'claude-opus-4-5' / 'Claude Opus 4.5' / 'gpt-5.5-pro' / 'GPT-5.5 Pro' 互为同键。

export function normKey(s: string): string {
  let t = s.toLowerCase();
  t = t.replace(/\(([^)]*)\)/g, " "); // 去括注：(latest)、(Jan 2025)
  t = t.replace(/_(max|high|low|medium)$/g, ""); // 去评测 effort 后缀：deepseek-v4-pro_max
  t = t.replace(/[^a-z0-9]/g, ""); // 点号一并去掉：4.5 与 4-5 同键
  return t;
}

/** 生成一个模型的所有候选匹配键（按优先级） */
export function candidateKeys(m: {
  id: string;
  name: string;
  family?: string;
}): string[] {
  const keys = [normKey(m.name), normKey(m.id)];
  if (m.family) keys.push(normKey(m.family));
  if (m.id.includes("/")) keys.push(normKey(m.id.split("/").pop()!)); // HF 组织前缀版：'Qwen/Qwen3-8B' → 'qwen3-8b'
  return [...new Set(keys.filter((k) => k.length > 1))];
}

/** 参数量解析：只认官方命名里自报的数字，如 'qwen3-235b-a22b' → 235 */
export function parseParamsB(id: string, name: string): number | undefined {
  const m = `${name} ${id}`.match(/(\d+(?:\.\d+)?)\s*b(?![a-z0-9])/i);
  if (!m) return undefined;
  const v = parseFloat(m[1]);
  // 235b-a22b 之类取第一个总量；排除把 'b' 误配到 bench/token 等词
  return v > 0 && v < 100000 ? v : undefined;
}

export function paramTier(paramsB?: number): "unknown" | "nano" | "small" | "mid" | "large" | "colossal" {
  if (paramsB == null) return "unknown";
  if (paramsB < 4) return "nano";
  if (paramsB < 16) return "small";
  if (paramsB < 80) return "mid";
  if (paramsB < 300) return "large";
  return "colossal";
}

export type Job =
  | "warrior"
  | "archer"
  | "spellblade"
  | "painter"
  | "illusionist"
  | "bard"
  | "runecaster";

/** 模态 → 职业映射（世界观规则，见 PRD） */
export function classifyJob(m: {
  id: string;
  name: string;
  modalities?: { input?: string[]; output?: string[] };
}): Job {
  const t = `${m.id} ${m.name}`.toLowerCase();
  if (/embed|rerank/.test(t)) return "runecaster";
  const out = m.modalities?.output ?? ["text"];
  const inp = m.modalities?.input ?? ["text"];
  const nonTextInput = inp.filter((x) => x !== "text" && x !== "pdf");
  if (out.includes("image")) return "painter";
  if (out.includes("video")) return "illusionist";
  if (out.includes("audio")) return "bard";
  if (nonTextInput.length >= 2) return "spellblade";
  if (nonTextInput.length === 1) return "archer";
  return "warrior";
}

/** 身价档位（驱动披风华丽度）：数字越小越「富有」（便宜） */
export function priceTier(priceIn?: number, priceOut?: number): 0 | 1 | 2 | 3 {
  const p = priceIn ?? priceOut;
  if (p == null) return 0;
  if (p < 0.5) return 3; // 极便宜=传说披风
  if (p < 2) return 2;
  if (p < 10) return 1;
  return 0; // 贵族=无披风，靠铠甲(默认)与主色撑场
}
