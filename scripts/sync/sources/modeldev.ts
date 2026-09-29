// models.dev 数据源（MIT）：模型元数据、价格、上下文、模态。
// 输入为其 api.json（provider → models 两层结构），输出归一化的候选模型。
// 关键规则：只认 src/data/vendor-registry.ts 白名单厂商；渠道商挂载的第三方模型一律剔除。

import { promises as fs } from "node:fs";
import { VENDOR_DEFS } from "../../../src/data/vendor-registry";
import type { RPGModel } from "../../../src/lib/types";
import { classifyJob, paramTier, parseParamsB } from "../lib/ids";

interface ModelDevModel {
  id: string;
  name: string;
  description?: string;
  family?: string;
  release_date?: string;
  knowledge?: string;
  modalities?: { input?: string[]; output?: string[] };
  open_weights?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  limit?: { context?: number; output?: number };
  cost?: { input?: number; output?: number };
}

interface ModelDevProvider {
  id: string;
  name?: string;
  models?: Record<string, ModelDevModel>;
}

export interface ModelDevResult {
  models: RPGModel[];
  warnings: string[];
}

/** 去掉日期快照后缀：claude-opus-4-5-20251101 → claude-opus-4-5 */
export function baseIdOf(id: string): string {
  return id.replace(/-(\d{8})$/, "");
}

export async function fetchModelsDev(cachePath: string): Promise<ModelDevResult> {
  const warnings: string[] = [];
  const res = await fetch("https://models.dev/api.json", {
    headers: { "user-agent": "model-quest-sync/0.1" },
  });
  if (!res.ok) throw new Error(`models.dev HTTP ${res.status}`);
  const raw = (await res.json()) as Record<string, ModelDevProvider>;
  await fs.writeFile(cachePath, JSON.stringify(raw), "utf8");

  const models: RPGModel[] = [];
  const seen = new Set<string>(); // vendor--normId 去重（多 provider 合并）

  for (const def of VENDOR_DEFS) {
    const collected: Array<{ providerId: string; key: string; m: ModelDevModel }> = [];
    for (const pid of def.providers) {
      const p = raw[pid];
      if (!p) {
        warnings.push(`models.dev 缺少 provider「${pid}」（门派 ${def.id}）`);
        continue;
      }
      for (const [key, m] of Object.entries(p.models ?? {})) collected.push({ providerId: pid, key, m });
    }

    // 过滤第三方挂载（huggingface 渠道用组织前缀 hfKeep，未定义时回落 keep）
    const kept = collected.filter(({ providerId, key }) => {
      const allow = providerId === "huggingface" ? (def.hfKeep ?? def.keep) : def.keep;
      if (allow && !allow.test(key)) return false;
      if (def.drop && def.drop.test(key)) return false;
      return true;
    });

    // 日期快照（如 -0731）不再无条件剔除：run.ts 会在评测匹配后做二次裁决——
    // 有独立评测成绩的保留为独立条目（如 DeepSeek V4 Flash 0731），否则并入基础条目。
    for (const { key, m } of kept) {
      const normId = key.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
      const dedupeKey = `${def.id}--${normId}`;
      if (seen.has(dedupeKey)) continue; // 智谱双站等同模型去重
      seen.add(dedupeKey);

      const paramsB = parseParamsB(m.id, m.name);
      const priceIn = m.cost?.input ?? undefined;
      const priceOut = m.cost?.output ?? undefined;

      models.push({
        slug: dedupeKey,
        id: m.id,
        name: m.name.replace(/\s*\(latest\)\s*$/i, ""),
        vendor: def.id,
        family: m.family,
        releasedAt: m.release_date || undefined,
        knowledgeCutoff: m.knowledge || undefined,
        contextTokens: m.limit?.context ?? undefined,
        maxOutputTokens: m.limit?.output ?? undefined,
        priceIn,
        priceOut,
        openWeights: m.open_weights === true,
        job: classifyJob({ id: m.id, name: m.name, modalities: m.modalities }),
        reasoning: m.reasoning === true,
        toolCall: m.tool_call === true,
        modalities: {
          input: m.modalities?.input ?? ["text"],
          output: m.modalities?.output ?? ["text"],
        },
        paramsB,
        paramTier: paramTier(paramsB),
        scores: {},
        confidence: { eci: "unknown", sweBench: "unknown" },
      });
    }
  }

  return { models, warnings };
}
