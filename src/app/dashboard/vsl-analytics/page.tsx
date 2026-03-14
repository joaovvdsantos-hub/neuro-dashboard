"use client";

import { Suspense } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Activity,
  Eye,
  Play,
  CheckCircle,
  Users,
  Clock,
  Zap,
  MonitorPlay,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDateRange } from "@/hooks/useDateRange";
import { fmtNumber, fmtPercent } from "@/lib/format";
import { format, parseISO } from "date-fns";

interface VslKpis {
  totalViews: number;
  totalStarted: number;
  totalFinished: number;
  uniqueSessions: number;
  playRate: number;
  completionRate: number;
  engagementRate: number;
  avgWatchTime: number;
  conversions: number;
  liveUsers: number;
}

interface DailyRow {
  date: string;
  frontViews: number;
  frontStarts: number;
  frontFinished: number;
  frontPlayRate: number;
  upsellViews: number;
  upsellStarts: number;
  upsellFinished: number;
  upsellPlayRate: number;
}

interface RetentionPoint {
  time: number;
  retention: number;
}

interface RetentionData {
  engagement: RetentionPoint[];
  avgWatchTime: number;
  medianWatchTime: number;
}

interface TrafficRow {
  origin: string;
  views: number;
  started: number;
  finished: number;
  conversions: number;
  playRate: number;
  completionRate: number;
}

interface VslResponse {
  frontKpis: VslKpis;
  upsellKpis: VslKpis;
  dailyEvolution: DailyRow[];
  frontRetention: RetentionData;
  upsellRetention: RetentionData;
  trafficOrigin: TrafficRow[];
  dbSparkline: Array<{ date: string; views: number; starts: number; playRate: number }>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function KpiMini({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[#A0A0A0] text-xs uppercase tracking-wider">
        <Icon className="w-4 h-4 text-[#00FF9D]" />
        {label}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[#A0A0A0]">{sub}</p>}
    </div>
  );
}

interface EngTooltipPayload {
  value: number;
  payload: RetentionPoint;
}

function EngagementTooltip({ active, payload }: { active?: boolean; payload?: EngTooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm">
      <p className="text-[#A0A0A0]">Tempo: {formatTime(d.time)}</p>
      <p className="text-white font-medium">Retidos: {d.retention.toFixed(1)}%</p>
    </div>
  );
}

interface DailyTooltipPayload {
  name: string;
  value: number;
  color: string;
  payload: DailyRow;
}

function DailyTooltip({ active, payload }: { active?: boolean; payload?: DailyTooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm">
      <p className="text-[#A0A0A0] mb-1">{format(parseISO(d.date), "dd/MM/yyyy")}</p>
      <p className="text-[#00FF9D]">Front: {fmtNumber(d.frontViews)} views / {fmtNumber(d.frontStarts)} plays</p>
      <p className="text-[#FFB800]">Upsell: {fmtNumber(d.upsellViews)} views / {fmtNumber(d.upsellStarts)} plays</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
            <div className="h-4 w-20 bg-[#1A1A1A] rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-[#1A1A1A] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="h-5 w-40 bg-[#1A1A1A] rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-[#1A1A1A] rounded animate-pulse" />
      </div>
    </div>
  );
}

function VslContent() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDashboardData<VslResponse>({
    endpoint: "/api/dashboard/vsl",
    dateRange,
  });

  if (isLoading) return <LoadingSkeleton />;

  const front = data?.frontKpis;
  const upsell = data?.upsellKpis;
  const pitchTime = parseInt(process.env.NEXT_PUBLIC_PITCH_TIME ?? "900");
  const ctaTime = 1500;

  return (
    <div className="flex flex-col gap-6">
      {/* Front VSL KPIs */}
      <div>
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-[#00FF9D]" />
          VSL PRINCIPAL — Neuro Academy
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiMini icon={Eye} label="Views" value={fmtNumber(front?.totalViews ?? 0)} />
          <KpiMini icon={Play} label="Plays" value={fmtNumber(front?.totalStarted ?? 0)} />
          <KpiMini icon={Activity} label="Play Rate" value={fmtPercent(front?.playRate ?? 0)} />
          <KpiMini icon={CheckCircle} label="Completion" value={fmtPercent(front?.completionRate ?? 0)} />
          <KpiMini
            icon={Clock}
            label="Tempo Médio"
            value={formatTime(front?.avgWatchTime ?? 0)}
            sub={`${fmtNumber(front?.uniqueSessions ?? 0)} sessões`}
          />
        </div>
      </div>

      {/* Upsell VSL KPIs */}
      <div>
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-[#FFB800]" />
          VSL UPSELL — Protocolos de Neuromodulação
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiMini icon={Eye} label="Views" value={fmtNumber(upsell?.totalViews ?? 0)} />
          <KpiMini icon={Play} label="Plays" value={fmtNumber(upsell?.totalStarted ?? 0)} />
          <KpiMini icon={Activity} label="Play Rate" value={fmtPercent(upsell?.playRate ?? 0)} />
          <KpiMini icon={CheckCircle} label="Completion" value={fmtPercent(upsell?.completionRate ?? 0)} />
          <KpiMini
            icon={Clock}
            label="Tempo Médio"
            value={formatTime(upsell?.avgWatchTime ?? 0)}
            sub={`${fmtNumber(upsell?.uniqueSessions ?? 0)} sessões`}
          />
        </div>
      </div>

      {/* Live Users */}
      {(front?.liveUsers ?? 0) > 0 || (upsell?.liveUsers ?? 0) > 0 ? (
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse" />
            <span className="text-[#A0A0A0] text-sm">Ao vivo agora:</span>
          </div>
          <span className="text-white font-medium">
            Front: <span className="text-[#00FF9D]">{front?.liveUsers ?? 0}</span>
          </span>
          <span className="text-white font-medium">
            Upsell: <span className="text-[#FFB800]">{upsell?.liveUsers ?? 0}</span>
          </span>
        </div>
      ) : null}

      {/* Retention Curves - Front */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[#00FF9D]" />
          RETENÇÃO — VSL PRINCIPAL
        </h2>
        <div className="flex gap-6">
          <div className="flex-1">
            {data?.frontRetention?.engagement && data.frontRetention.engagement.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.frontRetention.engagement}>
                  <defs>
                    <linearGradient id="retGradFront" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="time" tickFormatter={formatTime} stroke="#A0A0A0" fontSize={12} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#A0A0A0" fontSize={12} />
                  <Tooltip content={<EngagementTooltip />} />
                  <ReferenceLine x={pitchTime} stroke="#FFB800" strokeDasharray="5 5" label={{ value: "Pitch", fill: "#FFB800", fontSize: 12, position: "top" }} />
                  <ReferenceLine x={ctaTime} stroke="#00FF9D" strokeDasharray="5 5" label={{ value: "CTA", fill: "#00FF9D", fontSize: 12, position: "top" }} />
                  <Area type="monotone" dataKey="retention" stroke="#00FF9D" strokeWidth={2} fill="url(#retGradFront)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[#A0A0A0] text-sm">
                Dados de retenção indisponíveis para o período
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4 w-40 shrink-0">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
              <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">Tempo Médio</p>
              <p className="text-2xl font-bold text-white">{formatTime(data?.frontRetention?.avgWatchTime ?? 0)}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
              <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">Mediana</p>
              <p className="text-2xl font-bold text-white">{formatTime(data?.frontRetention?.medianWatchTime ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Retention Curves - Upsell */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[#FFB800]" />
          RETENÇÃO — VSL UPSELL
        </h2>
        {data?.upsellRetention?.engagement && data.upsellRetention.engagement.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.upsellRetention.engagement}>
              <defs>
                <linearGradient id="retGradUpsell" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFB800" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FFB800" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="time" tickFormatter={formatTime} stroke="#A0A0A0" fontSize={12} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#A0A0A0" fontSize={12} />
              <Tooltip content={<EngagementTooltip />} />
              <Area type="monotone" dataKey="retention" stroke="#FFB800" strokeWidth={2} fill="url(#retGradUpsell)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-[#A0A0A0] text-sm">
            Dados de retenção do upsell indisponíveis
          </div>
        )}
      </div>

      {/* Daily Evolution */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#00FF9D]" />
          EVOLUÇÃO DIÁRIA DE VIEWS
        </h2>
        {data?.dailyEvolution && data.dailyEvolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailyEvolution}>
              <defs>
                <linearGradient id="dailyFrontGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dailyUpsellGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFB800" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#FFB800" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="date" tickFormatter={(d: string) => format(parseISO(d), "dd/MM")} stroke="#A0A0A0" fontSize={12} />
              <YAxis stroke="#A0A0A0" fontSize={12} />
              <Tooltip content={<DailyTooltip />} />
              <Area type="monotone" dataKey="frontViews" stroke="#00FF9D" strokeWidth={2} fill="url(#dailyFrontGrad)" dot={{ fill: "#00FF9D", r: 3 }} name="Front Views" />
              <Area type="monotone" dataKey="upsellViews" stroke="#FFB800" strokeWidth={2} fill="url(#dailyUpsellGrad)" dot={{ fill: "#FFB800", r: 3 }} name="Upsell Views" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-[#A0A0A0] text-sm">
            Sem dados para o período
          </div>
        )}
        <div className="flex gap-6 mt-3 justify-center">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-1 rounded bg-[#00FF9D]" />
            <span className="text-[#A0A0A0]">VSL Principal</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-1 rounded bg-[#FFB800]" />
            <span className="text-[#A0A0A0]">VSL Upsell</span>
          </div>
        </div>
      </div>

      {/* Traffic Origin */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#00FF9D]" />
          ORIGEM DO TRÁFEGO
        </h2>
        {data?.trafficOrigin && data.trafficOrigin.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.trafficOrigin.slice(0, 10)} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
                <XAxis type="number" stroke="#A0A0A0" fontSize={12} />
                <YAxis type="category" dataKey="origin" stroke="#A0A0A0" fontSize={12} width={80} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as TrafficRow;
                    return (
                      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm">
                        <p className="text-white font-medium">{d.origin}</p>
                        <p className="text-[#A0A0A0]">{fmtNumber(d.views)} views</p>
                        <p className="text-[#00FF9D]">Play Rate: {fmtPercent(d.playRate)}</p>
                        <p className="text-[#A0A0A0]">Completion: {fmtPercent(d.completionRate)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                  {data.trafficOrigin.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill="#00FF9D" fillOpacity={0.4 + (1 - i / 10) * 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left text-[#A0A0A0] py-2 font-medium">Origem</th>
                    <th className="text-right text-[#A0A0A0] py-2 font-medium">Views</th>
                    <th className="text-right text-[#A0A0A0] py-2 font-medium">Plays</th>
                    <th className="text-right text-[#A0A0A0] py-2 font-medium">Play Rate</th>
                    <th className="text-right text-[#A0A0A0] py-2 font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trafficOrigin.map((t) => (
                    <tr key={t.origin} className="border-b border-[#1A1A1A]">
                      <td className="py-2 text-white">{t.origin}</td>
                      <td className="py-2 text-right text-[#A0A0A0]">{fmtNumber(t.views)}</td>
                      <td className="py-2 text-right text-[#A0A0A0]">{fmtNumber(t.started)}</td>
                      <td className="py-2 text-right text-[#00FF9D]">{fmtPercent(t.playRate)}</td>
                      <td className="py-2 text-right text-[#A0A0A0]">{fmtPercent(t.completionRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-[#A0A0A0] text-sm">
            Sem dados de tráfego para o período
          </div>
        )}
      </div>
    </div>
  );
}

export default function VslAnalyticsPage() {
  return (
    <Suspense>
      <VslContent />
    </Suspense>
  );
}
