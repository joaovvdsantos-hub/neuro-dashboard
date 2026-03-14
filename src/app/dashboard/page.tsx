"use client";

import { Suspense } from "react";
import {
  TrendingUp,
  BarChart3,
  ShoppingCart,
  DollarSign,
  Users,
  Target,
  Receipt,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDateRange } from "@/hooks/useDateRange";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { RetentionCurve } from "@/components/dashboard/RetentionCurve";
import { DailyEvolutionChart } from "@/components/dashboard/DailyEvolutionChart";
import { SalesByRegion } from "@/components/dashboard/SalesByRegion";
import { GenderDonut } from "@/components/dashboard/GenderDonut";

interface KpiValue {
  value: number;
  change: number;
}

interface OverviewResponse {
  kpis: {
    grossRevenue: KpiValue;
    netProfit: KpiValue;
    roas: KpiValue;
    totalSales: KpiValue;
    adSpend: KpiValue;
    cpa: KpiValue;
    cpl: KpiValue;
    avgTicket: KpiValue;
  };
  sparklines: {
    revenue: number[];
    profit: number[];
    roas: number[];
    sales: number[];
    spend: number[];
    cpa: number[];
  };
  funnel: {
    impressions: number;
    clicks: number;
    vslViewed: number;
    vslStarted: number;
    checkoutStarted: number | null;
    checkoutNote: string;
    purchases: number;
    upsellViewed: number;
    upsellPurchases: number;
  };
  retention: {
    engagement: Array<{ time: number; retention: number }>;
    playRate: number;
    completionRate: number;
  } | null;
  dailyEvolution: Array<{
    date: string;
    grossRevenue: number;
    adSpend: number;
    sales: number;
    roas: number;
  }>;
  salesByRegion: Array<{
    state: string;
    stateName: string;
    count: number;
    revenue: number;
  }>;
  genderBreakdown: Array<{
    gender: string | null;
    label: string;
    count: number;
    percentage: number;
  }>;
}

function fmt(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OverviewContent() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDashboardData<OverviewResponse>({
    endpoint: "/api/dashboard/overview",
    dateRange,
  });

  const kpis = data?.kpis;
  const sparks = data?.sparklines;

  const kpiCards = [
    { title: "Faturamento Bruto", icon: TrendingUp, value: kpis ? fmt(kpis.grossRevenue.value) : "", change: kpis?.grossRevenue.change ?? 0, sparkline: sparks?.revenue },
    { title: "Lucro Líquido", icon: TrendingUp, value: kpis ? fmt(kpis.netProfit.value) : "", change: kpis?.netProfit.change ?? 0, sparkline: sparks?.profit },
    { title: "ROAS", icon: BarChart3, value: kpis ? `${kpis.roas.value.toFixed(2).replace(".", ",")}x` : "", change: kpis?.roas.change ?? 0, sparkline: sparks?.roas },
    { title: "Vendas Total", icon: ShoppingCart, value: kpis ? kpis.totalSales.value.toLocaleString("pt-BR") : "", change: kpis?.totalSales.change ?? 0, sparkline: sparks?.sales },
    { title: "Investimento", icon: DollarSign, value: kpis ? fmt(kpis.adSpend.value) : "", change: kpis?.adSpend.change ?? 0, sparkline: sparks?.spend },
    { title: "CPA", icon: Users, value: kpis ? fmt(kpis.cpa.value) : "", change: kpis ? -kpis.cpa.change : 0, sparkline: sparks?.cpa },
    { title: "CPL", icon: Target, value: kpis ? fmt(kpis.cpl.value) : "", change: kpis?.cpl.change ?? 0 },
    { title: "Ticket Médio", icon: Receipt, value: kpis ? fmt(kpis.avgTicket.value) : "", change: kpis?.avgTicket.change ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.title}
            title={card.title}
            value={card.value}
            change={card.change}
            icon={card.icon}
            sparklineData={card.sparkline}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Funil de Vendas */}
      <FunnelChart data={data?.funnel} isLoading={isLoading} />

      {/* Retenção da VSL */}
      <RetentionCurve data={data?.retention} isLoading={isLoading} />

      {/* Evolução Diária */}
      <DailyEvolutionChart data={data?.dailyEvolution} isLoading={isLoading} />

      {/* Região e Gênero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesByRegion data={data?.salesByRegion} isLoading={isLoading} />
        <GenderDonut data={data?.genderBreakdown} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewContent />
    </Suspense>
  );
}
