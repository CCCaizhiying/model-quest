// OpenRouter 数据源（公开目录 API，仅用于补全缺失属性，不转存模型描述文本）：
// - 补全缺失的输入/输出价格（pricing.prompt/completion 为 USD/token，×1e6 转 USD/M）
// - 补全缺失的发布日期（created 为上架时间，作为发布时间的近似上限）
// 引用参考站的合规用法：仅发现与补全，不抓取榜单分数。
import { normKey } from "../lib/ids";

const OR_URL = "https://openrouter.ai/api/v1/models";

interface ORModel {
  id: string;
  name?: string;
  created?: number;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

export interface OpenRouterData {
  /** normKey → 补全信息 */
  byKey: Map<string, { priceIn?: number; priceOut?: number; context?: number; created?: string }>;
  count: number;
}

export async function fetchOpenRouter(): Promise<{ data: OpenRouterData; warnings: string[] }> {
  const warnings: string[] = [];
  const res = await fetch(OR_URL, { headers: { "user-agent": "model-quest-sync/0.1" } });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const j = (await res.json()) as { data: ORModel[] };

  const byKey = new Map<string, { priceIn?: number; priceOut?: number; context?: number; created?: string }>();
  const put = (key: string, v: { priceIn?: number; priceOut?: number; context?: number; created?: string }) => {
    if (!key || byKey.has(key)) return;
    byKey.set(key, v);
  };

  for (const m of j.data) {
    const prompt = parseFloat(m.pricing?.prompt ?? "");
    const completion = parseFloat(m.pricing?.completion ?? "");
    const info: { priceIn?: number; priceOut?: number; context?: number; created?: string } = {};
    if (Number.isFinite(prompt) && prompt >= 0) info.priceIn = Math.round(prompt * 1e6 * 1e6) / 1e6;
    if (Number.isFinite(completion) && completion >= 0) info.priceOut = Math.round(completion * 1e6 * 1e6) / 1e6;
    if (m.context_length) info.context = m.context_length;
    if (m.created) info.created = new Date(m.created * 1000).toISOString().slice(0, 10);
    if (info.priceIn == null && info.priceOut == null && info.context == null && info.created == null) continue;
    put(normKey(m.id), info);
    if (m.name) put(normKey(m.name), info);
  }

  if (byKey.size === 0) warnings.push("OpenRouter: 未取到任何目录条目");
  return { data: { byKey, count: j.data.length }, warnings };
}
