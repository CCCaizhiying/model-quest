import Link from "next/link";
import { BOARDS } from "@/lib/rank";
import { getSnapshot } from "@/lib/snapshot";

export const metadata = { title: "武斗大会 · Model Quest" };

export default async function ArenaPage() {
  const snap = await getSnapshot();
  return (
    <div className="space-y-6">
      <header>
        <h1><span className="signboard text-xl text-gold">🏟 武斗大会</span></h1>
        <p className="mt-1 text-sm text-dim">
          六大赛制，各比各的。不同赛制的分数不可混算——正如比武与比法不能同台。
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BOARDS.map((b) => {
          let count = snap.models.length;
          if (b.id === "total") count = snap.models.filter((m) => m.scores.eci != null).length;
          else if (b.id === "sword") count = snap.models.filter((m) => m.scores.sweBench != null).length;
          else if (b.id === "value") count = snap.models.filter((m) => m.scores.eci != null && (m.priceIn ?? 0) > 0).length;
          else if (b.id === "luck") count = snap.models.filter((m) => (m.priceIn ?? 0) > 0).length;
          else if (b.id === "composite") count = snap.models.filter((m) => m.scores.eci != null || m.scores.sweBench != null).length;
          return (
            <Link key={b.id} href={`/arena/${b.id}`} className="rpg-window hover:!border-gold">
              <p className="text-sm text-paper">{b.name}</p>
              <p className="mt-1 text-xs text-quest">{b.subtitle}</p>
              <p className="mt-2 text-[10px] leading-4 text-dim">{b.note}</p>
              <p className="mt-2 text-[10px] text-gold">{count} 名勇者参赛 →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
