"use client";

// 勇者图鉴客户端交互层：职业筛选 + URL hash 同步（/bestiary#job-xxx）。
// 数据由服务端页面整包传入（静态导出，构建时已定）。
import { useEffect, useMemo, useState } from "react";
import { ModelCard } from "./ModelCard";
import { JOB_META, type Job, type RPGModel, type RPGVendor } from "@/lib/types";

export function BestiaryClient({
  vendors,
  models,
  dragonSlug,
  generatedAt,
}: {
  vendors: RPGVendor[];
  models: RPGModel[];
  dragonSlug: string | null;
  generatedAt: string;
}) {
  const [job, setJob] = useState<Job | "all">("all");

  // 读取并监听 hash：/bestiary#job-spellblade
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.match(/^#job-([a-z]+)$/);
      setJob(m && m[1] in JOB_META ? (m[1] as Job) : "all");
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const select = (j: Job | "all") => {
    setJob(j);
    const hash = j === "all" ? "#job-all" : `#job-${j}`;
    window.history.replaceState(null, "", hash);
  };

  const filtered = useMemo(
    () => (job === "all" ? models : models.filter((m) => m.job === job)),
    [models, job]
  );

  const vendorOf = (id: string) => vendors.find((v) => v.id === id)!;
  const byVendor = vendors
    .slice()
    .sort((a, b) => b.modelCount - a.modelCount)
    .map((v) => ({
      vendor: v,
      models: filtered
        .filter((m) => m.vendor === v.id)
        .sort((a, b) => (b.scores.eci ?? -1) - (a.scores.eci ?? -1)),
    }))
    .filter((g) => g.models.length > 0);

  const badgeFor = (m: RPGModel) =>
    dragonSlug === m.slug
      ? "现任恶龙"
      : m.scores.eci != null
        ? `ECI ${m.scores.eci.toFixed(1)}`
        : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1><span className="signboard text-xl text-gold">📖 勇者图鉴</span></h1>
        <p className="mt-1 text-sm text-dim">
          共 {models.length} 名冒险者{job !== "all" && <>，当前筛选「{JOB_META[job].zh}」{filtered.length} 名</>}。能力条为「？？？」者表示尚未接受武斗实测（数据缺失，不作臆造）。
        </p>
        {/* 职业筛选（锚点目标：hash 跳转时滚动到这里） */}
        <div id="job-filters" className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            className={`rpg-btn ${job === "all" ? "rpg-btn--active" : ""}`}
            onClick={() => select("all")}
          >
            全部职业
          </button>
          {(Object.keys(JOB_META) as Job[]).map((j) => (
            <button
              key={j}
              id={`job-${j}`}
              className={`rpg-btn ${job === j ? "rpg-btn--active" : ""}`}
              onClick={() => select(j)}
            >
              {JOB_META[j].icon} {JOB_META[j].zh}
            </button>
          ))}
        </div>
        <details className="rpg-window mt-3">
          <summary className="cursor-pointer text-xs text-gold">📖 名词速查（点开查看能力/职业/大陆说明）</summary>
          <div className="mt-3">
            <GlossaryLazy />
          </div>
        </details>
      </header>

      {byVendor.length === 0 && (
        <p className="rpg-window py-6 text-center text-sm text-dim">该职业暂无勇者。</p>
      )}

      {byVendor.map(({ vendor, models: group }) => (
        <section key={vendor.id}>
          <h2 className="mb-2 flex items-baseline gap-2">
            <span className="text-base text-paper">{vendor.name}</span>
            <span className="text-xs text-dim">{vendor.en} · {group.length} 名</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.map((m) => (
              <ModelCard key={m.slug} model={m} vendor={vendor} badge={badgeFor(m)} generatedAt={generatedAt} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** 名词速查按需渲染（避免客户端包里带服务端依赖） */
import { GlossaryPanel } from "./GlossaryPanel";
function GlossaryLazy() {
  return <GlossaryPanel full />;
}
