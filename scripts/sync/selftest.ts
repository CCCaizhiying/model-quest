// 管线纯函数自检：npm run check
// 覆盖名称归一化、职业分类、参数解析、CSV 解析、日期快照去重等关键规则。

import { parseCsv } from "./lib/csv";
import { classifyJob, normKey, paramTier, parseParamsB, priceTier } from "./lib/ids";
import { variantsOf } from "./lib/match";
import { freshnessFactor, compositeScore } from "../../src/lib/rank";
import type { RPGModel } from "../../src/lib/types";

function fake(over: Partial<RPGModel>): RPGModel {
  return {
    slug: "t", id: "t", name: "T", vendor: "v", releasedAt: undefined,
    contextTokens: undefined, priceIn: undefined, priceOut: undefined,
    openWeights: false, job: "warrior", reasoning: false, toolCall: false,
    modalities: { input: ["text"], output: ["text"] }, paramTier: "unknown",
    scores: {}, confidence: { eci: "unknown", sweBench: "unknown" }, ...over,
  };
}
const NOW = "2026-09-28T00:00:00Z";

let pass = 0;
let fail = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    pass++;
  } else {
    fail++;
    console.error(`✗ ${label}\n   期望 ${b}\n   实际 ${a}`);
  }
}

// ── 匹配变体：日期快照与 preview 后缀 ──
eq(variantsOf("deepseekv4pro0813"), ["deepseekv4pro0813", "deepseekv4pro"], "变体：MMDD 日期剥离");
eq(variantsOf("grok43beta").includes("grok43"), true, "变体：beta 后缀剥离");
eq(variantsOf("gemini31pro").includes("gemini31pro"), true, "变体：原名保留");
eq(variantsOf("grok420"), ["grok420"], "变体：非日期 4 位数字不剥（Grok 4.20）");

// ── normKey：models.dev 与 Epoch 展示名同键 ──
eq(normKey("claude-opus-4-5"), normKey("Claude Opus 4.5"), "normKey claude opus 4.5");
eq(normKey("gpt-5.5-pro"), normKey("GPT-5.5 Pro"), "normKey gpt 5.5 pro");
eq(normKey("glm-5.2"), normKey("GLM-5.2"), "normKey glm 5.2");
eq(normKey("deepseek-v4-pro_max"), normKey("deepseek-v4-pro"), "normKey 去 effort 后缀 _max");
eq(normKey("qwen3.7-max"), normKey("Qwen3.7-Max"), "normKey qwen max（-max 是档位不能删）");
eq(normKey("Kimi K3"), normKey("kimi-k3"), "normKey kimi");
eq(normKey("Claude Haiku 4.5 (latest)"), normKey("claude-haiku-4-5"), "normKey 去括注 (latest)");
eq(normKey("MiniMax M3"), normKey("MiniMax-M3"), "normKey minimax");

// ── classifyJob：模态 → 职业 ──
eq(classifyJob({ id: "gpt-5", name: "GPT-5", modalities: { input: ["text"], output: ["text"] } }), "warrior", "纯文本=战士");
eq(
  classifyJob({ id: "gemini-x", name: "Gemini X", modalities: { input: ["text", "image", "audio"], output: ["text"] } }),
  "spellblade",
  "三进一出=魔剑士"
);
eq(
  classifyJob({ id: "vl", name: "VL", modalities: { input: ["text", "image"], output: ["text"] } }),
  "archer",
  "图文进=弓手"
);
eq(classifyJob({ id: "img", name: "Img", modalities: { input: ["text"], output: ["image"] } }), "painter", "出图=画师");
eq(classifyJob({ id: "vid", name: "Vid", modalities: { input: ["text"], output: ["video"] } }), "illusionist", "出视频=幻术师");
eq(classifyJob({ id: "tts", name: "TTS", modalities: { input: ["text"], output: ["audio"] } }), "bard", "出语音=吟游诗人");
eq(classifyJob({ id: "text-embedding-3", name: "Embedding", modalities: { output: ["embedding"] } }), "runecaster", "嵌入=符文师");

// ── 参数解析与档位 ──
eq(parseParamsB("qwen3-235b-a22b-instruct", "Qwen3 235B"), 235, "解析 235b");
eq(parseParamsB("llama-3.3-70b-instruct", "Llama 3.3 70B"), 70, "解析 70b");
eq(parseParamsB("gpt-5.5-pro", "GPT-5.5 Pro"), undefined, "闭源无名参数=unknown");
eq(paramTier(1.5), "nano", "<4B=nano");
eq(paramTier(70), "mid", "70B=mid");
eq(paramTier(undefined), "unknown", "undefined=unknown");

// ── 价格档位（披风） ──
eq(priceTier(0.15, 0.6), 3, "极便宜=传说披风");
eq(priceTier(60, 120), 0, "贵族=无披风");
eq(priceTier(undefined, undefined), 0, "无价格=无披风");

// ── CSV 解析 ──
const csv = parseCsv('a,b,c\n"1,5",2,"he said ""hi"""\n3,4,5');
eq(csv[1][0], "1,5", "CSV 引号内逗号");
eq(csv[1][2], 'he said "hi"', "CSV 双引号转义");
eq(csv.length, 3, "CSV 行数");

// ── 新鲜度与综合战力 ──
const fresh = fake({ releasedAt: "2026-09-01" });
const old1y = fake({ releasedAt: "2025-06-01" });
const old2y = fake({ releasedAt: "2020-06-01" });
const noDate = fake({});
eq(freshnessFactor(fresh, NOW), 1, "新鲜度：6 个月内 = 1.0");
eq(Math.round(freshnessFactor(old1y, NOW) * 1000) / 1000, 0.765, "新鲜度：约 16 个月前 = 0.85^(9.9/6)");
eq(freshnessFactor(old2y, NOW), 0.4, "新鲜度：极老模型触底 0.4");
eq(freshnessFactor(noDate, NOW), 0.6, "新鲜度：无日期 = 0.6");
const cFull = fake({ releasedAt: "2026-09-01", contextTokens: 400000, scores: { eci: 160, sweBench: 90 } });
eq(compositeScore(cFull, NOW), 90, "综合战力：全项满配");
const cNoSword = fake({ releasedAt: "2026-09-01", contextTokens: 400000, scores: { eci: 160 } });
eq(compositeScore(cNoSword, NOW), 91, "综合战力：缺剑术重分配");
eq(compositeScore(fake({ releasedAt: "2026-09-01" }), NOW), null, "综合战力：全缺 = null");
console.log(`\n自检结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
