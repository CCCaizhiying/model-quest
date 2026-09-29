import type { Metadata } from "next";
import Link from "next/link";
import { getSnapshot } from "@/lib/snapshot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Model Quest · 模型屠龙录",
  description:
    "致敬勇者斗恶龙的 AI 大模型查询站：当前最强的大模型是盘踞龙座的恶龙，其余皆为前来讨伐的勇者。屠龙者，终成恶龙。",
};

const NAV = [
  { href: "/", label: "屠龙榜" },
  { href: "/village", label: "村庄广场" },
  { href: "/arena", label: "武斗大会" },
  { href: "/chronicle", label: "屠龙编年史" },
  { href: "/bestiary", label: "勇者图鉴" },
  { href: "/search", label: "全站检索" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const snap = await getSnapshot();
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <div className="relative isolate flex min-h-screen flex-col">
          <div aria-hidden className="scene-layer absolute inset-0 -z-10" />
          <header className="sticky top-0 z-50 border-b-4 border-[#8a6844] bg-ink/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-lg text-[#f8c848]">⚔ Model Quest</span>
                <span className="hidden text-xs text-[#c9ab7c] sm:inline">模型屠龙录</span>
              </Link>
              <nav className="flex flex-wrap items-center gap-2 text-sm">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="rpg-btn">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
          <footer className="mt-10 border-t-4 border-[#8a6844] bg-ink/95 py-6">
            <div className="mx-auto max-w-6xl space-y-2 px-4 text-xs leading-5 text-[#c9ab7c]">
              <p>
                Model Quest · 原创像素风 AI 大模型查询站。本站为独立致敬之作，与 Square Enix《勇者斗恶龙》无任何关联；全部像素形象由数据程序化生成。
              </p>
              <p>
                数据来源：
                <a className="text-[#7bd0e8]" href="https://models.dev" target="_blank" rel="noreferrer">
                  models.dev
                </a>{" "}
                （MIT）·
                <a className="text-[#7bd0e8]" href="https://epoch.ai/benchmarks" target="_blank" rel="noreferrer">
                  Epoch AI Benchmarking Hub
                </a>{" "}
                （CC-BY 4.0）·
                <a className="text-[#7bd0e8]" href="https://livebench.ai" target="_blank" rel="noreferrer">
                  LiveBench
                </a>{" "}
                （Apache-2.0）· OpenRouter 目录。数据快照：{snap.generatedAt.slice(0, 16).replace("T", " ")}（UTC），运行{" "}
                <code>npm run sync</code> 更新。
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
