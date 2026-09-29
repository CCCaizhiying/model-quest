"use client";

// 门派徽标：优先显示 public/logos/{id}.svg（simple-icons，CC0，npm run logos 下载），
// 图片 404 时 onError 自动回退为程序化像素徽章（门派色盾牌 + 品牌首字母）。
// 纯客户端实现（不用 node:fs），服务端/客户端组件均可安全引用。
import { useState } from "react";
import { crestSvg } from "@/lib/crest";
import type { RPGVendor } from "@/lib/types";

export function BrandLogo({ vendor, px = 14 }: { vendor: RPGVendor; px?: number }) {
  const [failed, setFailed] = useState(false);
  const chipBg = `hsl(${vendor.hue}, 45%, 42%)`;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center align-middle"
      style={{
        width: px + 4,
        height: px + 4,
        background: chipBg,
        border: "2px solid #4a4468",
        borderRadius: 3,
      }}
      title={vendor.name}
    >
      {failed ? (
        <span className="pixel-sprite" dangerouslySetInnerHTML={{ __html: crestSvg(vendor, 1) }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/logos/${vendor.id}.svg`}
          alt=""
          width={px - 4}
          height={px - 4}
          style={{ imageRendering: "auto" }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
