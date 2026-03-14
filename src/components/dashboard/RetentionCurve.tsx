"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";

interface RetentionData {
  engagement: Array<{ time: number; retention: number }>;
  playRate: number;
  completionRate: number;
}

interface RetentionCurveProps {
  data?: RetentionData | null;
  isLoading?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface TooltipPayloadEntry {
  value: number;
  payload: { time: number; retention: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm">
      <p className="text-[#A0A0A0]">Tempo: {formatTime(d.time)}</p>
      <p className="text-white font-medium">Retidos: {d.retention.toFixed(1)}%</p>
    </div>
  );
}

export function RetentionCurve({ data, isLoading }: RetentionCurveProps) {
  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="h-5 w-40 bg-[#1A1A1A] rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-[#1A1A1A] rounded animate-pulse" />
      </div>
    );
  }

  const hasEngagement = data?.engagement && data.engagement.length > 0;
  const pitchTime = parseInt(process.env.NEXT_PUBLIC_PITCH_TIME ?? "900");
  const ctaTime = 1500;

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#00FF9D]" />
          RETENÇÃO DA VSL
        </h2>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {hasEngagement ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data!.engagement}>
                <defs>
                  <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTime}
                  stroke="#A0A0A0"
                  fontSize={12}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  stroke="#A0A0A0"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  x={pitchTime}
                  stroke="#FFB800"
                  strokeDasharray="5 5"
                  label={{ value: "Pitch", fill: "#FFB800", fontSize: 12, position: "top" }}
                />
                <ReferenceLine
                  x={ctaTime}
                  stroke="#00FF9D"
                  strokeDasharray="5 5"
                  label={{ value: "CTA", fill: "#00FF9D", fontSize: 12, position: "top" }}
                />
                <Area
                  type="monotone"
                  dataKey="retention"
                  stroke="#00FF9D"
                  strokeWidth={2}
                  fill="url(#retentionGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#A0A0A0] text-sm">
              Dados de retenção indisponíveis para o período selecionado
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 w-40 shrink-0">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
            <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">Play Rate</p>
            <p className="text-2xl font-bold text-white">{data?.playRate ?? 0}%</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
            <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-white">{data?.completionRate ?? 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
