"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import MiniSearch, { type SearchResult } from "minisearch";

interface IndexEntry {
  slug: string;
  name: string;
  id: string;
  vendor: string;
  vendorName: string;
  region: string;
  job: string;
  openWeights: boolean;
  releasedAt: string;
  tags: string[];
}

const JOB_ZH: Record<string, string> = {
  warrior: "战士",
  archer: "弓手",
  spellblade: "魔剑士",
  painter: "画师",
  illusionist: "幻术师",
  bard: "吟游诗人",
  runecaster: "符文师",
};

/** 全站检索：预构建索引 + MiniSearch，支持模型名 / 厂商名 / 能力词（如「多模态」「开源」） */
export default function SearchPage() {
  const [entries, setEntries] = useState<IndexEntry[]>([]);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => r.json())
      .then((d: IndexEntry[]) => setEntries(d))
      .catch(() => setEntries([]));
    inputRef.current?.focus();
  }, []);

  const mini = useMemo(() => {
    const m = new MiniSearch<IndexEntry>({
      fields: ["name", "id", "vendorName", "tags", "job"],
      storeFields: ["slug", "name", "vendorName", "region", "job", "openWeights", "releasedAt"],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { name: 3, vendorName: 2 } },
    });
    m.addAll(entries);
    return m;
  }, [entries]);

  const results: Array<SearchResult & IndexEntry> = useMemo(() => {
    if (!q.trim()) return [];
    return mini.search(q.trim()).slice(0, 50) as Array<SearchResult & IndexEntry>;
  }, [mini, q]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1><span className="signboard text-xl text-gold">🔍 冒险者公会 · 名册检索</span></h1>
        <p className="mt-1 text-xs text-dim">
          试试输入模型名（claude / glm / 豆包）、厂商名（智谱、月之暗面）或能力词（多模态、开源、图像）。
        </p>
      </header>

      <div className="rpg-window">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="输入关键词，回车检索…"
          className="w-full bg-transparent text-base text-paper outline-none placeholder:text-dim/60"
        />
      </div>

      <p className="text-xs text-dim">
        {entries.length === 0 ? "名册装载中…" : q.trim() ? `找到 ${results.length} 条` : "输入关键词开始检索"}
      </p>

      <div className="space-y-2">
        {results.map((r) => (
          <Link key={r.slug} href={`/bestiary/${r.slug}`} className="rpg-window block !p-3 hover:!border-gold">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-paper">{r.name}</span>
              <span className="text-[10px] text-dim">{r.releasedAt}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-dim">
              <span>{r.vendorName}</span>
              <span>{JOB_ZH[r.job] ?? r.job}</span>
              {r.openWeights && <span className="text-quest">开源</span>}
              <span>{r.region === "cn" ? "东土大陆" : "西洋大陆"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
