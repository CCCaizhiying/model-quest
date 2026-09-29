import { BestiaryClient } from "@/components/BestiaryClient";
import { getSnapshot } from "@/lib/snapshot";

export const metadata = { title: "勇者图鉴 · Model Quest" };

export default async function BestiaryPage() {
  const snap = await getSnapshot();
  return <BestiaryClient vendors={snap.vendors} models={snap.models} dragonSlug={snap.dragon?.slug ?? null}
        generatedAt={snap.generatedAt}
      />;
}
