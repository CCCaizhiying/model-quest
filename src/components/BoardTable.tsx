"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { JOB_META, type Job, type Region } from "@/lib/types";

export interface BoardRowData {
  slug: string;
  name: string;
  vendorId: string;
  vendorName: string;
  region: Region;
  job: Job;
  openWeights: boolean;
  display: string;
  bar: number | null;
}

const FILTERS = {
  region: [
    { v: "all", label: "全大陆" },
    { v: "cn", label: "东土" },
    { v: "global", label: "西洋" },
  ],
  camp: [
    { v: "all", label: "全阵营" },
    { v: "open", label: "开源" },
    { v: "closed", label: "闭源" },
  ],
} as const;

/** 武斗大会榜单：客户端筛选（阵营/大陆），静态导出友好 */
export function BoardTable({ rows }: { rows: BoardRowData[] }) {
  const [region, setRegion] = useState<string>("all");
  const [camp, setCamp] = useState<string>("all");

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (region !== "all" && r.region !== region) return false;
        if (camp === "open" && !r.openWeights) return false;
        if (camp === "closed" && r.openWeights) return false;
        return true;
      }),
    [rows, region, camp]
  );

  const jobs = useMemo(() => {
    const set = new Set(filtered.map((r) => r.job));
    return [...set];
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs">
        {(["region", "camp"] as const).map((k) => (
          <div key={k} className="flex items-center gap-1">
            {FILTERS[k].map((o) => (
              <button
                key={o.v}
                className={`rpg-btn !py-0.5 !px-2 ${(k === "region" ? region : camp) === o.v ? "rpg-btn--active" : ""}`}
                onClick={() => (k === "region" ? setRegion(o.v) : setCamp(o.v))}
              >
                {o.label}
              </button>
            ))}
          </div>
        ))}
        <span className="self-center text-dim">{filtered.length} 名上场</span>
      </div>

      <div className="rpg-window overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b-2 border-panel2 text-left text-xs text-dim">
              <th className="w-10 py-2 pl-1">#</th>
              <th className="py-2">勇者</th>
              <th className="py-2">门派</th>
              <th className="py-2">职业</th>
              <th className="w-40 py-2">战力</th>
              <th className="py-2 pr-1 text-right">数值</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.slug} className="border-b border-panel2/60 hover:bg-panel2/60">
                <td className="py-1.5 pl-1 text-gold">{i + 1}</td>
                <td className="py-1.5">
                  <Link href={`/bestiary/${r.slug}`} className="hover:text-gold">
                    {r.name}
                  </Link>
                  {r.openWeights && <span className="ml-1 text-[10px] text-quest">开源</span>}
                </td>
                <td className="py-1.5 text-xs text-dim">{r.vendorName}</td>
                <td className="py-1.5 text-xs text-dim">
                  {JOB_META[r.job].icon} {JOB_META[r.job].zh}
                </td>
                <td className="py-1.5">
                  <div className="rpg-bar">
                    {r.bar != null && <div className="rpg-bar__fill" style={{ width: `${Math.round(r.bar * 100)}%`, backgroundColor: "#f8c848" }} />}
                  </div>
                </td>
                <td className="py-1.5 pr-1 text-right text-paper">{r.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-dim">此赛制下暂无勇者上场。</p>}
      </div>

      {jobs.length > 0 && (
        <p className="text-[10px] text-dim">
          职业分布：{jobs.map((j) => `${JOB_META[j].zh}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
