// 像素形象组件：基于 Kenney Tiny Dungeon 素材（CC0）。
// 瓦片 16×16，打包图 12 列；用 background-position 裁切，image-rendering: pixelated 放大。
// 门派区分：CSS hue-rotate 按门派色相旋转（素材基准色相 ≈30° 暖棕）。
import { dragonRoyalSvg, throneSvg } from "@/lib/kenney-extra";
import type { Job, RPGModel, RPGVendor } from "@/lib/types";

const T = 16;
const COLS = 12;
const SHEET_W = 192;
const SHEET_H = 176;

/** 职业 → Tiny Dungeon 瓦片索引 */
export const JOB_TILE: Record<Job, number> = {
  warrior: 96, // 重甲骑士
  archer: 112, // 绿兜帽游侠
  spellblade: 87, // 角盔魔剑士
  painter: 99, // 粉发画师
  illusionist: 111, // 幻兽使
  bard: 88, // 橘发吟游人
  runecaster: 84, // 紫帽法师
};

const HOUSE_TILES = [1, 2, 3, 13, 14, 15, 25, 26, 27]; // 3×3 城堡门

function tileStyle(index: number, scale: number, hue?: number): React.CSSProperties {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    width: T * scale,
    height: T * scale,
    backgroundImage: "url(/sprites/td/tilemap_packed.png)",
    backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
    backgroundPosition: `-${col * T * scale}px -${row * T * scale}px`,
    imageRendering: "pixelated",
    filter: hue != null ? `hue-rotate(${hue - 30}deg) saturate(1.05)` : undefined,
    display: "inline-block",
  };
}

/** 像素勇者立绘（职业瓦片 + 门派色相） */
export function Sprite({
  model,
  vendor,
  scale = 3,
  className = "",
}: {
  model: RPGModel;
  vendor: RPGVendor;
  scale?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={model.name}
      className={`inline-block shrink-0 ${className}`}
      style={tileStyle(JOB_TILE[model.job], scale, vendor.hue)}
      title={model.name}
    />
  );
}

/** 门派据点（3×3 城堡 + 门派色相） */
export function House({ vendor, scale = 2, className = "" }: { vendor: RPGVendor; scale?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={vendor.name}
      className={`inline-grid shrink-0 ${className}`}
      style={{ gridTemplateColumns: `repeat(3, ${T * scale}px)`, lineHeight: 0 }}
      title={vendor.name}
    >
      {HOUSE_TILES.map((t) => (
        <span key={t} style={tileStyle(t, scale, vendor.hue)} />
      ))}
    </span>
  );
}

/** 恶龙（红色双翼龙，Kenney 自带红金配色；crown/scheme 语义保留） */
export function Dragon({
  vendor,
  scale = 5,
  crown = false,
  scheme = "vendor",
  className = "",
}: {
  vendor: RPGVendor;
  scale?: number;
  crown?: boolean;
  scheme?: "vendor" | "royal";
  className?: string;
}) {
  void scheme;
  return (
    <span
      role="img"
      aria-label="当代恶龙"
      className={`pixel-sprite inline-block shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: dragonRoyalSvg(scale) }}
      title="当代恶龙"
    />
  );
}

/** 王座（黑刺王座） */
export function Throne({ scale = 4, className = "" }: { scale?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="龙座"
      className={`pixel-sprite inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: throneSvg(scale) }}
      title="龙座"
    />
  );
}
