// Epoch AI Benchmarking Hub 数据源（CC-BY 4.0，需署名）。
// 下载 benchmark_data.zip，内存解压，读取：
//   - epoch_capabilities_index/eci_scores.csv → 综合能力指数（恶龙判定依据）
//   - swe_bench_verified.csv → 编程
//   - gpqa_diamond.csv / otis_mock_aime_*.csv / math_level_5.csv → 学科战绩
// 上游改列名/文件名时降级为该项缺失，不整段崩掉。

import { unzipSync } from "fflate";
import { csvToObjects } from "../lib/csv";
import { normKey } from "../lib/ids";

const EPOCH_ZIP_URL = "https://epoch.ai/data/benchmark_data.zip";
export const EPOCH_CITATION =
  "Epoch AI, 'Capabilities & benchmarking'. https://epoch.ai/benchmarks (CC-BY 4.0)";

export interface EpochBenchVal {
  score: number;
  date?: string;
}

export interface EpochData {
  eci: Map<string, { score: number; date?: string; org?: string }>;
  sweBench: Map<string, EpochBenchVal>;
  gpqa: Map<string, EpochBenchVal>;
  aime: Map<string, EpochBenchVal>;
  mathLevel5: Map<string, EpochBenchVal>;
  rowCount: number;
}

function pick(
  rows: Record<string, string>[],
  nameCols: string[],
  scoreCols: string[]
): Array<{ key: string; score: number; date?: string }> {
  const out: Array<{ key: string; score: number; date?: string }> = [];
  for (const r of rows) {
    const nameCol = nameCols.find((c) => r[c]);
    if (!nameCol) continue;
    const scoreCol = scoreCols.find((c) => r[c] !== "" && r[c] != null);
    if (!scoreCol) continue;
    let v = parseFloat(r[scoreCol]);
    if (!Number.isFinite(v)) continue;
    v = v <= 1 ? v * 100 : v; // fraction 列统一乘百；已是百分数/指数的原样保留
    out.push({
      key: normKey(r[nameCol]),
      score: Math.round(v * 100) / 100,
      date: r["Release date"] || r["date"] || undefined,
    });
  }
  return out;
}

export async function fetchEpoch(): Promise<{ data: EpochData; warnings: string[] }> {
  const warnings: string[] = [];
  const res = await fetch(EPOCH_ZIP_URL, { headers: { "user-agent": "model-quest-sync/0.1" } });
  if (!res.ok) throw new Error(`Epoch ZIP HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const files = unzipSync(buf);

  const readCsv = (name: string): Record<string, string>[] => {
    for (const [fname, content] of Object.entries(files)) {
      if (fname.toLowerCase() === name.toLowerCase()) return csvToObjects(new TextDecoder().decode(content));
    }
    // 宽松兜底：按正则找
    for (const [fname, content] of Object.entries(files)) {
      if (new RegExp(name.replace(/[.]/g, "\\."), "i").test(fname)) return csvToObjects(new TextDecoder().decode(content));
    }
    return [];
  };

  const data: EpochData = {
    eci: new Map(),
    sweBench: new Map(),
    gpqa: new Map(),
    aime: new Map(),
    mathLevel5: new Map(),
    rowCount: 0,
  };
  // ECI：新格式在 epoch_capabilities_index/ 下，列名小写 eci
  const eciRows =
    readCsv("eci_scores.csv").length > 0 ? readCsv("eci_scores.csv") : readCsv("epoch_capabilities_index.csv");
  for (const r of eciRows) {
    const name = r["Model"] || r["Display name"];
    const v = parseFloat(r["eci"] ?? r["ECI Score"] ?? r["ECI"] ?? r["Score"] ?? "");
    if (!name || !Number.isFinite(v)) continue;
    data.eci.set(normKey(name), {
      score: Math.round(v * 100) / 100,
      date: r["date"] || undefined,
      org: r["Organization"] || undefined,
    });
  }
  if (data.eci.size === 0) warnings.push("Epoch: 未解析到任何 ECI 行");

  const benchSpecs: Array<[Map<string, EpochBenchVal>, string[], string[]]> = [
    [data.sweBench, ["swe_bench_verified"], ["Model version", "Model", "model_group", "Display name"]],
    [data.gpqa, ["gpqa_diamond"], ["Model version", "Model", "model_group", "Display name"]],
    [data.aime, ["otis_mock_aime"], ["Model version", "Model", "model_group", "Display name"]],
    [data.mathLevel5, ["math_level_5"], ["Model version", "Model", "model_group", "Display name"]],
  ];
  for (const [target, fileHints, nameCols] of benchSpecs) {
    const rows = fileHints.map((f) => readCsv(f)).find((r) => r.length > 0) ?? [];
    const scoreCols = ["mean_score", "Best score (across scorers)", "Score", "resolved"];
    for (const row of pick(rows, nameCols, scoreCols)) {
      // 同键多条取最高（不同 scorer/effort 档）
      const prev = target.get(row.key);
      if (prev == null || row.score > prev.score) {
        target.set(row.key, { score: row.score, date: row.date });
      }
    }
    data.rowCount += rows.length;
  }

  return { data, warnings };
}
