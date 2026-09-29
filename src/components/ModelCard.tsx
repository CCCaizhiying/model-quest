import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { Sprite } from "./Sprite";
import { abilityBars } from "@/lib/rank";
import { JOB_META, type RPGModel, type RPGVendor } from "@/lib/types";

/** 紧凑勇者卡：图鉴/村庄/榜单通用。可选内嵌四维能力条 */
export function ModelCard({
  model,
  vendor,
  badge,
  showBars = false,
  generatedAt,
}: {
  model: RPGModel;
  vendor: RPGVendor;
  badge?: string;
  showBars?: boolean;
  generatedAt?: string;
}) {
  const job = JOB_META[model.job];
  const bars = abilityBars(model, generatedAt);
  return (
    <Link href={`/bestiary/${model.slug}`} className="rpg-window flex items-center gap-3 !p-3 hover:!border-gold">
      <Sprite model={model} vendor={vendor} scale={3} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm text-paper">{model.name}</span>
          {model.openWeights && <span className="shrink-0 text-[10px] text-quest">开源</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-dim">
          <span className="shrink-0">{job.icon} {job.zh} ·</span>
          <BrandLogo vendor={vendor} px={10} />
          <span className="truncate">{vendor.name}</span>
        </div>
        {badge && <div className="mt-1 truncate text-xs text-gold">{badge}</div>}
        {showBars && (
          <div className="mt-1.5 space-y-[3px]">
            {bars.map((a) => (
              <div key={a.key} className="flex items-center gap-1.5">
                <span className="w-6 shrink-0 text-[9px] leading-none text-dim">{a.label}</span>
                <div className="rpg-bar flex-1" style={{ height: 6 }}>
                  {a.value != null && (
                    <div
                      className="rpg-bar__fill"
                      style={{ width: `${Math.round(a.value * 100)}%`, backgroundColor: a.color }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
