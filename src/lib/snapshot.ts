// 快照访问层：构建期从 data/models.json 读取（静态导出下即构建时数据）。
import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { RPGModel, RPGVendor, Snapshot } from "./types";

export const getSnapshot = cache(async (): Promise<Snapshot> => {
  const p = path.join(process.cwd(), "data", "models.json");
  return JSON.parse(await fs.readFile(p, "utf8"));
});

export async function getVendorMap(): Promise<Map<string, RPGVendor>> {
  const snap = await getSnapshot();
  return new Map(snap.vendors.map((v) => [v.id, v]));
}

export async function getModelBySlug(slug: string): Promise<{ model: RPGModel; vendor: RPGVendor } | null> {
  const snap = await getSnapshot();
  const model = snap.models.find((m) => m.slug === slug);
  if (!model) return null;
  const vendor = snap.vendors.find((v) => v.id === model.vendor)!;
  return { model, vendor };
}

/** 同门派其他模型（按发布时间倒序） */
export async function getKinModels(model: RPGModel, limit = 8): Promise<RPGModel[]> {
  const snap = await getSnapshot();
  return snap.models
    .filter((m) => m.vendor === model.vendor && m.slug !== model.slug)
    .sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""))
    .slice(0, limit);
}

/** 家族进化树：同 family 的历代（跨厂商同名 family 不常见，按 vendor+family） */
export async function getFamilyLine(model: RPGModel): Promise<RPGModel[]> {
  const snap = await getSnapshot();
  return snap.models
    .filter((m) => m.vendor === model.vendor && m.family && m.family === model.family)
    .sort((a, b) => (a.releasedAt ?? "9999").localeCompare(b.releasedAt ?? "9999"));
}
