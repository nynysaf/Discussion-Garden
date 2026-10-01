import type { Tier } from "./types";

/** Files in public/garden-sprites/{tier}/icon_NN.png (Camp-CLAI Plant pack, shrunk to 160px). */
export const SPRITE_POOL_SIZE: Record<Tier, number> = { seed: 20, sprout: 47, theme: 48 };

/** FNV-1a 32-bit — deterministic, so a node keeps the same sprite on every screen. From Camp-CLAI. */
export function stableIndex(id: string, n: number): number {
  if (n <= 0) return 0;
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % n;
}

export function spriteUrl(tier: Tier, id: string): string {
  const index = stableIndex(id, SPRITE_POOL_SIZE[tier]);
  return `/garden-sprites/${tier}/icon_${String(index).padStart(2, "0")}.png`;
}
