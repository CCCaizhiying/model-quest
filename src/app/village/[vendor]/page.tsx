import Link from "next/link";
import { notFound } from "next/navigation";
import { DialogBox } from "@/components/DialogBox";
import { ModelCard } from "@/components/ModelCard";
import { BrandLogo } from "@/components/BrandLogo";
import { House, Sprite } from "@/components/Sprite";
import { getSnapshot, getVendorMap } from "@/lib/snapshot";

export async function generateStaticParams() {
  const snap = await getSnapshot();
  return snap.vendors.map((v) => ({ vendor: v.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ vendor: string }> }) {
  const { vendor } = await params;
  const map = await getVendorMap();
  const v = map.get(vendor);
  return { title: v ? `${v.name} 据点 · Model Quest` : "村庄 · Model Quest" };
}

export default async function VillageDetail({ params }: { params: Promise<{ vendor: string }> }) {
  const { vendor: vid } = await params;
  const snap = await getSnapshot();
  const vendor = snap.vendors.find((v) => v.id === vid);
  if (!vendor) notFound();

  const models = snap.models
    .filter((m) => m.vendor === vendor.id)
    .sort((a, b) => (b.scores.eci ?? -1) - (a.scores.eci ?? -1));
  const flagship = models.find((m) => m.slug === vendor.flagship) ?? models[0];
  const isDragonVendor = snap.dragon?.vendor === vendor.id;

  return (
    <div className="space-y-6">
      <nav className="text-xs text-dim">
        <Link href="/village">村庄广场</Link> / <span className="text-paper">{vendor.name}</span>
      </nav>

      <header className={`rpg-window ${isDragonVendor ? "rpg-window--dragon" : ""} flex flex-col items-center gap-4 sm:flex-row`}>
        <House vendor={vendor} scale={3} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-dim">{vendor.region === "cn" ? "🏯 东土大陆" : "🗼 西洋大陆"} · 门派据点</p>
          <h1 className="flex items-center gap-2 text-xl text-gold">
            <BrandLogo vendor={vendor} px={22} />
            {vendor.name}
            <span className="ml-2 text-sm text-dim">{vendor.en}</span>
          </h1>
          <p className="mt-1 text-sm text-paper">「{vendor.motto}」</p>
          <p className="mt-1 text-xs text-dim">
            驻守勇者 {models.length} 名{isDragonVendor && " · 现任恶龙出身地"}
          </p>
        </div>
      </header>

      {flagship && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rpg-window flex items-center gap-4 lg:col-span-2">
            <Sprite model={flagship} vendor={vendor} scale={4} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gold">◤ 门面勇者</p>
              <Link href={`/bestiary/${flagship.slug}`} className="text-lg text-paper hover:text-gold">
                {flagship.name}
              </Link>
              <p className="mt-1 text-xs text-dim">
                {flagship.scores.eci != null ? `ECI ${flagship.scores.eci.toFixed(1)}` : "尚未受封实测"} ·{" "}
                {flagship.releasedAt ?? "？？"} 降临
              </p>
            </div>
          </div>
          <DialogBox text={`欢迎来到${vendor.name}据点。门下 ${models.length} 名勇者随时听候调遣。`} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base text-gold">🛡 门下勇者全录（{models.length}）</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <ModelCard
              key={m.slug}
              model={m}
              vendor={vendor}
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
    </div>
  );
}
