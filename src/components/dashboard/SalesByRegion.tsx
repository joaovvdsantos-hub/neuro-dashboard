"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MapPin } from "lucide-react";

interface RegionData {
  state: string;
  stateName: string;
  count: number;
  revenue: number;
}

interface SalesByRegionProps {
  data?: RegionData[];
  isLoading?: boolean;
}

interface TooltipPayloadEntry {
  payload: RegionData;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-medium">{d.stateName}</p>
      <p className="text-[#A0A0A0]">{d.count} vendas</p>
      <p className="text-[#00FF9D]">
        {d.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
    </div>
  );
}

export function SalesByRegion({ data, isLoading }: SalesByRegionProps) {
  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="h-5 w-40 bg-[#1A1A1A] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-[#1A1A1A] rounded animate-pulse" style={{ width: `${100 - i * 12}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const chartData = (data || []).slice(0, 12);
  const maxCount = chartData.length > 0 ? chartData[0].count : 1;

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#00FF9D]" />
          VENDAS POR REGIÃO
        </h2>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
          <XAxis type="number" stroke="#A0A0A0" fontSize={12} />
          <YAxis
            type="category"
            dataKey="state"
            stroke="#A0A0A0"
            fontSize={12}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill="#00FF9D"
                fillOpacity={0.4 + (entry.count / maxCount) * 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
