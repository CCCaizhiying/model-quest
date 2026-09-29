// 像素图基础件：手工像素图（pixel map）→ 确定性 SVG。
// 地图格式：每行 [起始x, 字符串]，数组下标即 y；未列出的行为空行，'.' 为透明。
// 输出：同色像素横向游程 + 贪心纵向合并为矩形，编码进 <path>，体积小、渲染快。

export type PixelRow = [number, string];
export type PixelMap = PixelRow[];

export function expand(map: PixelMap, w: number, h: number): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  for (let y = 0; y < map.length; y++) {
    const [x0, s] = map[y];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const x = x0 + i;
      if (c !== "." && x >= 0 && x < w && y < h) grid[y][x] = c;
    }
  }
  return grid;
}

/** 网格 → 单个 <path>（按颜色分组，矩形贪心合并） */
export function gridToPath(grid: (string | null)[][], palette: Record<string, string>): string {
  const byColor = new Map<string, Array<[number, number]>>();
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c == null) continue;
      const color = palette[c];
      if (!color) continue;
      const arr = byColor.get(color) ?? [];
      arr.push([x, y]);
      byColor.set(color, arr);
    }
  }
  let d = "";
  for (const [color, cells] of byColor) {
    const set = new Set(cells.map(([x, y]) => `${x},${y}`));
    const used = new Set<string>();
    let body = "";
    for (const [x, y] of cells) {
      if (used.has(`${x},${y}`)) continue;
      let w = 1;
      while (set.has(`${x + w},${y}`) && !used.has(`${x + w},${y}`)) w++;
      let hh = 1;
      outer: for (;;) {
        for (let i = 0; i < w; i++) {
          if (!set.has(`${x + i},${y + hh}`) || used.has(`${x + i},${y + hh}`)) break outer;
        }
        hh++;
      }
      for (let dy = 0; dy < hh; dy++) {
        for (let dx = 0; dx < w; dx++) used.add(`${x + dx},${y + dy}`);
      }
      body += `M${x} ${y}h${w}v${hh}h-${w}z`;
    }
    d += `<path fill="${color}" d="${body}"/>`;
  }
  return d;
}

export function mapSvg(
  map: PixelMap,
  palette: Record<string, string>,
  opts: { w: number; h: number; px?: number; flip?: boolean; title?: string }
): string {
  const { w, h, px = 4 } = opts;
  const body = gridToPath(expand(map, w, h), palette);
  const transform = opts.flip ? ` transform="translate(${w} 0) scale(-1 1)"` : "";
  const label = opts.title ? `<title>${opts.title}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * px}" height="${h * px}" shape-rendering="crispEdges" role="img">${label}<g${transform}>${body}</g></svg>`;
}

/** 部件叠加：patch 覆盖 base，patch 中的 '.' 擦除底层（用于镂空） */
export function overlay(base: PixelMap, patch: PixelMap, dy = 0): PixelMap {
  const rows = new Map<number, Map<number, string>>();
  const paint = (m: PixelMap, offset: number, erase: boolean) => {
    m.forEach(([x0, s], y) => {
      if (!rows.has(y + offset)) rows.set(y + offset, new Map());
      const row = rows.get(y + offset)!;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        const x = x0 + i;
        if (erase && c === ".") row.delete(x);
        else if (c !== ".") row.set(x, c);
      }
    });
  };
  paint(base, 0, false);
  paint(patch, dy, true);
  const merged: PixelMap = [];
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const cells = rows.get(y)!;
    const xs = [...cells.keys()].sort((a, b) => a - b);
    let s = "";
    let prev = -1;
    xs.forEach((x) => {
      s += ".".repeat(x - prev - 1); // 到 x=0 的绝对定位（含首空）
      s += cells.get(x);
      prev = x;
    });
    merged.push([0, s]);
  }
  return merged;
}

/** 多层叠加，从底到顶；每层可带 y 偏移 */
export function compose(layers: Array<{ m: PixelMap; dy?: number }>): PixelMap {
  return layers.reduce<PixelMap>((acc, { m, dy }) => overlay(acc, m, dy ?? 0), []);
}

/** 矩形列表 → 像素图（建筑/巨兽等直线形体用） */
export function rectsToMap(w: number, h: number, rects: Array<[number, number, number, number, string]>): PixelMap {
  const cells = new Map<number, Map<number, string>>();
  for (const [x0, y0, rw, rh, c] of rects) {
    for (let y = y0; y < y0 + rh; y++) {
      if (!cells.has(y)) cells.set(y, new Map());
      const row = cells.get(y)!;
      for (let x = x0; x < x0 + rw; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h && c !== ".") row.set(x, c);
      }
    }
  }
  const rows: PixelMap = [];
  for (const y of [...cells.keys()].sort((a, b) => a - b)) {
    const row = cells.get(y)!;
    const xs = [...row.keys()].sort((a, b) => a - b);
    let s = "";
    let prev = -1;
    xs.forEach((x) => {
      s += ".".repeat(x - prev - 1); // 到 x=0 的绝对定位（含首空）
      s += row.get(x);
      prev = x;
    });
    rows.push([0, s]);
  }
  return rows;
}
