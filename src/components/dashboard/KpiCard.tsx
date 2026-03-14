"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, YAxis } from "recharts";

interface KpiCardProps {
  title: string;
  value: string;
  change: number;
  icon: LucideIcon;
  sparklineData?: number[];
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  sparklineData,
  isLoading,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 bg-[#1A1A1A] rounded animate-pulse" />
          <div className="h-4 w-4 bg-[#1A1A1A] rounded animate-pulse" />
        </div>
        <div className="h-8 w-32 bg-[#1A1A1A] rounded animate-pulse mt-3" />
        <div className="h-3 w-16 bg-[#1A1A1A] rounded animate-pulse mt-3" />
      </div>
    );
  }

  const changeColor =
    change > 0
      ? "text-[#00FF9D]"
      : change < 0
        ? "text-[#FF4444]"
        : "text-[#A0A0A0]";

  const chartData = sparklineData?.map((v) => ({ v }));

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#A0A0A0] uppercase tracking-wider">
          {title}
        </span>
        <Icon className="w-4 h-4 text-[#A0A0A0]" />
      </div>

      <div className="text-2xl font-bold text-white mt-2">{value}</div>

      <div className="flex items-center justify-between mt-3">
        <div className={`flex items-center gap-1 text-xs font-medium ${changeColor}`}>
          {change > 0 && <TrendingUp className="w-3 h-3" />}
          {change < 0 && <TrendingDown className="w-3 h-3" />}
          <span>
            {change > 0
              ? `+${change.toFixed(1)}%`
              : change < 0
                ? `${change.toFixed(1)}%`
                : "0%"}
          </span>
        </div>

        {chartData && chartData.length > 0 && (() => {
          const gradientId = `spark-${title.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <AreaChart width={60} height={30} data={chartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#00FF9D"
                fill={`url(#${gradientId})`}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          );
        })()}
      </div>
    </div>
  );
}
