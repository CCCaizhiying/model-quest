// 评测条目 → 本地模型的模糊匹配器。
// 三级策略：
//   1) 归一化键精确匹配
//   2) 剥离变体后缀（beta/preview/日期快照等）后精确匹配
//   3) 前缀匹配 + 长度差最小 + 基准日期就近消歧（唯一才接受，绝不瞎猜）
// 例：ECI 'deepseek-v4-pro-0813' → 剥日期 → deepseek-v4-pro ✓
//     ECI 'Gemini 3.1 Pro'      → 剥 preview → 前缀命中 gemini-3.1-pro-preview ✓
//     ECI 'Grok 4'              → 前缀命中 grok-4.5/4.6/4.7…多义且无法消歧 → 放弃 ✓

export interface MatchEntry {
  key: string; // normKey 后的原始键
  date?: string; // 基准记录日期（YYYY-MM-DD），用于消歧
}

const SUFFIX_WORDS = /(beta|preview|experimental|snapshot|latest|official|customtools|external)+$/;
const MMDD = /(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;

export function variantsOf(key: string): string[] {
  const out = [key];
  const v1 = key.replace(SUFFIX_WORDS, "");
  if (v1 && v1 !== key) out.push(v1);
  const v2 = v1.replace(MMDD, "").replace(/\d{8}$/, "");
  if (v2 && !out.includes(v2)) out.push(v2);
  return out;
}

export interface MatchResult<T> {
  target: T;
  score: number;
  date?: string;
}

/** entries：一条评测一行；getDate：模型侧发布日期（消歧用） */
export function matchScores<T>(
  entries: Array<MatchEntry & { score: number }>,
  index: Map<string, T>,
  getDate: (t: T) => string | undefined
): { results: MatchResult<T>[]; unmatched: Array<MatchEntry & { score: number }> } {
  const results: MatchResult<T>[] = [];
  const unmatched: Array<MatchEntry & { score: number }> = [];

  // 预排序候选键，加速前缀查找
  const allKeys = [...index.keys()].sort();

  for (const entry of entries) {
    let matched: { target: T } | null = null;

    for (const v of variantsOf(entry.key)) {
      // 1) 精确
      const exact = index.get(v);
      if (exact) {
        matched = { target: exact };
        break;
      }
      // 3) 前缀候选：正向（模型键以评测键开头，Gemini-3.1-Pro-Preview ⊃ gemini31pro）
      //            反向（评测键以模型键开头，DeepSeek-V3.2-Exp ⊃ deepseekv32）
      const cands: string[] = [];
      for (const k of allKeys) {
        const fwd = k.length > v.length && k.startsWith(v) && k.length - v.length <= 24;
        const rev = v.length > k.length && k.length >= 5 && v.startsWith(k) && v.length - k.length <= 24;
        if (fwd || rev) cands.push(k);
      }
      if (cands.length === 1) {
        matched = { target: index.get(cands[0])! };
        break;
      }
      if (cands.length > 1 && entry.date) {
        // 长度差最小优先；再以日期就近消歧（唯一最近才接受）
        const minLen = Math.min(...cands.map((c) => c.length));
        let finalists = cands.filter((c) => c.length === minLen);
        if (finalists.length > 1) {
          const t = new Date(entry.date).getTime();
          const byDist = finalists
            .map((c) => {
              const d = getDate(index.get(c)!);
              return { c, dist: d ? Math.abs(new Date(d).getTime() - t) : Number.MAX_SAFE_INTEGER };
            })
            .sort((a, b) => a.dist - b.dist);
          const min = byDist[0].dist;
          const within = byDist.filter((x) => x.dist === min);
          if (min < 200 * 86400_000 && within.length === 1) finalists = [within[0].c];
        }
        if (finalists.length === 1) {
          matched = { target: index.get(finalists[0])! };
          break;
        }
      }
    }

    if (matched) results.push({ target: matched.target, score: entry.score, date: entry.date });
    else unmatched.push(entry);
  }
  return { results, unmatched };
}
