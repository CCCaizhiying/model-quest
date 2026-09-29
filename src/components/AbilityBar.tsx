import type { Ability } from "@/lib/rank";

/** 单条能力条：数值缺失显示「？？？空槽」 */
export function AbilityBar({ ability }: { ability: Ability }) {
  const pct = ability.value != null ? Math.round(ability.value * 100) : null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-xs text-dim">{ability.label}</span>
      <div className={`rpg-bar flex-1 ${pct == null ? "rpg-bar__unknown" : ""}`}>
        {pct != null && (
          <div className="rpg-bar__fill" style={{ width: `${pct}%`, backgroundColor: ability.color }} />
        )}
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-paper">{pct != null ? pct : "--"}</span>
    </div>
  );
}
