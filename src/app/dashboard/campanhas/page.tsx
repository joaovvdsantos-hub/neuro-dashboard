"use client";

import { Suspense, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDateRange } from "@/hooks/useDateRange";
import { fmtCurrency, fmtNumber, fmtPercent, fmtRoas } from "@/lib/format";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { format, parseISO } from "date-fns";

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  cpm: number;
  cpc: number;
  ctr: number;
  purchases: number;
  revenue: number;
  roas: number;
  cpa: number;
}

interface SpendDay {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
}

interface CampaignsResponse {
  campaigns: CampaignRow[];
  top5: CampaignRow[];
  bottom5: CampaignRow[];
  totals: {
    impressions: number;
    clicks: number;
    spend: number;
    purchases: number;
    revenue: number;
    ctr: number;
    roas: number;
    cpa: number;
  };
  spendEvolution: SpendDay[];
}

interface SpendTooltipPayload {
  value: number;
  payload: SpendDay;
}

function SpendTooltip({ active, payload }: { active?: boolean; payload?: SpendTooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm">
      <p className="text-[#A0A0A0]">{format(parseISO(d.date), "dd/MM/yyyy")}</p>
      <p className="text-white font-medium">{fmtCurrency(d.spend)}</p>
      <p className="text-[#A0A0A0]">{fmtNumber(d.impressions)} impressões</p>
    </div>
  );
}

function RankCard({ title, icon: Icon, campaigns, colorClass }: {
  title: string;
  icon: React.ElementType;
  campaigns: CampaignRow[];
  colorClass: string;
}) {
  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
      <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${colorClass}`} />
        {title}
      </h3>
      <div className="space-y-3">
        {campaigns.map((c, i) => (
          <div key={c.campaignId} className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className={`text-sm font-bold w-6 text-center ${colorClass}`}>{i + 1}</span>
              <span className="text-white text-sm truncate">{c.campaignName}</span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className={`text-sm font-medium ${colorClass}`}>{fmtRoas(c.roas)}</span>
              <span className="text-[#A0A0A0] text-xs">{fmtCurrency(c.spend)}</span>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <p className="text-[#A0A0A0] text-sm text-center py-4">Sem dados</p>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
            <div className="h-4 w-20 bg-[#1A1A1A] rounded animate-pulse mb-2" />
            <div className="h-8 w-24 bg-[#1A1A1A] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="h-[300px] bg-[#1A1A1A] rounded animate-pulse" />
      </div>
    </div>
  );
}

function CampanhasContent() {
  const { dateRange } = useDateRange();
  const [level, setLevel] = useState<string>("campaign");

  const { data, isLoading } = useDashboardData<CampaignsResponse>({
    endpoint: "/api/dashboard/campaigns",
    dateRange,
    filters: { level },
  });

  if (isLoading) return <LoadingSkeleton />;

  const totals = data?.totals;

  return (
    <div className="flex flex-col gap-6">
      {/* Totals KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Investimento Total
          </p>
          <p className="text-xl font-bold text-white">{fmtCurrency(totals?.spend ?? 0)}</p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> ROAS Geral
          </p>
          <p className={`text-xl font-bold ${(totals?.roas ?? 0) >= 1 ? "text-[#00FF9D]" : "text-[#FF4444]"}`}>
            {fmtRoas(totals?.roas ?? 0)}
          </p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">CTR Médio</p>
          <p className="text-xl font-bold text-white">{fmtPercent(totals?.ctr ?? 0)}</p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">CPA Médio</p>
          <p className="text-xl font-bold text-white">{fmtCurrency(totals?.cpa ?? 0)}</p>
        </div>
      </div>

      {/* Top 5 / Bottom 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankCard title="TOP 5 — MELHOR ROAS" icon={TrendingUp} campaigns={data?.top5 ?? []} colorClass="text-[#00FF9D]" />
        <RankCard title="BOTTOM 5 — PIOR ROAS" icon={TrendingDown} campaigns={data?.bottom5 ?? []} colorClass="text-[#FF4444]" />
      </div>

      {/* Spend Evolution */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-[#00FF9D]" />
          EVOLUÇÃO DE INVESTIMENTO
        </h2>
        {data?.spendEvolution && data.spendEvolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.spendEvolution}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="date" tickFormatter={(d: string) => format(parseISO(d), "dd/MM")} stroke="#A0A0A0" fontSize={12} />
              <YAxis tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}K` : `R$${v}`} stroke="#A0A0A0" fontSize={12} />
              <Tooltip content={<SpendTooltip />} />
              <Area type="monotone" dataKey="spend" stroke="#00FF9D" strokeWidth={2} fill="url(#spendGrad)" dot={{ fill: "#00FF9D", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-[#A0A0A0] text-sm">
            Sem dados de investimento
          </div>
        )}
      </div>

      {/* Campaign Table */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#00FF9D]" />
            DETALHAMENTO POR {level === "adset" ? "CONJUNTO" : level === "ad" ? "ANÚNCIO" : "CAMPANHA"}
          </h2>
          <div className="flex gap-1">
            {[
              { key: "campaign", label: "Campanhas" },
              { key: "adset", label: "Conjuntos" },
              { key: "ad", label: "Anúncios" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setLevel(tab.key)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  level === tab.key
                    ? "bg-[#00FF9D] text-black font-semibold"
                    : "bg-[#1A1A1A] text-[#A0A0A0] hover:bg-[#2A2A2A]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <CampaignTable data={data?.campaigns ?? []} level={level} />
      </div>
    </div>
  );
}

export default function CampanhasPage() {
  return (
    <Suspense>
      <CampanhasContent />
    </Suspense>
  );
}
