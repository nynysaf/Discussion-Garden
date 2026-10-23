import { clamp } from "./view-transform";

/** 100 = today's loose layout. 0 = a single clump. Explore defaults to 50. */
export const DENSITY_DEFAULT = 50;

/** Current (Oct 21) ForceGarden knobs — the loose end of the slider. */
const LOOSE = {
  charge: -820,
  linkGrow: 280,
  linkRelate: 380,
  linkStrength: 0.07,
  center: 0.05,
  collideScale: 1,
  seedSpread: 120,
} as const;

/** Completely clumped: gravity in, almost no repulsion, short vines. */
const TIGHT = {
  charge: 110,
  linkGrow: 28,
  linkRelate: 40,
  linkStrength: 0.6,
  center: 0.9,
  collideScale: 0.45,
  seedSpread: 16,
} as const;

export type DensityForces = {
  charge: number;
  linkGrow: number;
  linkRelate: number;
  linkStrength: number;
  center: number;
  collideScale: number;
  seedSpread: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clampDensity(density: number): number {
  return Math.round(clamp(density, 0, 100));
}

/**
 * Map a 0–100 density slider onto d3-force knobs.
 * 0 = clumped (positive charge = attract), 100 = as loose as the pre-slider garden.
 */
export function forcesForDensity(density: number): DensityForces {
  const t = clampDensity(density) / 100;
  return {
    charge: lerp(TIGHT.charge, LOOSE.charge, t),
    linkGrow: lerp(TIGHT.linkGrow, LOOSE.linkGrow, t),
    linkRelate: lerp(TIGHT.linkRelate, LOOSE.linkRelate, t),
    linkStrength: lerp(TIGHT.linkStrength, LOOSE.linkStrength, t),
    center: lerp(TIGHT.center, LOOSE.center, t),
    collideScale: lerp(TIGHT.collideScale, LOOSE.collideScale, t),
    seedSpread: lerp(TIGHT.seedSpread, LOOSE.seedSpread, t),
  };
}
