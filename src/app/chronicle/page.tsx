import Link from "next/link";
import { ModelCard } from "@/components/ModelCard";
import { dragonSuccessions } from "@/lib/rank";
import { getSnapshot } from "@/lib/snapshot";
import type { RPGModel, Snapshot } from "@/lib/types";

export const metadata = { title: "屠龙编年史 · Model Quest" };

/** 编年史按月分组：月份降序（从近到远），月内按日期降序 + ECI 降序 */
function groupByMonth(models: RPGModel[]): Array<{ month: string; items: RPGModel[] }> {
  const map = new Map<string, RPGModel[]>();
  for (const m of models) {
    if (!m.releasedAt) continue;
    const month = m.releasedAt.slice(0, 7);
    if (!map.has(month)) map.set(month, []);
    map.get(month)!.push(m);
  }
  return [...map.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((month) => ({
      month,
      items: map.get(month)!.sort(
        (a, b) =>
          (b.releasedAt ?? "").localeCompare(a.releasedAt ?? "") ||
          (b.scores.eci ?? -1) - (a.scores.eci ?? -1) ||
          a.name.localeCompare(b.name)
      ),
    }));
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y} 年 ${Number(m)} 月`;
}

/** 距今月数 */
function monthsAgo(month: string, snap: Snapshot): number {
  const d = new Date(month + "-01").getTime();
  const now = new Date(snap.generatedAt.slice(0, 7) + "-01").getTime();
  return Math.max(0, Math.round((now - d) / (30.44 * 86400_000)));
}

export default async function ChroniclePage() {
  const snap = await getSnapshot();
  const vendorOf = (id: string) => snap.vendors.find((v) => v.id === id)!;
  const groups = groupByMonth(snap.models);
  const dated = groups.reduce((n, g) => n + g.items.length, 0);
  const undated = snap.models.length - dated;
  const dragonMonth = snap.models.find((m) => m.slug === snap.dragon?.slug)?.releasedAt?.slice(0, 7);
  const events = dragonSuccessions(snap);

  return (
    <div className="space-y-6">
      <header>
        <h1><span className="signboard text-xl text-gold">📜 屠龙编年史</span></h1>
        <p className="mt-1 text-sm text-dim">
          大陆编年史：每月诞生的勇者，从近到远，月内按降临日降序。共 {dated} 名在册
          {undated > 0 && <>，另有 {undated} 名降临日期未详者未列入</>}。
        </p>
      </header>

      {/* ── 恶龙换代大事记 ── */}
      {events.length > 0 && (
        <section className="rpg-window rpg-window--dragon">
          <p className="mb-1 text-xs text-blood">🐉 恶龙换代大事记（{events.length} 次加冕）</p>
          <p className="mb-3 text-[10px] leading-4 text-dim">
            依据 Epoch AI 各模型的实测日期回放推演：ECI 严格超越现任者，即屠龙成功、终成恶龙。
          </p>
          <ol className="space-y-2 text-sm leading-6">
            {[...events].reverse().map((e) => {
              const reign = e.isCurrent && e.dragon.releasedAt
                ? Math.max(1, Math.floor((new Date(snap.generatedAt).getTime() - new Date(e.dragon.releasedAt).getTime()) / 86400_000))
                : null;
              return (
                <li key={`${e.date}-${e.dragon.slug}`} className="border-b border-[#4a2028] pb-2 last:border-none">
                  <span className="text-xs text-dim">{e.date}</span>{" "}
                  <Link href={`/bestiary/${e.dragon.slug}`} className="font-bold text-blood hover:text-[#7a1818]">
                    {e.dragon.name}
                  </Link>{" "}
                  <span className="text-paper">
                    加冕（ECI {e.dragonEci.toFixed(1)}）
                  </span>{" "}
                  {e.prevDragon ? (
                    <span className="text-xs text-dim">
                      —— 屠龙成功，前任 {e.prevDragon.name}（ECI {e.prevEci?.toFixed(1)}）在位 {e.prevReignDays} 天
                    </span>
                  ) : (
                    <span className="text-xs text-dim">—— 大陆纪元之首任恶龙</span>
                  )}
                  {e.isCurrent && (
                    <span className="ml-1 text-xs font-bold text-blood">
                      ☠ 现任 · 在位 {reign ?? "？"} 天
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="relative space-y-8 pl-6">
        {/* 时间线纵轴 */}
        <div aria-hidden className="absolute bottom-0 left-1.5 top-2 w-[3px] bg-[#8a6844]" />

        {groups.map(({ month, items }) => {
          const isDragonMonth = month === dragonMonth;
          return (
            <section key={month} className="relative">
              <span
                aria-hidden
                className={`absolute -left-6 top-1 h-3 w-3 border-2 ${
                  isDragonMonth ? "border-blood bg-[#c23a3a]" : "border-[#8a6844] bg-panel"
                }`}
                style={{ borderRadius: 0 }}
              />
              <h2 className="flex flex-wrap items-baseline gap-2">
                <span className={`signboard text-base ${isDragonMonth ? "text-blood" : "text-gold"}`}>
                  {isDragonMonth && "🐉 "}
                  {monthLabel(month)}
                </span>
                <span className="text-xs text-dim">
                  {items.length} 名勇者诞生
                  {monthsAgo(month, snap) > 0 && <> · 距今 {monthsAgo(month, snap)} 个月</>}
                  {isDragonMonth && <> · 🐉 当代恶龙于此月降临</>}
                </span>
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => (
                  <ModelCard
                    key={m.slug}
                    model={m}
                    vendor={vendorOf(m.vendor)}
                    badge={
                      snap.dragon?.slug === m.slug
                        ? "现任恶龙"
                        : m.scores.eci != null
                          ? `ECI ${m.scores.eci.toFixed(1)}`
                          : undefined
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}

        {groups.length === 0 && (
          <p className="rpg-window py-6 text-center text-sm text-dim">编年史空无一页 —— 没有勇者留下降临日期。</p>
        )}
      </div>

      <p className="text-xs leading-5 text-dim">
        编年史按 models.dev / OpenRouter 记录的降临日期编排；日期缺失的勇者不参与排序。
        想了解某位勇者的完整战绩，点击卡片进入图鉴。
      </p>
    </div>
  );
}
