export type Tier = "seed" | "sprout" | "theme";
export type VineKind = "grows_into" | "relates_to";

export const TIERS: Tier[] = ["seed", "sprout", "theme"];

export type GardenNode = {
  id: string;
  tier: Tier;
  label: string;
  weight: number;
  originSessionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GardenVine = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: VineKind;
};

export type Garden = { nodes: GardenNode[]; vines: GardenVine[] };
