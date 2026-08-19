export function formatInt(n: number) {
  return n.toLocaleString();
}

export function formatCurrency(n: number) {
  return `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyChart(n: number) {
  return `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatKAxis(n: number, opts?: { currency?: boolean }) {
  const abs = Math.abs(n);
  const prefix = opts?.currency ? "RM " : "";
  if (abs >= 1_000_000) {
    const inM = n / 1_000_000;
    const rounded =
      Math.abs(inM) >= 100
        ? inM.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : inM.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return `${prefix}${rounded}M`;
  }
  if (abs >= 1000) {
    const inK = n / 1000;
    const rounded =
      Math.abs(inK) >= 100
        ? inK.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : inK.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return `${prefix}${rounded}K`;
  }
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatTooltipValue(value: unknown, name: unknown) {
  const n = Number(value ?? 0);
  const label = String(name ?? "");
  const isRevenue =
    label.toLowerCase().includes("revenue") ||
    label.toLowerCase().includes("amount");
  if (isRevenue) return [formatCurrency(n), label];
  return [n.toLocaleString(undefined, { maximumFractionDigits: 2 }), label];
}
