// 门派徽标下载：npx tsx scripts/sync/logos.ts
// 从 simple-icons（CC0 许可）拉取品牌图标，注入白色填充后存入 public/logos/{vendor}.svg。
// 拉取失败的门派在站点上回退为程序化像素徽章（BrandLogo 组件处理），不影响构建。
import { promises as fs } from "node:fs";
import path from "node:path";
import { VENDOR_DEFS, type VendorDef } from "../../src/data/vendor-registry";

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "public", "logos");
const CDN = (slug: string) => `https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${slug}.svg`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 每个门派的候选 slug：依次尝试（不同 simple-icons 版本收录名不同） */
const CANDIDATES: Record<string, string[]> = {
  mistral: ["mistralai"],
  amazon: ["amazonaws", "aws"],
  ibm: ["ibm"],
  cohere: ["cohere"],
  deepseek: ["deepseek"],
  xai: ["xai", "grok"],
  zhipuai: ["zai", "zhipuai"],
  moonshotai: ["moonshotai", "kimi"],
  tencent: ["tencent", "tencentcloud"],
};

function slugsOf(v: VendorDef): string[] {
  const first = v.icon ? [v.icon] : [];
  return [...new Set([...first, ...(CANDIDATES[v.id] ?? [])])].filter(Boolean);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const ok: string[] = [];
  const miss: string[] = [];

  for (const v of VENDOR_DEFS) {
    const outPath = path.join(OUT_DIR, `${v.id}.svg`);
    const candidates = slugsOf(v);
    if (candidates.length === 0) {
      miss.push(v.id);
      continue;
    }
    let written = false;
    for (const slug of candidates) {
      for (let attempt = 0; attempt < 2 && !written; attempt++) {
        try {
          const res = await fetch(CDN(slug), { headers: { "user-agent": "model-quest-sync/0.1" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          let svg = await res.text();
          // 注入白色填充（simple-icons 默认黑色，深色底上不可见）
          svg = svg.replace("<svg ", '<svg fill="#ffffff" ');
          await fs.writeFile(outPath, svg, "utf8");
          ok.push(`${v.id}(${slug})`);
          written = true;
        } catch {
          await sleep(600);
        }
      }
    }
    if (!written) {
      try {
        await fs.access(outPath);
        ok.push(`${v.id} (cached)`);
      } catch {
        miss.push(v.id);
      }
    }
    await sleep(300);
  }

  console.log(`✅ 徽标就绪：${ok.length} 个（${ok.join(" ")}）`);
  if (miss.length) console.log(`⚠ 无官方图标，站点回退像素徽章：${miss.join(" ")}`);
}

main().catch((e) => {
  console.error("❌ 徽标下载失败：", e);
  process.exit(1);
});
