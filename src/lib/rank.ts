// 榜单与能力条计算：全部由快照数据确定性推导，无人工干预。
import type { RPGModel, RPGVendor, Snapshot } from "./types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** 付费模型：输入价存在且 > 0（免费模型不参加最便宜/最划算赛制） */
function isPaid(m: RPGModel): boolean {
  return m.priceIn != null && m.priceIn > 0;
}

/** 平局规则：数值相同时，最新发布者优先（保证榜单时效性），再比上下文，最后按名字兜底 */
function newerFirst(a: RPGModel, b: RPGModel): number {
  const d = (b.releasedAt ?? "").localeCompare(a.releasedAt ?? "");
  if (d !== 0) return d;
  return (b.contextTokens ?? 0) - (a.contextTokens ?? 0) || a.name.localeCompare(b.name);
}

/**
 * 新鲜度系数：近 6 个月发布 = 1.0，每早 6 个月 ×0.85，下限 0.4。
 * 无发布日期的模型按 0.6 处理。用于榜单时效加权与综合战力。
 */
export function freshnessFactor(m: RPGModel, generatedAt: string): number {
  if (!m.releasedAt) return 0.6;
  const monthsOld = (new Date(generatedAt).getTime() - new Date(m.releasedAt).getTime()) / (30.44 * 86400_000);
  if (monthsOld <= 6) return 1;
  return Math.max(0.4, Math.pow(0.85, (monthsOld - 6) / 6));
}

/** 全大陆 ECI 中位数（有实测者），作为最划算赛的能力门槛 */
export function medianEci(snap: Snapshot): number {
  const eci = snap.models.map((m) => m.scores.eci).filter((v): v is number => v != null).sort((a, b) => a - b);
  if (eci.length === 0) return 0;
  const mid = Math.floor(eci.length / 2);
  return eci.length % 2 ? eci[mid] : (eci[mid - 1] + eci[mid]) / 2;
}

/** 四维归一值（0-1）：攻击=ECI、剑术=SWE-bench、体力=上下文对数、幸运=价格反比 */
function coreBars(m: RPGModel): Array<{ key: "atk" | "sword" | "hp" | "luck"; value: number | null }> {
  const atk = m.scores.eci != null ? clamp01((m.scores.eci - 60) / 110) : null;
  // 编码能力：优先 SWE-bench，缺则用 LiveBench 编码均值补全（两榜同为百分制，来源标注于战绩表）
  const codeScore = m.scores.sweBench ?? m.scores.livebenchCoding;
  const sword = codeScore != null ? clamp01(codeScore / 100) : null;
  const hp = m.contextTokens ? clamp01(Math.log10(m.contextTokens) / Math.log10(2_000_000)) : null;
  const p = m.priceIn ?? m.priceOut;
  const luck =
    p != null
      ? clamp01(1 - (Math.log10(p + 0.05) - Math.log10(0.05)) / (Math.log10(200) - Math.log10(0.05)))
      : null;
  return [
    { key: "atk", value: atk },
    { key: "sword", value: sword },
    { key: "hp", value: hp },
    { key: "luck", value: luck },
  ];
}

/**
 * 综合战力（0-100）：0.6×攻击 + 0.25×剑术 + 0.15×体力，缺项权重重分配，
 * 再乘新鲜度系数。恶龙判定仍以纯 ECI 为准，此分用于横向比较。
 */
export function compositeScore(m: RPGModel, generatedAt: string): number | null {
  const weights: Record<string, number> = { atk: 0.6, sword: 0.25, hp: 0.15 };
  let sum = 0;
  let wsum = 0;
  for (const b of coreBars(m)) {
    const w = weights[b.key];
    if (w == null || b.value == null) continue;
    sum += w * b.value;
    wsum += w;
  }
  if (wsum === 0) return null;
  return Math.round((sum / wsum) * freshnessFactor(m, generatedAt) * 100);
}

export interface Ability {
  key: "atk" | "sword" | "hp" | "luck" | "comp";
  label: string;
  color: string;
  /** 0-1，null = 数据缺失（显示？？？） */
  value: number | null;
}

/** 五维能力条：四维 + 综合战力（与勇者卡同款） */
export function abilityBars(m: RPGModel, generatedAt?: string): Ability[] {
  const gen = generatedAt ?? new Date().toISOString();
  const byKey = new Map(coreBars(m).map((b) => [b.key, b.value]));
  return [
    { key: "atk", label: "攻击", color: "#e04848", value: byKey.get("atk") ?? null },
    { key: "sword", label: "剑术", color: "#58a8e8", value: byKey.get("sword") ?? null },
    { key: "hp", label: "体力", color: "#58c878", value: byKey.get("hp") ?? null },
    { key: "luck", label: "幸运", color: "#f8c848", value: byKey.get("luck") ?? null },
    { key: "comp", label: "战力", color: "#b088e8", value: compositeScore(m, gen) },
  ];
}

// ── 武斗大会（榜单）───────────────────────────────
export interface BoardDef {
  id: string;
  name: string;
  subtitle: string;
  note: string;
}

export const BOARDS: BoardDef[] = [
  { id: "total", name: "综合智力", subtitle: "龙王争夺战", note: "以 Epoch AI 综合能力指数（ECI）排座次，仅收录实测模型；同分以最新发布者优先，排序已乘新鲜度系数" },
  { id: "sword", name: "编程武斗会", subtitle: "SWE-bench Verified", note: "真实仓库修 bug 实测，百分制；同分以最新发布者优先，排序已乘新鲜度系数，不同赛制分数不可混算" },
  { id: "value", name: "最划算大会", subtitle: "每一美元换多少智力", note: "ECI ÷ 输入价，乘新鲜度系数；仅付费、实测且 ECI 达全大陆中位数的模型参赛——便宜且够用才是划算" },
  { id: "hp", name: "耐力试炼", subtitle: "上下文长度", note: "比谁记得住（最大上下文窗口）；同长度以最新发布者优先，排序已乘新鲜度系数" },
  { id: "luck", name: "平民英雄会", subtitle: "付费中最便宜", note: "输入价升序（老模型按新鲜度折算后退）；免费模型与嵌入类符文师不参赛" },
  { id: "newest", name: "新秀登场", subtitle: "最新发布", note: "以发布日期定先后，初出茅庐的新勇者" },
  { id: "composite", name: "综合战力", subtitle: "智力·编程·耐力加成", note: "0.6×攻击 + 0.25×剑术 + 0.15×体力（缺项权重重分配），乘新鲜度系数；恶龙判定仍以纯 ECI 为准" },
];

export interface BoardRow {
  model: RPGModel;
  vendor: RPGVendor;
  /** 榜单数值的展示文本 */
  display: string;
  /** 归一化 0-1，用于条形 */
  bar: number | null;
}

function fmtContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function fmtModelContext(m: RPGModel): string {
  return m.contextTokens ? fmtContext(m.contextTokens) : "？？？";
}

export function fmtPrice(m: RPGModel): string {
  const p = m.priceIn;
  if (p == null) return "？？？";
  if (p === 0) return "免费";
  if (p < 0.1) return `$${p.toFixed(3)}`;
  if (p < 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(p < 10 ? 2 : 1)}`;
}

/** 计算某榜单的行（排序 + 数值展示） */
export function boardRows(board: BoardDef, snap: Snapshot): BoardRow[] {
  const vendorOf = (m: RPGModel) => snap.vendors.find((v) => v.id === m.vendor)!;
  const rows = snap.models.map((m) => ({ m, v: vendorOf(m) }));
  const f = (m: RPGModel) => freshnessFactor(m, snap.generatedAt);

  switch (board.id) {
    case "total": {
      const withE = rows
        .filter((r) => r.m.scores.eci != null)
        .sort((a, b) => b.m.scores.eci! * f(b.m) - a.m.scores.eci! * f(a.m) || newerFirst(a.m, b.m));
      const max = withE[0]?.m.scores.eci ?? 1;
      const min = withE.at(-1)?.m.scores.eci ?? 0;
      return withE.map((r) => ({
        model: r.m,
        vendor: r.v,
        display: r.m.scores.eci!.toFixed(1),
        bar: max > min ? clamp01((r.m.scores.eci! - min) / (max - min)) : 1,
      }));
    }
    case "sword": {
      const withS = rows
        .filter((r) => r.m.scores.sweBench != null)
        .sort((a, b) => b.m.scores.sweBench! * f(b.m) - a.m.scores.sweBench! * f(a.m) || newerFirst(a.m, b.m));
      return withS.map((r) => ({
        model: r.m,
        vendor: r.v,
        display: `${r.m.scores.sweBench!.toFixed(1)}%`,
        bar: clamp01(r.m.scores.sweBench! / 100),
      }));
    }
    case "value": {
      // 中位数能力门槛：「便宜且够用」才有意义；得分 × 新鲜度
      const gate = medianEci(snap);
      const withV = rows
        .filter((r) => r.m.scores.eci != null && isPaid(r.m) && r.m.scores.eci! >= gate)
        .map((r) => ({ ...r, val: (r.m.scores.eci! / r.m.priceIn!) * f(r.m) }))
        .sort((a, b) => b.val - a.val || newerFirst(a.m, b.m));
      const max = withV[0]?.val ?? 1;
      return withV.map((r) => ({
        model: r.m,
        vendor: r.v,
        display: `${r.val.toFixed(0)} 分/$`,
        bar: clamp01(r.val / max),
      }));
    }
    case "hp": {
      const withC = rows
        .filter((r) => r.m.contextTokens)
        .sort((a, b) => b.m.contextTokens! * f(b.m) - a.m.contextTokens! * f(a.m) || newerFirst(a.m, b.m));
      const max = withC[0]?.m.contextTokens ?? 1;
      return withC.map((r) => ({
        model: r.m,
        vendor: r.v,
        display: `${fmtContext(r.m.contextTokens!)} tokens`,
        bar: clamp01(Math.log10(r.m.contextTokens!) / Math.log10(max)),
      }));
    }
    case "luck": {
      // 时效加权：老模型身价除以新鲜度（越老越靠后）
      const withP = rows
        .filter((r) => isPaid(r.m) && r.m.job !== "runecaster")
        .sort((a, b) => a.m.priceIn! / f(a.m) - b.m.priceIn! / f(b.m) || newerFirst(a.m, b.m));
      const max = withP[0]?.m.priceIn ?? 1;
      return withP.map((r) => ({
        model: r.m,
        vendor: r.v,
        display: fmtPrice(r.m),
        bar: clamp01(1 - r.m.priceIn! / Math.max(max, 1)),
      }));
    }
    case "newest": {
      const dated = rows.filter((r) => r.m.releasedAt).sort((a, b) => newerFirst(a.m, b.m));
      return dated.map((r) => ({
        model: r.m,
        vendor: r.v,
        display: r.m.releasedAt!,
        bar: 1,
      }));
    }
    case "composite": {
      const withC = rows
        .map((r) => ({ r, comp: compositeScore(r.m, snap.generatedAt) }))
        .filter((x) => x.comp != null)
        .sort((a, b) => b.comp! - a.comp! || newerFirst(a.r.m, b.r.m));
      return withC.map(({ r, comp }) => ({
        model: r.m,
        vendor: r.v,
        display: String(comp),
        bar: clamp01(comp! / 100),
      }));
    }
    default:
      return [];
  }
}

/** 首页维度挑战者卡（含一句话概要，全部由数据推导） */
export interface Challenger {
  title: string;
  boardId: string;
  model: RPGModel;
  vendor: RPGVendor;
  display: string;
  note: string;
}

export function challengers(snap: Snapshot): Challenger[] {
  const vendorOf = (m: RPGModel) => snap.vendors.find((v) => v.id === m.vendor)!;
  const f = (m: RPGModel) => freshnessFactor(m, snap.generatedAt);

  const eciRanked = snap.models
    .filter((m) => m.scores.eci != null)
    .sort((a, b) => b.scores.eci! - a.scores.eci!);
  const eciRankOf = (m: RPGModel): number | null => {
    const i = eciRanked.findIndex((x) => x.slug === m.slug);
    return i < 0 ? null : i + 1;
  };
  const atkDesc = (m: RPGModel): string => {
    const r = eciRankOf(m);
    return r != null ? `全大陆攻击第 ${r} 名` : "攻击尚未实测";
  };
  const daysStr = (m: RPGModel): string | null => {
    if (!m.releasedAt) return null;
    const d = Math.floor((new Date(snap.generatedAt).getTime() - new Date(m.releasedAt).getTime()) / 86400_000);
    return d >= 0 ? `${d} 天前` : null;
  };

  const best = (
    title: string,
    boardId: string,
    pick: (ms: RPGModel[]) => RPGModel | undefined,
    show: (m: RPGModel) => string,
    note: (m: RPGModel) => string
  ): Challenger | null => {
    const m = pick(snap.models);
    if (!m) return null;
    return { title, boardId, model: m, vendor: vendorOf(m), display: show(m), note: note(m) };
  };

  const gate = medianEci(snap);
  const out = [
    best(
      "最划算",
      "value",
      (ms) =>
        ms
          .filter((m) => m.scores.eci != null && isPaid(m) && m.scores.eci! >= gate)
          .map((m) => ({ m, val: (m.scores.eci! / m.priceIn!) * f(m) }))
          .sort((a, b) => b.val - a.val || newerFirst(a.m, b.m))[0]?.m,
      (m) => `${((m.scores.eci! / m.priceIn!) * f(m)).toFixed(0)} 分/$`,
      (m) => `每 1 美元换 ${Math.round((m.scores.eci! / m.priceIn!) * f(m))} 分智力（时效加权），${atkDesc(m)}`
    ),
    best(
      "最会编程",
      "sword",
      (ms) =>
        ms
          .filter((m) => m.scores.sweBench != null)
          .sort((a, b) => b.scores.sweBench! * f(b) - a.scores.sweBench! * f(a) || newerFirst(a, b))[0],
      (m) => `SWE-bench ${m.scores.sweBench!.toFixed(1)}%`,
      (m) => `修 bug 实测全大陆第一，${atkDesc(m)}`
    ),
    best(
      "记性最好",
      "hp",
      (ms) =>
        ms
          .filter((m) => m.contextTokens)
          .sort((a, b) => b.contextTokens! * f(b) - a.contextTokens! * f(a) || newerFirst(a, b))[0],
      (m) => `${fmtContext(m.contextTokens!)} tokens`,
      (m) => `全大陆最能记的勇者，一次读完${m.contextTokens! >= 1_000_000 ? "整库文档" : "长篇巨著"}`
    ),
    best(
      "最便宜",
      "luck",
      (ms) =>
        ms
          .filter((m) => isPaid(m) && m.job !== "runecaster")
          .sort((a, b) => a.priceIn! / f(a) - b.priceIn! / f(b) || newerFirst(a, b))[0],
      (m) => `${fmtPrice(m)} / M tokens`,
      (m) => `付费勇者中身价最低，${atkDesc(m)}`
    ),
    best(
      "最新登场",
      "newest",
      (ms) => ms.filter((m) => m.releasedAt).sort((a, b) => newerFirst(a, b))[0],
      (m) => `${m.releasedAt} 降临`,
      (m) => `${daysStr(m) ?? "刚刚"}踏入大陆的新人，${atkDesc(m)}`
    ),
    best(
      "开源最强",
      "open",
      (ms) =>
        ms
          .filter((m) => m.openWeights && m.scores.eci != null)
          .sort((a, b) => b.scores.eci! - a.scores.eci! || newerFirst(a, b))[0],
      (m) => `ECI ${m.scores.eci!.toFixed(1)} · 开源`,
      (m) => `开源义军统帅，${atkDesc(m)}，权重公开可自部署`
    ),
    best(
      "国产最强",
      "cn",
      (ms) =>
        ms
          .filter((m) => m.scores.eci != null && snap.vendors.find((v) => v.id === m.vendor)?.region === "cn")
          .sort((a, b) => b.scores.eci! - a.scores.eci! || newerFirst(a, b))[0],
      (m) => `ECI ${m.scores.eci!.toFixed(1)} · 东土大陆`,
      (m) => `东土大陆之冠，${atkDesc(m)}`
    ),
  ].filter((x): x is Challenger => x != null);
  return out;
}

/** 恶龙在位天数 */
export function daysOnThrone(m: RPGModel, snap: Snapshot): number | null {
  if (!m.releasedAt) return null;
  const d = Math.floor((new Date(snap.generatedAt).getTime() - new Date(m.releasedAt).getTime()) / 86400_000);
  return d >= 0 ? d : null;
}

/** 恶龙换代事件（依据各模型评测日期回放推演：ECI 严格超越现任者即屠龙登基） */
export interface DragonEvent {
  date: string;
  dragon: RPGModel;
  dragonEci: number;
  /** 前任恶龙（首次加冕无前任） */
  prevDragon: RPGModel | null;
  prevEci: number | null;
  /** 前任在位天数（首次加冕为 null） */
  prevReignDays: number | null;
  /** 是否现任恶龙（最后一次事件） */
  isCurrent: boolean;
}

export function dragonSuccessions(snap: Snapshot): DragonEvent[] {
  const measured = snap.models
    .filter((m) => m.scores.eci != null && m.releasedAt)
    .sort(
      (a, b) =>
        a.releasedAt!.localeCompare(b.releasedAt!) ||
        a.scores.eci! - b.scores.eci! ||
        a.name.localeCompare(b.name)
    );
  if (measured.length === 0) return [];

  const events: DragonEvent[] = [];
  let reignStart = measured[0].releasedAt!;
  let reigning = measured[0];
  events.push({
    date: reigning.releasedAt!,
    dragon: reigning,
    dragonEci: reigning.scores.eci!,
    prevDragon: null,
    prevEci: null,
    prevReignDays: null,
    isCurrent: false,
  });

  for (const m of measured.slice(1)) {
    if (m.scores.eci! > reigning.scores.eci!) {
      const now = new Date(snap.generatedAt).getTime();
      events.push({
        date: m.releasedAt!,
        dragon: m,
        dragonEci: m.scores.eci!,
        prevDragon: reigning,
        prevEci: reigning.scores.eci!,
        prevReignDays: Math.max(1, Math.floor((new Date(m.releasedAt!).getTime() - new Date(reignStart).getTime()) / 86400_000)),
        isCurrent: false,
      });
      void now;
      reigning = m;
      reignStart = m.releasedAt!;
    }
  }
  if (events.length > 0) events[events.length - 1].isCurrent = true;
  return events;
}
