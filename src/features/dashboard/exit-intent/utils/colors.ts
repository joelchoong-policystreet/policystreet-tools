import type { GroupKey } from "../types";

/** Cluster groups drive colour: one hue per kind of owner, not per cluster. */
export const GROUPS: Record<GroupKey, { label: string; tag: string; hsl: string }> = {
  pri: { label: "Priority (insurer + AV)", tag: "★ Priority · Ops/CS", hsl: "217 91% 60%" },
  price: { label: "Price", tag: "Price", hsl: "38 92% 50%" },
  bug: { label: "Product bug", tag: "Product bug", hsl: "4 74% 58%" },
  req: { label: "Product request", tag: "Product request", hsl: "173 64% 38%" },
  ux: { label: "UX friction", tag: "UX friction", hsl: "262 66% 64%" },
  other: { label: "Other / not actionable", tag: "Not a fix", hsl: "215 16% 72%" },
};

export const GROUP_ORDER: GroupKey[] = ["pri", "price", "bug", "req", "ux", "other"];

export const groupColor = (g: GroupKey, alpha?: number) =>
  alpha === undefined ? `hsl(${GROUPS[g].hsl})` : `hsl(${GROUPS[g].hsl} / ${alpha})`;
