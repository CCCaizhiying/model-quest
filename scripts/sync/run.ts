// Model Quest 数据管线主入口：npm run sync
// models.dev（MIT，元数据/价格/上下文/模态） + Epoch AI（CC-BY 4.0，ECI/编程/学科战绩）
// 产出：data/models.json（快照）、data/sync-report.json（体检报告）、public/search-index.json

import { promises as fs } from "node:fs";
import path from "node:path";
import { VENDOR_DEFS, VENDOR_MAP } from "../../src/data/vendor-registry";
import type { DragonInfo, RPGModel, RPGVendor, Snapshot } from "../../src/lib/types";
import { candidateKeys } from "./lib/ids";
import { baseIdOf } from "./sources/modeldev";
import { matchScores } from "./lib/match";
import { fetchEpoch, EPOCH_CITATION } from "./sources/epoch";
import { fetchLiveBench } from "./sources/livebench";
import { fetchOpenRouter } from "./sources/openrouter";
import { fetchModelsDev } from "./sources/modeldev";

const ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");

async function main() {
  const warnings: string[] = [];
  const retrievedAt = new Date().toISOString();

  console.log("▶ [1/4] 抓取 models.dev …");
  const { models, warnings: w1 } = await fetchModelsDev(path.join(DATA_DIR, "_raw-modelsdev.json"));
  warnings.push(...w1);
  console.log(`   归一化后模型：${models.length} 个`);

  let epochMaps: Awaited<ReturnType<typeof fetchEpoch>>["data"] | null = null;
  try {
    console.log("▶ [2/4] 抓取 Epoch AI benchmark ZIP …");
    const { data, warnings: w2 } = await fetchEpoch();
    epochMaps = data;
    warnings.push(...w2);
    console.log(
      `   ECI ${data.eci.size} 行 / SWE-bench ${data.sweBench.size} 行 / GPQA ${data.gpqa.size} / AIME ${data.aime.size} / MATH ${data.mathLevel5.size}`
    );
  } catch (e) {
    warnings.push(`Epoch 抓取失败，本次快照无评测数据：${(e as Error).message}`);
    console.warn("   ⚠ " + warnings.at(-1));
  }

  let livebench: Awaited<ReturnType<typeof fetchLiveBench>>["data"] | null = null;
  try {
    console.log("▶ [2b] 抓取 LiveBench 编码榜 …");
    const lb = await fetchLiveBench();
    livebench = lb.data;
    warnings.push(...lb.warnings);
    console.log(`   release=${lb.data.release}，编码均值 ${lb.data.coding.size} 条`);
  } catch (e) {
    warnings.push(`LiveBench 抓取失败（优雅降级）：${(e as Error).message}`);
    console.warn("   ⚠ " + warnings.at(-1));
  }

  let openrouter: Awaited<ReturnType<typeof fetchOpenRouter>>["data"] | null = null;
  try {
    console.log("▶ [2c] 抓取 OpenRouter 目录（价格/日期补全）…");
    const or = await fetchOpenRouter();
    openrouter = or.data;
    console.log(`   目录 ${or.data.count} 条，可用键 ${or.data.byKey.size} 个`);
  } catch (e) {
    warnings.push(`OpenRouter 抓取失败（优雅降级）：${(e as Error).message}`);
    console.warn("   ⚠ " + warnings.at(-1));
  }

  console.log("▶ [3/4] 匹配评测分数 …");
  const unmatchedEci: Array<{ key: string; score: number }> = [];
  if (epochMaps) {
    const keyIndex = new Map<string, RPGModel>();
    for (const m of models) for (const k of candidateKeys(m)) if (!keyIndex.has(k)) keyIndex.set(k, m);
    const getDate = (m: RPGModel) => m.releasedAt;

    const eciEntries = [...epochMaps.eci].map(([key, v]) => ({ key, score: v.score, date: v.date }));
    const eciMatch = matchScores(eciEntries, keyIndex, getDate);
    unmatchedEci.push(...eciMatch.unmatched.map((u) => ({ key: u.key, score: u.score })));
    for (const r of eciMatch.results) {
      const m = r.target;
      if (m.scores.eci == null || r.score > m.scores.eci) m.scores.eci = r.score;
      m.confidence.eci = "measured";
      if (!m.releasedAt && r.date) m.releasedAt = r.date; // 仅当缺失时以评测记录日期兜底
    }

    type BenchMap = Map<string, { score: number; date?: string }>;
    type BenchField = 'sweBench' | 'gpqa' | 'aime' | 'mathLevel5';
    const benches: Array<[BenchMap, BenchField]> = [
      [epochMaps.sweBench, "sweBench"],
      [epochMaps.gpqa, "gpqa"],
      [epochMaps.aime, "aime"],
      [epochMaps.mathLevel5, "mathLevel5"],
    ];
    for (const [map, field] of benches) {
      const entries = [...map].map(([key, v]) => ({ key, score: v.score, date: v.date }));
      const { results } = matchScores(entries, keyIndex, getDate);
      for (const r of results) {
        const m = r.target;
        const prev = m.scores[field];
        if (prev == null || r.score > prev) m.scores[field] = r.score;
        if (field === "sweBench") m.confidence.sweBench = "measured";
      }
    }

    if (unmatchedEci.length > 0) {
      const top = unmatchedEci.sort((a, b) => b.score - a.score).slice(0, 12);
      warnings.push(
        `Epoch 有 ${unmatchedEci.length} 个 ECI 条目未匹配到本地模型，最高分示例：${top
          .map((t) => `${t.key}(${t.score})`)
          .join("、")}`
      );
    }

    // 日期变体二次裁决：评测匹配之后再决定去留。
    // 保留 = 有以自己完整 ID 匹配到的独立评测成绩（如 DeepSeek V4 Flash 0731）；
    // 剔除 = 无独立成绩且存在基础条目（纯渠道日期快照），并入基础条目。
    const baseIds = new Set(models.map((m) => m.id));
    const dated = models.filter((m) => /-\d{8}$/.test(m.id));
    for (const m of dated) {
      const base = baseIdOf(m.id);
      const keep = m.scores.eci != null || !baseIds.has(base);
      if (!keep) {
        const target = models.find((x) => x.id === base && x.vendor === m.vendor);
        if (target) {
          if (target.releasedAt == null && m.releasedAt) target.releasedAt = m.releasedAt;
        }
        (m as RPGModel & { __drop?: boolean }).__drop = true;
      }
    }
    for (let i = models.length - 1; i >= 0; i--) {
      if ((models[i] as RPGModel & { __drop?: boolean }).__drop) models.splice(i, 1);
    }
    const dropped = dated.filter((m) => !models.includes(m)).length;
    if (dropped > 0) console.log(`   日期变体裁决：保留 ${dated.length - dropped} 个独立版本，并入 ${dropped} 个纯快照`);

    // LiveBench 编码均值：仅填充缺 SWE-bench 的模型（不同赛制分数不混算，单独字段）
    if (livebench && livebench.coding.size > 0) {
      let n = 0;
      for (const m of models) {
        if (m.scores.sweBench != null) continue;
        for (const k of candidateKeys(m)) {
          const hit = livebench.coding.get(k);
          if (hit) {
            m.scores.livebenchCoding = hit.score;
            n++;
            break;
          }
        }
      }
      console.log(`   LiveBench 编码补全：${n} 个模型`);
    }

    // OpenRouter 补全：只填缺失的价格/日期，不覆盖已有值
    if (openrouter && openrouter.byKey.size > 0) {
      let filled = 0;
      for (const m of models) {
        for (const k of candidateKeys(m)) {
          const hit = openrouter.byKey.get(k);
          if (!hit) continue;
          let used = false;
          if (m.priceIn == null && hit.priceIn != null && hit.priceIn > 0) { m.priceIn = hit.priceIn; used = true; }
          if (m.priceOut == null && hit.priceOut != null && hit.priceOut > 0) { m.priceOut = hit.priceOut; used = true; }
          if (m.releasedAt == null && hit.created) { m.releasedAt = hit.created; used = true; }
          if (used) filled++;
          break;
        }
      }
      console.log(`   OpenRouter 补全：${filled} 个模型的缺失属性`);
    }
  }

  // ── 组装厂商 ──
  const vendors: RPGVendor[] = VENDOR_DEFS.filter((d) => models.some((m) => m.vendor === d.id)).map((d) => {
    const own = models.filter((m) => m.vendor === d.id);
    let flagship: RPGModel | undefined;
    flagship = own.find((m) => m.scores.eci != null);
    if (flagship) flagship = own.filter((m) => m.scores.eci != null).sort((a, b) => b.scores.eci! - a.scores.eci!)[0];
    else {
      const dated = own.filter((m) => m.releasedAt).sort((a, b) => (a.releasedAt! < b.releasedAt! ? 1 : -1));
      flagship = dated[0] ?? own[0];
    }
    return {
      id: d.id,
      name: d.name,
      en: d.en,
      region: d.region,
      hue: d.hue,
      motto: d.motto,
      modelCount: own.length,
      flagship: flagship?.slug,
    };
  });

  // ── 恶龙判定 ──
  let dragon: DragonInfo | null = null;
  const withEci = models.filter((m) => m.scores.eci != null);
  if (withEci.length > 0) {
    const king = withEci.sort((a, b) => b.scores.eci! - a.scores.eci!)[0];
    dragon = {
      slug: king.slug,
      name: king.name,
      vendor: king.vendor,
      basis: "eci",
      eci: king.scores.eci,
      since: king.releasedAt,
    };
  } else {
    // 透明暂定规则：最新发布 → 上下文更长 → 更便宜；明确标注 provisional
    const provision = [...models].sort((a, b) => {
      const d = (b.releasedAt ?? "").localeCompare(a.releasedAt ?? "");
      if (d !== 0) return d;
      return (b.contextTokens ?? 0) - (a.contextTokens ?? 0) || (a.priceIn ?? 1e9) - (b.priceIn ?? 1e9);
    })[0];
    if (provision) {
      dragon = { slug: provision.slug, name: provision.name, vendor: provision.vendor, basis: "provisional" };
      warnings.push("无任何 ECI 数据，恶龙按暂定规则（最新发布）产生，站点将显示「暂定」标识");
    }
  }

  const snapshot: Snapshot = {
    generatedAt: retrievedAt,
    dragon,
    vendors,
    models,
    stats: {
      vendorCount: vendors.length,
      modelCount: models.length,
      eciCoverage: models.length ? withEci.length / models.length : 0,
      sweBenchCoverage: models.length
        ? models.filter((m) => m.scores.sweBench != null).length / models.length
        : 0,
    },
    sources: {
      "models.dev": { retrievedAt, license: "MIT", note: "https://models.dev" },
      "Epoch AI": { retrievedAt, license: "CC-BY 4.0", note: EPOCH_CITATION },
      "LiveBench": { retrievedAt, license: "Apache-2.0", note: "https://livebench.ai（编码类均值，补全编码能力覆盖）" },
      "OpenRouter": { retrievedAt, license: "公开目录 API", note: "https://openrouter.ai（仅补全缺失价格与上架日期，不覆盖已有值）" },
    },
    warnings,
  };


  // 恶龙历史存档：每次同步记录现任恶龙；换代时留档（供未来编年史做真实换代监测）
  if (dragon) {
    const historyPath = path.join(DATA_DIR, "dragon-history.json");
    let history: Array<{ generatedAt: string; slug: string; name: string; eci: number | null; basis: string }> = [];
    try {
      history = JSON.parse(await fs.readFile(historyPath, "utf8"));
    } catch {
      // 首次运行无存档
    }
    const entry = { generatedAt: retrievedAt, slug: dragon.slug, name: dragon.name, eci: dragon.eci ?? null, basis: dragon.basis };
    const last = history.at(-1);
    if (!last || last.slug !== dragon.slug) {
      history.push(entry);
      await fs.writeFile(historyPath, JSON.stringify(history, null, 2), "utf8");
      console.log(`   恶龙历史存档：${history.length} 条记录${last ? "（检测到换代）" : "（首条）"}`);
    }
  }

  console.log("▶ [4/4] 写出产物 …");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "models.json"), JSON.stringify(snapshot), "utf8");

  // 搜索索引（全量轻条目，前端 MiniSearch 消费）
  const vendorName = new Map(vendors.map((v) => [v.id, v]));
  const searchIndex = models.map((m) => ({
    slug: m.slug,
    name: m.name,
    id: m.id,
    vendor: m.vendor,
    vendorName: vendorName.get(m.vendor)?.name ?? m.vendor,
    region: vendorName.get(m.vendor)?.region ?? "global",
    job: m.job,
    openWeights: m.openWeights,
    releasedAt: m.releasedAt ?? "",
    tags: [...m.modalities.input, ...m.modalities.output, m.openWeights ? "开源" : "闭源", "多模态"].filter(
      (x, i, a) => a.indexOf(x) === i
    ),
  }));
  await fs.writeFile(path.join(PUBLIC_DIR, "search-index.json"), JSON.stringify(searchIndex), "utf8");

  const report = {
    generatedAt: retrievedAt,
    modelCount: models.length,
    vendorCount: vendors.length,
    dragon,
    coverage: snapshot.stats,
    unmatchedEciCount: unmatchedEci.length,
    perVendor: vendors.map((v) => ({ id: v.id, count: v.modelCount, flagship: v.flagship })),
    warnings,
  };
  await fs.writeFile(path.join(DATA_DIR, "sync-report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log(`✅ 快照完成：${models.length} 个勇者 / ${vendors.length} 个门派`);
  console.log(
    `   ECI 覆盖 ${(snapshot.stats.eciCoverage * 100).toFixed(1)}%，SWE-bench 覆盖 ${(snapshot.stats.sweBenchCoverage * 100).toFixed(1)}%`
  );
  console.log(`   现任恶龙：${dragon ? `${dragon.name}（${dragon.basis === "eci" ? `ECI ${dragon.eci}` : "暂定"}）` : "无"}`);
  for (const w of warnings) console.log(`   ⚠ ${w}`);
}

main().catch((e) => {
  console.error("❌ sync 失败：", e);
  process.exit(1);
});
