"use client";

import { Filter, AlertTriangle } from "lucide-react";

interface FunnelData {
  impressions: number;
  clicks: number;
  vslViewed: number;
  vslStarted: number;
  checkoutStarted: number | null;
  checkoutNote: string;
  purchases: number;
  upsellViewed: number;
  upsellPurchases: number;
}

interface FunnelChartProps {
  data?: FunnelData;
  isLoading?: boolean;
}

const COLORS = [
  "#FF4444", "#FF6B44", "#FF8C44", "#FFB800",
  "#FFD700", "#A8E063", "#4ECDC4", "#00FF9D",
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function calcRate(curr: number, prev: number): string {
  if (prev === 0) return "0%";
  return `${((curr / prev) * 100).toFixed(1)}%`;
}

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-40 bg-[#1A1A1A] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="h-8 bg-[#1A1A1A] rounded animate-pulse"
                style={{ width: `${100 - i * 10}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Impressões (Meta Ads)", value: data.impressions, rate: null, rateLabel: null },
    { label: "Cliques (Meta Ads)", value: data.clicks, rate: calcRate(data.clicks, data.impressions), rateLabel: "CTR" },
    { label: "Visualizações VSL", value: data.vslViewed, rate: calcRate(data.vslViewed, data.clicks), rateLabel: "Carregamento" },
    { label: "Plays VSL", value: data.vslStarted, rate: calcRate(data.vslStarted, data.vslViewed), rateLabel: "Play Rate" },
    { label: "Checkout Iniciado", value: data.checkoutStarted ?? 0, rate: calcRate(data.checkoutStarted ?? 0, data.vslStarted), rateLabel: "Conv. Pág", isEstimate: true, note: data.checkoutNote },
    { label: "Compras", value: data.purchases, rate: calcRate(data.purchases, data.checkoutStarted ?? 1), rateLabel: "Conv. Check" },
    { label: "Upsell View", value: data.upsellViewed, rate: calcRate(data.upsellViewed, data.purchases), rateLabel: "View" },
    { label: "Upsell Compra", value: data.upsellPurchases, rate: calcRate(data.upsellPurchases, data.upsellViewed), rateLabel: "Upsell" },
  ];

  const maxValue = steps[0].value || 1;

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#00FF9D]" />
          FUNIL DE VENDAS (ALL)
        </h2>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const widthPct = Math.max(8, (step.value / maxValue) * 100);
          return (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 flex items-center">
                <div className="flex items-center" style={{ width: "100%" }}>
                  <div
                    className="relative flex items-center justify-center"
                    style={{ width: `${widthPct}%`, margin: "0 auto" }}
                  >
                    <div
                      className="w-full h-9 rounded-md"
                      style={{
                        backgroundColor: COLORS[i],
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="w-[200px] flex items-center gap-2 shrink-0">
                <span className="text-[#A0A0A0] text-sm truncate">{step.label}</span>
                {step.isEstimate && (
                  <span title={step.note} className="cursor-help">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#FFB800]" />
                  </span>
                )}
              </div>
              <div className="w-[100px] text-right shrink-0">
                <span className="text-white text-sm font-medium">
                  {formatNumber(step.value)}
                </span>
              </div>
              <div className="w-[120px] text-right shrink-0">
                {step.rate && (
                  <span className="text-[#A0A0A0] text-xs">
                    {step.rateLabel}: <span className="text-white">{step.rate}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
