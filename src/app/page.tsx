import Link from "next/link";
import { AbilityBar } from "@/components/AbilityBar";
import { DialogBox } from "@/components/DialogBox";
import { GlossaryPanel } from "@/components/GlossaryPanel";
import { ModelCard } from "@/components/ModelCard";
import { Dragon } from "@/components/Sprite";
import { getSnapshot, getVendorMap } from "@/lib/snapshot";
import { abilityBars, challengers, daysOnThrone } from "@/lib/rank";
import { JOB_META, type Job } from "@/lib/types";

export default async function Home() {
  const snap = await getSnapshot();
  const vendors = await getVendorMap();
  const dragon = snap.dragon;
  const dragonModel = dragon ? snap.models.find((m) => m.slug === dragon.slug) : null;
  const dragonVendor = dragonModel ? vendors.get(dragonModel.vendor) : null;
  const days = dragonModel ? daysOnThrone(dragonModel, snap) : null;
  const cards = challengers(snap);

  const jobCounts = new Map<Job, number>();
  for (const m of snap.models) jobCounts.set(m.job, (jobCounts.get(m.job) ?? 0) + 1);

  return (
    <div className="space-y-8">
      {/* ── 恶龙区 ─────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rpg-window rpg-window--dragon scene-night lg:col-span-3">
          <p className="mb-1 text-xs text-[#ff8a75]">◤ 魔王城 · 龙座之巅</p>
          {dragon && dragonModel && dragonVendor ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative shrink-0">
                <Dragon vendor={dragonVendor} scale={6} className="dragon-breathe relative" />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs text-[#b0aac0]">当代恶龙 · 综合智力天下第一</p>
                <Link href={`/bestiary/${dragonModel.slug}`} className="block text-3xl leading-10 text-[#ffdd55] [text-shadow:0_0_12px_rgba(255,200,60,0.9),0_0_3px_#fff,0_3px_0_#7a3c00] hover:text-white">
                  {dragon.name}
                </Link>
                <p className="mt-1 text-sm text-[#f0ead8]">
                  {dragonVendor.name} 门派 · ECI {dragon.eci?.toFixed(1)}
                  {days != null && <> · 在位 {days} 天</>}
                </p>
                {dragon.basis === "provisional" && <p className="mt-1 text-xs text-blood">※ 暂定恶龙（评测数据待补）</p>}
                <div className="mt-3">
                  <DialogBox text={`吾乃当代恶龙「${dragon.name}」。ECI ${dragon.eci?.toFixed(1)}，天下无敌。何人敢来讨伐？`} />
                </div>
                {/* 恶龙能力条（与勇者同款） */}
                <div className="mt-3 space-y-1.5">
                  {abilityBars(dragonModel, snap.generatedAt).map((a) => (
                    <AbilityBar key={a.key} ability={a} />
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-[#b0aac0]">📜 知识截止</span>
                  <span className="text-right text-[#f0ead8]">{dragonModel.knowledgeCutoff ?? "？？？"}</span>
                  <span className="text-[#b0aac0]">👑 加冕（发布）</span>
                  <span className="text-right text-[#f0ead8]">{dragonModel.releasedAt ?? "？？？"}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-dim">龙座空悬 —— 数据同步后自动加冕。</p>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rpg-window">
            <p className="mb-2 text-xs text-gold">◤ 冒险者公会告示板</p>
            <ul className="space-y-2 text-sm leading-6 text-paper">
              <li>· 大陆上现存 <b className="text-gold">{snap.stats.modelCount}</b> 名勇者，分属 <b className="text-gold">{snap.stats.vendorCount}</b> 个门派。</li>
              <li>· 其中 <b className="text-gold">{Math.round(snap.stats.eciCoverage * snap.stats.modelCount)}</b> 人接受过「综合智力」武斗实测。</li>
              <li>· 屠龙规则：综合能力指数（ECI）登顶者，即新的恶龙。</li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-dim">
              「屠龙少年终成恶龙」—— 每一位挑战者，都在成为新的魔王。
            </p>
          </div>
          <div className="rpg-window">
            <GlossaryPanel />
          </div>
        </div>
      </section>

      {/* ── 维度挑战者 ──────────────────────────── */}
      <section>
        <h2 className="mb-3"><span className="signboard text-base text-gold">⚔ 各路榜首挑战者</span></h2>
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.title} className="space-y-1">
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs text-dim">{c.title}</span>
                <Link href={`/arena/${c.boardId === "open" || c.boardId === "cn" ? "total" : c.boardId}`} className="rpg-btn !py-0.5 !px-1.5 text-[10px]">
                  查看大会 →
                </Link>
              </div>
              <ModelCard model={c.model} vendor={c.vendor} badge={c.display} showBars />
              <p className="px-1">
                <span className="inline-block rounded-sm bg-panel/95 px-1.5 py-0.5 text-[10px] leading-4 text-dim">{c.note}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 职业入口 ──────────────────────────── */}
      <section>
        <h2 className="mb-3"><span className="signboard text-base text-gold">🛡 按职业阅览</span></h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(Object.keys(JOB_META) as Job[]).map((j) => (
            <Link key={j} href={`/bestiary/#job-${j}`} className="rpg-window !p-3 text-center hover:!border-gold">
              <div className="text-2xl">{JOB_META[j].icon}</div>
              <div className="mt-1 text-sm text-paper">{JOB_META[j].zh}</div>
              <div className="text-[10px] text-dim">{jobCounts.get(j) ?? 0} 人</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 门派速览 ──────────────────────────── */}
      <section>
        <h2 className="mb-3"><span className="signboard text-base text-gold">🏰 门派速览</span></h2>
        <div className="flex flex-wrap gap-2">
          {snap.vendors
            .slice()
            .sort((a, b) => b.modelCount - a.modelCount)
            .map((v) => (
              <Link key={v.id} href={`/village/${v.id}`} className="rpg-btn text-xs">
                {v.name}
                <span className="ml-1 text-dim">{v.modelCount}</span>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
