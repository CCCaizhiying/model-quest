import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-4xl">🌫</p>
      <h1 className="mt-4 text-xl text-gold">迷雾森林 · 你迷路了</h1>
      <p className="mt-2 text-sm leading-6 text-dim">
        这里没有你要找的勇者或据点。也许它已退役归隐，也许你念错了名字。
      </p>
      <Link href="/" className="rpg-btn mt-6 inline-block">
        回到屠龙榜
      </Link>
    </div>
  );
}
