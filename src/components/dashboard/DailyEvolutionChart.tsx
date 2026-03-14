"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DailyData {
  date: string;
  grossRevenue: number;
  adSpend: number;
  sales: number;
  roas: number;
}

interface DailyEvolutionChartProps {
  data?: DailyData[];
  isLoading?: boolean;
}

type MetricKey = "grossRevenue" | "adSpend" | "sales" | "roas";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "grossRevenue", label: "Faturamento" },
  { key: "adSpend", label: "Investimento" },
  { key: "sales", label: "Vendas" },
  { key: "roas", label: "ROAS" },
];

function formatValue(value: number, metric: MetricKey): string {
  if (metric === "roas") return `${value.toFixed(2)}x`;
  if (metric === "sales") return value.toLocaleString("pt-BR");
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface TooltipPayloadEntry {
  value: number;
  payload: DailyData;
}

function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  metric: MetricKey;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm">
      <p className="text-[#A0A0A0]">{format(parseISO(d.date), "dd/MM/yyyy")}</p>
      <p className="text-white font-medium">{formatValue(payload[0].value, metric)}</p>
    </div>
  );
}

export function DailyEvolutionChart({ data, isLoading }: DailyEvolutionChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("grossRevenue");

  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="h-5 w-40 bg-[#1A1A1A] rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-[#1A1A1A] rounded animate-pulse" />
      </div>
    );
  }

  const yTickFormatter = (v: number) => {
    if (activeMetric === "roas") return `${v}x`;
    if (activeMetric === "sales") return String(v);
    if (v >= 1000) return `R$${(v / 1000).toFixed(0)}K`;
    return `R$${v}`;
  };

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00FF9D]" />
          EVOLUÇÃO DIÁRIA
        </h2>
        <div className="flex gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                activeMetric === m.key
                  ? "bg-[#00FF9D] text-black font-semibold"
                  : "bg-[#1A1A1A] text-[#A0A0A0] hover:bg-[#2A2A2A]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), "dd/MM")}
            stroke="#A0A0A0"
            fontSize={12}
          />
          <YAxis
            tickFormatter={yTickFormatter}
            stroke="#A0A0A0"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip metric={activeMetric} />} />
          <Area
            type="monotone"
            dataKey={activeMetric}
            stroke="#00FF9D"
            strokeWidth={2}
            fill="url(#dailyGradient)"
            dot={{ fill: "#00FF9D", r: 3 }}
            activeDot={{ fill: "#00FF9D", r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
