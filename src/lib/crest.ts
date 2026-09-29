// 像素徽章：无官方图标的门派，用门派色盾牌 + 品牌首字母兜底。
import { mapSvg, type PixelMap } from "./pixelmap";
import type { RPGVendor } from "./types";

/** 3×5 像素字母表 */
const FONT: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["101", "111", "111", "111", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "110", "011"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "011"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
};

function crestMap(vendor: RPGVendor): PixelMap {
  const letter = (vendor.en.trim()[0] ?? "?").toUpperCase();
  const glyph = FONT[letter] ?? FONT.M;
  const rows: PixelMap = [
    [0, "....oooooooo"],
    [0, "...oCCCCCCCCCCo"],
    [0, "..oCCCCCCCCCCCCo"],
  ];
  // 字母（白色）：3 宽置于 x5..7，5 行置于 y3..7；盾身内壁 x2='o'、x13='o'
  glyph.forEach((bits) => {
    const seg = bits
      .split("")
      .map((b) => (b === "1" ? "w" : "."))
      .join("");
    rows.push([0, `..oCC${seg}CCCCCo`]);
  });
  rows.push(
    [0, "..oCCCCCCCCCCCCo"],
    [0, "...oCCCCCCCCCCo"],
    [0, "....oCCCCCCCo"],
    [0, ".....ooooooo"],
    [0, "......ooooo"],
    [0, ".......ooo"]
  );
  return rows;
}

/** 像素徽章 SVG */
export function crestSvg(vendor: RPGVendor, px = 4): string {
  const h = vendor.hue;
  const palette = {
    o: "#2a2337",
    C: `hsl(${h}, 45%, 46%)`,
    w: "#ffffff",
  };
  return mapSvg(crestMap(vendor), palette, { w: 14, h: 14, px, title: vendor.name });
}
