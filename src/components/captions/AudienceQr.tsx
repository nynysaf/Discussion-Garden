"use client";

import { useMemo, useSyncExternalStore } from "react";
import { audienceUrl, displayUrl, qrShape } from "@/lib/qr/qr";

const QUIET_ZONE = 4;
const noSubscribe = () => () => {};

/** Corner QR → `/audience` on whatever address this screen was opened with. */
export function AudienceQr({ className = "" }: { className?: string }) {
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => null);
  const url = origin ? audienceUrl(origin) : null;
  const shape = useMemo(() => {
    if (!url) return null;
    try {
      return qrShape(url);
    } catch {
      return null;
    }
  }, [url]);
  const box = shape ? shape.size + QUIET_ZONE * 2 : 0;

  return (
    <div className={`flex items-center gap-[1vw] ${className}`}>
      <div className="text-right leading-tight">
        <p className="font-semibold">Share a question</p>
        {url && <p className="text-[0.8em] opacity-80">{displayUrl(url)}</p>}
      </div>
      {shape ? (
        <svg
          role="img"
          aria-label={`QR code for ${url}`}
          viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
          shapeRendering="crispEdges"
          className="aspect-square h-full rounded-lg bg-festival-cream"
        >
          <path d={shape.path} className="fill-festival-ink" />
        </svg>
      ) : (
        <div className="aspect-square h-full" />
      )}
    </div>
  );
}
