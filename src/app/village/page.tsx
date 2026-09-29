import Link from "next/link";
import { GlossaryPanel } from "@/components/GlossaryPanel";
import { BrandLogo } from "@/components/BrandLogo";
import { House } from "@/components/Sprite";
import { getSnapshot } from "@/lib/snapshot";
import type { RPGVendor } from "@/lib/types";

export const metadata = { title: "村庄广场 · Model Quest" };

/** 按门派规模分街 */
function streetOf(v: RPGVendor): { name: string; order: number } {
  if (v.modelCount >= 20) return { name: "头部大街", order: 0 };
  if (v.modelCount >= 5) return { name: "主力集市", order: 1 };
  return { name: "新兴小巷", order: 2 };
}

const STREETS = ["头部大街", "主力集市", "新兴小巷"] as const;

export default async function VillagePage() {
  const snap = await getSnapshot();
  const dragonVendorId = snap.models.find((m) => m.slug === snap.dragon?.slug)?.vendor;

  const streets = STREETS.map((name) => ({
    name,
    vendors: snap.vendors
      .filter((v) => streetOf(v).name === name)
      .sort((a, b) => b.modelCount - a.modelCount),
  }));

  const continent = (region: "cn" | "global", title: string, blurb: string) => (
    <section className="mt-8">
      <h2 className="mb-1"><span className="signboard text-base text-gold">{title}</span></h2>
      <p className="mb-3 text-xs text-dim">{blurb}</p>
      {streets
        .map((s) => ({ ...s, vendors: s.vendors.filter((v) => v.region === region) }))
        .filter((s) => s.vendors.length > 0)
        .map((s) => (
          <div key={s.name} className="mb-5">
            <p className="mb-2"><span className="inline-block rounded-sm bg-panel px-2 py-0.5 text-xs text-dim">── {s.name} ──</span></p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {s.vendors.map((v) => (
                <Link
                  key={v.id}
                  href={`/village/${v.id}`}
                  className={`rpg-window flex flex-col items-center gap-2 !p-3 text-center hover:!border-gold ${
                    v.id === dragonVendorId ? "rpg-window--dragon" : ""
                  }`}
                >
                  <House vendor={v} scale={2} />
                  <span className="flex items-center gap-2 text-sm text-paper"><BrandLogo vendor={v} px={16} />{v.name}</span>
                  <span className="text-[10px] leading-4 text-dim">{v.motto}</span>
                  <span className="text-[10px] text-quest">{v.modelCount} 名勇者驻守</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </section>
  );

  return (
    <div>
      <header>
        <h1><span className="signboard text-xl text-gold">🗺 村庄广场</span></h1>
        <p className="mt-1 text-sm text-dim">
          两大大陆、{snap.vendors.length} 个门派据点。红框据点即现任恶龙的出身门派。
        </p>
        <details className="rpg-window mt-3">
          <summary className="cursor-pointer text-xs text-gold">🏘 逛街须知（大陆与街区规则）</summary>
          <div className="mt-3">
            <GlossaryPanel />
          </div>
        </details>
      </header>
      {continent("cn", "🏯 东土大陆", "国产门派驻地")}
      {continent("global", "🗼 西洋大陆", "海外门派驻地")}
    </div>
  );
}
