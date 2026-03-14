"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";

interface GenderData {
  gender: string | null;
  label: string;
  count: number;
  percentage: number;
}

interface GenderDonutProps {
  data?: GenderData[];
  isLoading?: boolean;
}

const GENDER_COLORS: Record<string, string> = {
  F: "#FF6B9D",
  M: "#4ECDC4",
  "N/D": "#666666",
};

export function GenderDonut({ data, isLoading }: GenderDonutProps) {
  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="h-5 w-48 bg-[#1A1A1A] rounded animate-pulse mb-4" />
        <div className="flex justify-center">
          <div className="w-[200px] h-[200px] rounded-full bg-[#1A1A1A] animate-pulse" />
        </div>
      </div>
    );
  }

  const chartData = (data || []).map((d) => ({
    ...d,
    color: GENDER_COLORS[d.label] || GENDER_COLORS["N/D"],
  }));

  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-[#00FF9D]" />
          GÊNERO DOS COMPRADORES
        </h2>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative">
          <ResponsiveContainer width={220} height={220}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{total}</span>
            <span className="text-xs text-[#A0A0A0]">compradores</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4 w-full">
          {chartData.map((d) => (
            <div key={d.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[#A0A0A0]">{d.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">{d.percentage.toFixed(1)}%</span>
                <span className="text-[#A0A0A0]">({d.count})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
