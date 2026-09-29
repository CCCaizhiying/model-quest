// Tiny Dungeon 风格补绘：恶龙（红黑主题）与王座。
// Kenney Tiny Dungeon 无龙/王座瓦片，这里按其风格手绘：
// 深李紫描边、2-3 阶平涂、1px 高光，16px 网格对齐。直接从矩形网格生成 SVG。

type Rect = [number, number, number, number, string];
type Pt = [number, number];

// 调色板（对齐 Tiny Dungeon）
const RED = "#c23a3a"; // 鳞甲主色
const RED_D = "#8a2830"; // 鳞甲暗部
const RED_L = "#e05850"; // 鳞甲高光
const WING = "#6e1f28"; // 翼膜
const BELLY = "#33202e"; // 玄黑腹部
const BELLY_L = "#4a2e40"; // 腹部亮
const GOLD = "#f8c848"; // 金瞳
const GOLD_L = "#fff0c0";
const HORN = "#e8dcb8"; // 角
const HORN_D = "#b8a888";
const OUT = "#3f3148"; // 鼻孔/描边
const STONE_L = "#c8d0dc"; // 王座亮
const STONE_M = "#8a94a8"; // 王座中
const STONE_D = "#5a6274"; // 王座暗
const SEAT = "#a82828"; // 座垫红
const SEAT_L = "#c23a3a";

/** 矩形按序绘制（后者覆盖）→ 贪心矩形合并 → path */
function rectsToSvg(rects: Rect[], w: number, h: number): string {
  const grid = new Map<string, string>();
  for (const [x0, y0, rw, rh, color] of rects) {
    for (let y = y0; y < y0 + rh; y++) {
      for (let x = x0; x < x0 + rw; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) grid.set(`${x},${y}`, color);
      }
    }
  }
  const groups = new Map<string, Pt[]>();
  for (const [key, color] of grid) {
    const [x, y] = key.split(",").map(Number);
    const arr = groups.get(color) ?? [];
    arr.push([x, y]);
    groups.set(color, arr);
  }
  let d = "";
  for (const [color, list] of groups) {
    const set = new Set(list.map(([x, y]) => `${x},${y}`));
    const used = new Set<string>();
    let body = "";
    for (const [x, y] of list) {
      if (used.has(`${x},${y}`)) continue;
      let w2 = 1;
      while (set.has(`${x + w2},${y}`) && !used.has(`${x + w2},${y}`)) w2++;
      let hh = 1;
      outer: for (;;) {
        for (let i = 0; i < w2; i++) {
          if (!set.has(`${x + i},${y + hh}`) || used.has(`${x + i},${y + hh}`)) break outer;
        }
        hh++;
      }
      for (let dy = 0; dy < hh; dy++) {
        for (let dx = 0; dx < w2; dx++) used.add(`${x + dx},${y + dy}`);
      }
      body += `M${x} ${y}h${w2}v${hh}h-${w2}z`;
    }
    d += `<path fill="${color}" d="${body}"/>`;
  }
  return d;
}

// ── 恶龙（24×24，面朝左，红黑主题）───────────────────────
function dragonRects(): Rect[] {
  return [
    // 翼（身后，深色，先画）
    [17, 4, 6, 2, WING],
    [18, 6, 6, 4, WING],
    [17, 10, 7, 3, WING],
    [23, 6, 1, 4, RED_D],
    [18, 7, 1, 3, RED_D],
    [21, 7, 1, 3, RED_D],
    // 尾（左侧卷起）
    [1, 19, 2, 2, RED_D],
    [2, 17, 3, 4, RED],
    [4, 15, 3, 6, RED],
    // 背鳍（沿背部）
    [7, 9, 2, 3, RED_D],
    [10, 8, 2, 4, RED_D],
    [13, 9, 2, 3, RED_D],
    // 躯干
    [5, 11, 14, 10, RED],
    [6, 11, 12, 1, RED_L],
    // 腹部（玄黑）
    [6, 16, 12, 4, BELLY],
    [6, 16, 12, 1, BELLY_L],
    [10, 17, 1, 3, RED_D],
    [14, 17, 1, 3, RED_D],
    // 腿与脚
    [7, 21, 4, 2, RED],
    [8, 23, 5, 1, RED_D],
    [14, 21, 4, 2, RED],
    [14, 23, 5, 1, RED_D],
    // 颈
    [14, 6, 5, 6, RED],
    [14, 7, 1, 5, RED_D],
    // 头
    [12, 1, 9, 6, RED],
    [13, 1, 7, 1, RED_L],
    // 吻部
    [10, 3, 3, 3, RED],
    [10, 5, 3, 1, RED_D],
    [10, 3, 1, 1, OUT],
    // 双角
    [13, 0, 2, 2, HORN],
    [13, 2, 1, 1, HORN_D],
    [19, 0, 2, 2, HORN],
    [20, 2, 1, 1, HORN_D],
    // 金瞳
    [15, 3, 2, 2, GOLD],
    [15, 3, 2, 1, GOLD_L],
    // 底部收边
    [6, 21, 13, 1, RED_D],
  ];
}

/** 恶龙立绘（红黑主题，24×24） */
export function dragonRoyalSvg(scale = 6): string {
  const d = rectsToSvg(dragonRects(), 24, 24);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${24 * scale}" height="${24 * scale}" shape-rendering="crispEdges" role="img"><title>当代恶龙</title>${d}</svg>`;
}

// ── 王座（16×24，石座金饰红垫）───────────────────────────
function throneRects(): Rect[] {
  return [
    // 顶部金饰
    [1, 0, 4, 2, GOLD],
    [11, 0, 4, 2, GOLD],
    // 背柱
    [2, 2, 2, 12, STONE_M],
    [12, 2, 2, 12, STONE_M],
    [2, 2, 1, 12, STONE_L],
    [13, 2, 1, 12, STONE_L],
    // 靠背顶
    [3, 2, 10, 1, STONE_L],
    // 背板
    [4, 3, 8, 11, STONE_M],
    [5, 4, 6, 9, STONE_D],
    [5, 4, 6, 1, STONE_M],
    // 扶手
    [0, 10, 3, 8, STONE_M],
    [13, 10, 3, 8, STONE_M],
    [0, 10, 3, 1, STONE_L],
    [13, 10, 3, 1, STONE_L],
    [1, 14, 2, 4, STONE_D],
    [13, 14, 2, 4, STONE_D],
    // 座垫（红）
    [3, 14, 10, 3, SEAT],
    [3, 14, 10, 1, SEAT_L],
    // 座基
    [2, 17, 12, 3, STONE_M],
    [2, 19, 12, 1, STONE_D],
    // 台阶
    [1, 20, 14, 2, STONE_M],
    [1, 20, 14, 1, STONE_L],
    [0, 22, 16, 2, STONE_D],
  ];
}

/** 王座立绘（16×24） */
export function throneSvg(scale = 4): string {
  const d = rectsToSvg(throneRects(), 16, 24);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 24" width="${16 * scale}" height="${24 * scale}" shape-rendering="crispEdges" role="img"><title>龙座</title>${d}</svg>`;
}
