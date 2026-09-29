// LiveBench 数据源（Apache-2.0）：编码能力补全。
// 榜单 CSV 由 livebench.github.io 仓库托管（public/table_<release>.csv，下划线日期）。
// 宽表：每列一个任务；编码类 = code_completion/code_generation/javascript/python/typescript 均值。
// 模型名带 "-thinking-64k-high-effort" 之类的推理档后缀，需剥除后再匹配。
import { promises as fs } from "node:fs";
import { csvToObjects } from "../lib/csv";
import { normKey } from "../lib/ids";

const RELEASES = [
  "2026-06-25", "2026-01-08", "2025-12-23", "2025-11-25", "2025-05-30",
  "2025-04-25", "2025-04-02", "2024-11-25", "2024-08-31",
];
const CODING_COLS = ["code_completion", "code_generation", "javascript", "python", "typescript"];

const RAW_URL = (rel: string) =>
  `https://raw.githubusercontent.com/LiveBench/livebench.github.io/main/public/table_${rel.replaceAll("-", "_")}.csv`;

/** 剥除推理档后缀：-thinking-64k-high-effort → 基础名 */
function stripReasoningSuffix(name: string): string {
  let parts = name.split("-");
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^(thinking|high|low|medium|effort|\d+k)$/i.test(parts[i])) parts = parts.slice(0, i);
    else break;
  }
  return parts.join("-");
}

export interface LiveBenchData {
  coding: Map<string, { score: number; release: string }>;
  release: string;
}

export async function fetchLiveBench(): Promise<{ data: LiveBenchData; warnings: string[] }> {
  const warnings: string[] = [];
  const data: LiveBenchData = { coding: new Map(), release: "" };

  for (const release of RELEASES) {
    const rows = await fetchTable(release);
    if (rows.length === 0) continue;
    data.release = release;
    for (const r of rows) {
      const name = r["model"];
      if (!name) continue;
      const vals = CODING_COLS.map((c) => parseFloat(r[c])).filter((v) => Number.isFinite(v));
      if (vals.length < 3) continue; // 编码列缺失过半则不采信
      const coding = vals.reduce((a, b) => a + b, 0) / vals.length;
      for (const key of [normKey(name), normKey(stripReasoningSuffix(name))]) {
        if (key && !data.coding.has(key)) data.coding.set(key, { score: Math.round(coding * 10) / 10, release });
      }
    }
    break; // 只要最新成功的 release
  }

  if (data.coding.size === 0) warnings.push("LiveBench: 未取到任何榜单行");
  return { data, warnings };
}

async function fetchTable(release: string): Promise<Record<string, string>[]> {
  // 优先 raw（用户本机通常可达），失败回落 GitHub contents API（沙箱可达）
  try {
    const res = await fetch(RAW_URL(release), { headers: { "user-agent": "model-quest-sync/0.1" } });
    if (res.ok) return csvToObjects(await res.text());
  } catch {
    // 落入 fallback
  }
  try {
    const api = `https://api.github.com/repos/LiveBench/livebench.github.io/contents/public/table_${release.replaceAll("-", "_")}.csv`;
    const res = await fetch(api, { headers: { "user-agent": "model-quest-sync/0.1" } });
    if (!res.ok) return [];
    const j = (await res.json()) as { content?: string; encoding?: string };
    if (j.encoding !== "base64" || !j.content) return [];
    return csvToObjects(Buffer.from(j.content, "base64").toString("utf8"));
  } catch {
    return [];
  }
}

// 供本地调试：npx tsx scripts/sync/sources/livebench.ts
if (process.argv[1]?.includes("livebench")) {
  fetchLiveBench().then(async ({ data }) => {
    console.log(`release=${data.release} rows=${data.coding.size}`);
    const fs2 = await import("node:fs");
    void fs2;
    for (const [k, v] of [...data.coding].slice(0, 8)) console.log(" ", k, "→", v.score);
  });
}
