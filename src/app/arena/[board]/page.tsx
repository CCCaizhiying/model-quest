import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardTable, type BoardRowData } from "@/components/BoardTable";
import { GlossaryPanel } from "@/components/GlossaryPanel";
import { BOARDS, boardRows } from "@/lib/rank";
import { getSnapshot } from "@/lib/snapshot";

export function generateStaticParams() {
  return BOARDS.map((b) => ({ board: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params;
  const def = BOARDS.find((b) => b.id === board);
  return { title: def ? `${def.name} · 武斗大会 · Model Quest` : "武斗大会 · Model Quest" };
}

export default async function ArenaBoard({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params;
  const def = BOARDS.find((b) => b.id === board);
  if (!def) notFound();
  const snap = await getSnapshot();
  const rows: BoardRowData[] = boardRows(def, snap).map((r) => ({
    slug: r.model.slug,
    name: r.model.name,
    vendorId: r.vendor.id,
    vendorName: r.vendor.name,
    region: r.vendor.region,
    job: r.model.job,
    openWeights: r.model.openWeights,
    display: r.display,
    bar: r.bar,
  }));

  return (
    <div className="space-y-4">
      <nav className="text-xs text-dim">
        <Link href="/arena">武斗大会</Link> / <span className="text-paper">{def.name}</span>
      </nav>
      <header>
        <h1><span className="signboard text-xl text-gold">🏟 {def.name}</span></h1>
        <p className="mt-1 text-sm text-quest">{def.subtitle}</p>
        <p className="mt-1 text-xs text-dim">{def.note}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <BoardTable rows={rows} />
        </div>
        <aside className="hidden lg:block">
          <div className="rpg-window sticky top-20">
            <GlossaryPanel full />
          </div>
        </aside>
      </div>
    </div>
  );
}
