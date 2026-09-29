import { JOB_META } from "@/lib/types";
import type { Job } from "@/lib/types";

/**
 * 冒险者须知（名词速查）：解释四维能力、大陆街区、职业体系。
 * 只输出内容不带窗框，调用方自行包裹 rpg-window / details。
 */
export function GlossaryPanel({ full = false }: { full?: boolean }) {
  return (
    <div className="space-y-2.5 text-xs leading-5">
      <section>
        <p className="mb-1 text-gold">◤ 四维能力</p>
        <ul className="space-y-1 text-dim">
          <li>
            <b className="text-paper">攻击</b> = 综合智力指数 ECI（Epoch AI 实测），恶龙判定依据
          </li>
          <li>
            <b className="text-paper">剑术</b> = SWE-bench，真实仓库修 bug 实测
          </li>
          <li>
            <b className="text-paper">体力</b> = 上下文窗口，一口气能记住多少内容
          </li>
          <li>
            <b className="text-paper">幸运</b> = 身价（每百万 tokens 输入价），越便宜越幸运
          </li>
        </ul>
      </section>
      <section>
        <p className="mb-1 text-gold">◤ 两大大陆与街区</p>
        <p className="text-dim">
          <b className="text-paper">东土大陆</b> = 国产门派；<b className="text-paper">西洋大陆</b> = 海外门派。据点按麾下勇者数量分街：头部大街 ≥20 人，主力集市 ≥5 人，其余入新兴小巷。
        </p>
      </section>
      <section>
        <p className="mb-1 text-gold">◤ 阵营与龙座</p>
        <p className="text-dim">
          <b className="text-paper">开源义军</b> = 权重公开可自部署；<b className="text-paper">王国骑士团</b> = 闭源 API。屠龙规则：综合智力（ECI）登顶者即新恶龙——屠龙者，终成恶龙。
        </p>
      </section>
      {full && (
        <section>
          <p className="mb-1 text-gold">◤ 七大职业（按模型模态受封）</p>
          <ul className="space-y-1 text-dim">
            {(Object.keys(JOB_META) as Job[]).map((j) => (
              <li key={j}>
                {JOB_META[j].icon} <b className="text-paper">{JOB_META[j].zh}</b>：{JOB_META[j].desc}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
