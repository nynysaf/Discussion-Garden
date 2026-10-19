/** Oversized cream paper bounds so zoom-out never flashes white (Clara topo pad idea). */

export function paperWorldBounds(viewW: number, viewH: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const padX = Math.max(640, viewW * 0.55);
  const padY = Math.max(480, viewH * 0.55);
  return {
    x: -padX,
    y: -padY,
    width: viewW + padX * 2,
    height: viewH + padY * 2,
  };
}

/** Soft wash ellipses for a poster-paper feel (deterministic). */
export function paperWashes(seed: number, count = 9): {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity: number;
  kind: "sage" | "soil" | "sun";
}[] {
  let state = seed >>> 0 || 1;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const kinds = ["sage", "soil", "sun"] as const;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      cx: rand(),
      cy: rand(),
      rx: 0.12 + rand() * 0.22,
      ry: 0.1 + rand() * 0.18,
      opacity: 0.06 + rand() * 0.1,
      kind: kinds[i % 3],
    });
  }
  return out;
}
