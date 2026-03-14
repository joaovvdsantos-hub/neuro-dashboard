export function fmtCurrency(value: number): string {
  const v = Number(value) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtNumber(value: number): string {
  const v = Number(value) || 0;
  return v.toLocaleString("pt-BR");
}

export function fmtPercent(value: number, decimals = 1): string {
  const v = Number(value) || 0;
  return `${v.toFixed(decimals).replace(".", ",")}%`;
}

export function fmtRoas(value: number): string {
  const v = Number(value) || 0;
  return `${v.toFixed(2).replace(".", ",")}x`;
}

export function fmtCompact(value: number): string {
  const v = Number(value) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return fmtNumber(v);
}
