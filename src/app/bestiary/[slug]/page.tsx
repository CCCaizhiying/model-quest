import Link from "next/link";
import { notFound } from "next/navigation";
import { AbilityBar } from "@/components/AbilityBar";
import { BrandLogo } from "@/components/BrandLogo";
import { DialogBox } from "@/components/DialogBox";
import { Sprite } from "@/components/Sprite";
import { getFamilyLine, getKinModels, getModelBySlug, getSnapshot, getVendorMap } from "@/lib/snapshot";
import { abilityBars, daysOnThrone, fmtModelContext, fmtPrice } from "@/lib/rank";
import { JOB_META } from "@/lib/types";

export async function generateStaticParams() {
  const snap = await getSnapshot();
  return snap.models.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getModelBySlug(slug);
  return { title: found ? `${found.model.name} · 勇者图鉴 · Model Quest` : "勇者图鉴 · Model Quest" };
}

function scoreRow(label: string, note: string, v: number | undefined, fmt: (n: number) => string) {
  return (
    <div key={label} className="flex items-baseline justify-between gap-2 border-b border-panel2 py-1.5 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-xs text-dim/70">{note}</span>
      <span className="text-paper">{v != null ? fmt(v) : <span className="text-dim">？？？</span>}</span>
    </div>
  );
}

export default async function BestiaryDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getModelBySlug(slug);
  if (!found) notFound();
  const { model, vendor } = found;
  const snap = await getSnapshot();
  const isDragon = snap.dragon?.slug === model.slug;
  const kin = await getKinModels(model);
  const family = await getFamilyLine(model);
  const abilities = abilityBars(model, snap.generatedAt);
  const days = daysOnThrone(model, snap);
  const job = JOB_META[model.job];

  return (
    <div className="space-y-6">
      <nav className="text-xs text-dim">
        <Link href="/bestiary">勇者图鉴</Link> / <Link href={`/village/${vendor.id}`}>{vendor.name}</Link> /{" "}
        <span className="text-paper">{model.name}</span>
      </nav>

      {isDragon && (
        <div className="rpg-window rpg-window--dragon !py-2 text-center text-sm text-blood">
          ☠ 现任恶龙 —— 综合智力天下第一，盘踞龙座{days != null ? ` ${days} ` : ""}天
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 立绘与身份 */}
        <div className={`rpg-window ${isDragon ? "rpg-window--dragon" : ""} flex flex-col items-center gap-3 text-center`}>
          <Sprite model={model} vendor={vendor} scale={8} />
          <div>
            <h1 className="text-xl text-gold">{model.name}</h1>
            <p className="mt-1 text-sm text-paper">
              {job.icon} {job.zh} · {vendor.name} 门派
            </p>
            <p className="mt-1 text-xs text-dim">ID：{model.id}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 text-[10px]">
            <span className="rpg-btn !py-0.5 !px-1.5 pointer-events-none">{model.openWeights ? "开源义军" : "王国骑士团"}</span>
            {model.reasoning && <span className="rpg-btn !py-0.5 !px-1.5 pointer-events-none">会深思（推理）</span>}
            {model.toolCall && <span className="rpg-btn !py-0.5 !px-1.5 pointer-events-none">善使道具（工具调用）</span>}
            {model.paramTier !== "unknown" ? (
              <span className="rpg-btn !py-0.5 !px-1.5 pointer-events-none">
                {model.paramsB}B 参数 · {model.paramTier} 体格
              </span>
            ) : (
              <span className="rpg-btn !py-0.5 !px-1.5 pointer-events-none">？？级 体格</span>
            )}
          </div>
        </div>

        {/* 能力面板 */}
        <div className="rpg-window space-y-3">
          <p className="text-xs text-gold">◤ 能力面板</p>
          {abilities.map((a) => (
            <div key={a.key}>
              <AbilityBar ability={a} />
              <p className="mt-0.5 text-[10px] text-dim">
                {a.key === "atk" && "综合智力指数（Epoch AI ECI）"}
                {a.key === "sword" && "编码实测（SWE-bench 或 LiveBench 编码均值）"}
                {a.key === "hp" && `上下文窗口：${fmtModelContext(model)} tokens`}
                {a.key === "luck" && `身价：${fmtPrice(model)} / 百万输入 tokens（越便宜越幸运）`}
              </p>
            </div>
          ))}
          <div className="!mt-4 border-t border-panel2 pt-3 text-xs leading-6 text-dim">
            <p>知识截止：{model.knowledgeCutoff ?? "？？？"}</p>
            <p>发布日期：{model.releasedAt ?? "？？？"}</p>
            <p>输出上限：{model.maxOutputTokens ? `${model.maxOutputTokens} tokens` : "？？？"}</p>
            <p>
              输入价格 {fmtPrice(model)} · 输出价格{" "}
              {model.priceOut != null ? `$${model.priceOut < 1 ? model.priceOut.toFixed(2) : model.priceOut.toFixed(1)}` : "？？？"}
            </p>
          </div>
        </div>

        {/* 台词 */}
        <div className="space-y-3">
          <DialogBox
            gold
            text={
              isDragon
                ? `吾即「${model.name}」，${vendor.name} 门派之巅。ECI ${model.scores.eci?.toFixed(1) ?? "？"}，问谁是挑战者？`
                : model.scores.eci != null
                  ? `我是${vendor.name}门的${job.zh}「${model.name}」。ECI ${model.scores.eci.toFixed(1)}，正为屠龙苦修剑术。`
                  : `我是${vendor.name}门的${job.zh}「${model.name}」。武斗实测尚未开始，我的实力？来日方长。`
            }
          />
          <div className="rpg-window">
            <p className="mb-2 text-xs text-gold">◤ 门派铭牌</p>
            <p className="flex items-center gap-2 text-sm text-paper"><BrandLogo vendor={vendor} px={16} />{vendor.name}<span className="text-xs text-dim">（{vendor.en}）</span></p>
            <p className="mt-1 text-xs leading-5 text-dim">「{vendor.motto}」</p>
            <Link href={`/village/${vendor.id}`} className="mt-2 inline-block text-xs text-quest">
              → 造访{vendor.name}据点
            </Link>
          </div>
        </div>
      </div>

      {/* 战绩表 */}
      <section className="rpg-window">
        <p className="mb-2 text-xs text-gold">◤ 武斗战绩（Epoch AI 实测）</p>
        {scoreRow("综合智力 ECI", "能力指数，恶龙判定依据", model.scores.eci, (n) => n.toFixed(1))}
        {scoreRow("SWE-bench Verified", "真实仓库修 bug，%", model.scores.sweBench, (n) => `${n.toFixed(1)}%`)}
        {scoreRow("LiveBench 编码", "五类编码任务均值，%", model.scores.livebenchCoding, (n) => `${n.toFixed(1)}%`)}
        {scoreRow("GPQA Diamond", "博士级科学问答，%", model.scores.gpqa, (n) => `${n.toFixed(1)}%`)}
        {scoreRow("AIME", "奥数竞赛（Otis Mock），%", model.scores.aime, (n) => `${n.toFixed(1)}%`)}
        {scoreRow("MATH Level 5", "高难数学，%", model.scores.mathLevel5, (n) => `${n.toFixed(1)}%`)}
      </section>

      {/* 进化树 */}
      {family.length > 1 && (
        <section className="rpg-window">
          <p className="mb-2 text-xs text-gold">◤ 系谱 · {model.family} 一族</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {family.map((f, i) => (
              <span key={f.slug} className="flex items-center gap-2">
                {i > 0 && <span className="text-dim">→</span>}
                <Link href={`/bestiary/${f.slug}`} className={f.slug === model.slug ? "text-gold" : "text-paper hover:text-gold"}>
                  {f.name}
                  <span className="ml-1 text-[10px] text-dim">{f.releasedAt?.slice(0, 7) ?? ""}</span>
                </Link>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 同门 */}
      {kin.length > 0 && (
        <section>
          <h2 className="mb-2 text-base text-gold">🛡 {vendor.name} 门下其他勇者</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {kin.map((k) => (
              <Link key={k.slug} href={`/bestiary/${k.slug}`} className="rpg-btn">
                {k.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
