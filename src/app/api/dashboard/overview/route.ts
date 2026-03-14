import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, differenceInDays, format } from "date-fns";
import { getUserEngagement, PLAYER_FRONT } from "@/lib/vturb";

export const dynamic = "force-dynamic";

const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
  MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia",
  RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe",
  TO: "Tocantins",
};

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return +((curr - prev) / prev * 100).toFixed(1);
}

function sumField<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + fn(item), 0);
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const now = new Date();
    const start = new Date(sp.get("from") || format(subDays(now, 29), "yyyy-MM-dd"));
    const end = new Date(sp.get("to") || format(now, "yyyy-MM-dd"));
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const periodDays = differenceInDays(end, start) + 1;
    const prevEnd = new Date(subDays(start, 1));
    prevEnd.setUTCHours(23, 59, 59, 999);
    const prevStart = new Date(subDays(start, periodDays));
    prevStart.setUTCHours(0, 0, 0, 0);

    // --- KPIs from DailySnapshot ---
    const [snapshots, prevSnapshots] = await Promise.all([
      prisma.dailySnapshot.findMany({ where: { date: { gte: start, lte: end } } }),
      prisma.dailySnapshot.findMany({ where: { date: { gte: prevStart, lte: prevEnd } } }),
    ]);

    const curr = {
      revenue: sumField(snapshots, (s) => s.totalRevenue + s.totalUpsellRevenue),
      spend: sumField(snapshots, (s) => s.totalSpend),
      sales: sumField(snapshots, (s) => s.totalSales + s.totalUpsellSales),
      frontSales: sumField(snapshots, (s) => s.totalSales),
      clicks: sumField(snapshots, (s) => s.totalClicks),
    };
    const prev = {
      revenue: sumField(prevSnapshots, (s) => s.totalRevenue + s.totalUpsellRevenue),
      spend: sumField(prevSnapshots, (s) => s.totalSpend),
      sales: sumField(prevSnapshots, (s) => s.totalSales + s.totalUpsellSales),
      frontSales: sumField(prevSnapshots, (s) => s.totalSales),
      clicks: sumField(prevSnapshots, (s) => s.totalClicks),
    };

    const profit = curr.revenue - curr.spend;
    const prevProfit = prev.revenue - prev.spend;
    const roas = curr.spend > 0 ? curr.revenue / curr.spend : 0;
    const prevRoas = prev.spend > 0 ? prev.revenue / prev.spend : 0;
    const cpa = curr.frontSales > 0 ? curr.spend / curr.frontSales : 0;
    const prevCpa = prev.frontSales > 0 ? prev.spend / prev.frontSales : 0;
    const cpl = curr.clicks > 0 ? curr.spend / curr.clicks : 0;
    const prevCpl = prev.clicks > 0 ? prev.spend / prev.clicks : 0;
    const avgTicket = curr.sales > 0 ? curr.revenue / curr.sales : 0;
    const prevAvgTicket = prev.sales > 0 ? prev.revenue / prev.sales : 0;

    const kpis = {
      grossRevenue: { value: +curr.revenue.toFixed(2), change: calcChange(curr.revenue, prev.revenue) },
      netProfit: { value: +profit.toFixed(2), change: calcChange(profit, prevProfit) },
      roas: { value: +roas.toFixed(2), change: calcChange(roas, prevRoas) },
      totalSales: { value: curr.sales, change: calcChange(curr.sales, prev.sales) },
      adSpend: { value: +curr.spend.toFixed(2), change: calcChange(curr.spend, prev.spend) },
      cpa: { value: +cpa.toFixed(2), change: calcChange(cpa, prevCpa) },
      cpl: { value: +cpl.toFixed(2), change: calcChange(cpl, prevCpl) },
      avgTicket: { value: +avgTicket.toFixed(2), change: calcChange(avgTicket, prevAvgTicket) },
    };

    // --- Funnel ---
    const [metaAgg, vturbFrontAgg, vturbUpsellAgg, frontPurchases, upsellPurchases] = await Promise.all([
      prisma.metaAdInsight.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { impressions: true, clicks: true },
      }),
      prisma.vturbMetric.aggregate({
        where: { date: { gte: start, lte: end }, playerId: process.env.VTURB_PLAYER_FRONT },
        _sum: { totalViewed: true, totalStarted: true, totalFinished: true },
      }),
      prisma.vturbMetric.aggregate({
        where: { date: { gte: start, lte: end }, playerId: process.env.VTURB_PLAYER_UPSELL },
        _sum: { totalViewed: true, totalStarted: true, totalFinished: true },
      }),
      prisma.hotmartSale.count({
        where: { status: "approved", isUpsell: false, approvedDate: { gte: start, lte: end } },
      }),
      prisma.hotmartSale.count({
        where: { status: "approved", isUpsell: true, approvedDate: { gte: start, lte: end } },
      }),
    ]);

    const vslStarted = vturbFrontAgg._sum.totalStarted ?? 0;
    const checkoutStarted = Math.round(vslStarted * 0.15);

    const funnel = {
      impressions: metaAgg._sum.impressions ?? 0,
      clicks: metaAgg._sum.clicks ?? 0,
      vslViewed: vturbFrontAgg._sum.totalViewed ?? 0,
      vslStarted,
      checkoutStarted,
      checkoutNote: "Estimativa: Hotmart não fornece evento nativo de checkout iniciado. Valor calculado como 15% dos plays da VSL.",
      purchases: frontPurchases,
      upsellViewed: vturbUpsellAgg._sum.totalViewed ?? 0,
      upsellPurchases,
    };

    // --- Retention (call Vturb API) ---
    let retention: { engagement: Array<{ time: number; retention: number }>; playRate: number; completionRate: number } | null = null;
    try {
      const videoDuration = parseInt(process.env.VTURB_VIDEO_DURATION ?? "1800");
      const pitchTime = parseInt(process.env.VTURB_PITCH_TIME ?? "900");

      const engResult = await getUserEngagement(
        PLAYER_FRONT,
        format(start, "yyyy-MM-dd"),
        format(end, "yyyy-MM-dd"),
        videoDuration,
        pitchTime,
      );

      const viewed = vturbFrontAgg._sum.totalViewed ?? 1;
      const started = vturbFrontAgg._sum.totalStarted ?? 0;
      const finished = vturbFrontAgg._sum.totalFinished ?? 0;

      retention = {
        engagement: (engResult.data?.retention ?? []).map((r) => ({ time: r.second, retention: r.percentage })),
        playRate: viewed > 0 ? +(started / viewed * 100).toFixed(1) : 0,
        completionRate: started > 0 ? +(finished / started * 100).toFixed(1) : 0,
      };
    } catch (err) {
      console.error("[Overview] Vturb engagement fetch error:", err);
    }

    // If retention is null, build from DB data
    if (!retention) {
      const viewed = vturbFrontAgg._sum.totalViewed ?? 1;
      const started = vturbFrontAgg._sum.totalStarted ?? 0;
      const finished = vturbFrontAgg._sum.totalFinished ?? 0;
      retention = {
        engagement: [],
        playRate: viewed > 0 ? +(started / viewed * 100).toFixed(1) : 0,
        completionRate: started > 0 ? +(finished / started * 100).toFixed(1) : 0,
      };
    }

    // --- Daily Evolution ---
    const dailySnapshots = await prisma.dailySnapshot.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    const dailyEvolution = dailySnapshots.map((s) => ({
      date: format(s.date, "yyyy-MM-dd"),
      grossRevenue: +(s.totalRevenue + s.totalUpsellRevenue).toFixed(2),
      adSpend: +s.totalSpend.toFixed(2),
      sales: s.totalSales + s.totalUpsellSales,
      roas: s.totalSpend > 0 ? +((s.totalRevenue + s.totalUpsellRevenue) / s.totalSpend).toFixed(2) : 0,
    }));

    // --- Sales by Region ---
    const regionRaw = await prisma.hotmartSale.groupBy({
      by: ["buyerState"],
      where: {
        status: "approved",
        approvedDate: { gte: start, lte: end },
        buyerState: { not: null },
      },
      _count: { id: true },
      _sum: { priceValue: true },
      orderBy: { _count: { id: "desc" } },
    });

    const salesByRegion = regionRaw.map((r) => ({
      state: r.buyerState ?? "",
      stateName: UF_NAMES[r.buyerState ?? ""] ?? r.buyerState ?? "",
      count: r._count.id,
      revenue: +(r._sum.priceValue ?? 0).toFixed(2),
    }));

    // --- Gender Breakdown ---
    const genderRaw = await prisma.hotmartSale.groupBy({
      by: ["buyerGender"],
      where: {
        status: "approved",
        approvedDate: { gte: start, lte: end },
      },
      _count: { id: true },
    });

    const totalBuyers = genderRaw.reduce((s, g) => s + g._count.id, 0);
    const genderBreakdown = genderRaw.map((g) => ({
      gender: g.buyerGender,
      label: g.buyerGender === "M" ? "Masculino" : g.buyerGender === "F" ? "Feminino" : "N/D",
      count: g._count.id,
      percentage: totalBuyers > 0 ? +((g._count.id / totalBuyers) * 100).toFixed(1) : 0,
    }));

    // --- Sparkline data for KPIs ---
    const sparklines = {
      revenue: dailySnapshots.map((s) => s.totalRevenue + s.totalUpsellRevenue),
      profit: dailySnapshots.map((s) => s.totalRevenue + s.totalUpsellRevenue - s.totalSpend),
      roas: dailySnapshots.map((s) => s.totalSpend > 0 ? (s.totalRevenue + s.totalUpsellRevenue) / s.totalSpend : 0),
      sales: dailySnapshots.map((s) => s.totalSales + s.totalUpsellSales),
      spend: dailySnapshots.map((s) => s.totalSpend),
      cpa: dailySnapshots.map((s) => s.totalSales > 0 ? s.totalSpend / s.totalSales : 0),
    };

    return NextResponse.json({
      kpis,
      sparklines,
      funnel,
      retention,
      dailyEvolution,
      salesByRegion,
      genderBreakdown,
    });
  } catch (err) {
    console.error("[Overview API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
