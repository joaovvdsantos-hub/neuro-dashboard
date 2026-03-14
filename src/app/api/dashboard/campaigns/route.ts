import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

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

function extractPurchases(actions: unknown): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const purchase = actions.find(
    (a: Record<string, unknown>) =>
      a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase"
  );
  return purchase ? Number(purchase.value ?? 0) : 0;
}

function extractPurchaseValue(actions: unknown): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const purchase = actions.find(
    (a: Record<string, unknown>) =>
      a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase"
  );
  return purchase ? Number(purchase.value ?? 0) : 0;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const now = new Date();
    const start = new Date(sp.get("from") || format(subDays(now, 29), "yyyy-MM-dd"));
    const end = new Date(sp.get("to") || format(now, "yyyy-MM-dd"));
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const level = sp.get("level") || "campaign"; // campaign | adset | ad

    // Get all insights for the period
    const insights = await prisma.metaAdInsight.findMany({
      where: { date: { gte: start, lte: end } },
    });

    // Group by the requested level
    const grouped = new Map<string, { id: string; name: string; impressions: number; clicks: number; spend: number; cpmSum: number; cpcSum: number; ctrSum: number; count: number; purchases: number; revenue: number }>();

    for (const row of insights) {
      let key: string;
      let name: string;

      if (level === "adset") {
        key = row.adsetId ?? row.campaignId;
        name = row.adsetName ?? row.campaignName;
      } else if (level === "ad") {
        key = row.adId ?? row.adsetId ?? row.campaignId;
        name = row.adName ?? row.adsetName ?? row.campaignName;
      } else {
        key = row.campaignId;
        name = row.campaignName;
      }

      const existing = grouped.get(key);
      const purchases = extractPurchases(row.actions);
      // For revenue, use purchase value from action_values if available, otherwise estimate
      const revenue = extractPurchaseValue(row.actions);

      if (existing) {
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.spend += row.spend;
        existing.cpmSum += row.cpm;
        existing.cpcSum += row.cpc;
        existing.ctrSum += row.ctr;
        existing.count += 1;
        existing.purchases += purchases;
        existing.revenue += revenue;
      } else {
        grouped.set(key, {
          id: key,
          name,
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.spend,
          cpmSum: row.cpm,
          cpcSum: row.cpc,
          ctrSum: row.ctr,
          count: 1,
          purchases,
          revenue,
        });
      }
    }

    // Build campaign rows
    const campaigns: CampaignRow[] = Array.from(grouped.values()).map((g) => {
      const cpm = g.count > 0 ? g.cpmSum / g.count : 0;
      const cpc = g.clicks > 0 ? g.spend / g.clicks : 0;
      const ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
      const roas = g.spend > 0 ? g.revenue / g.spend : 0;
      const cpa = g.purchases > 0 ? g.spend / g.purchases : 0;

      return {
        campaignId: g.id,
        campaignName: g.name,
        impressions: g.impressions,
        clicks: g.clicks,
        spend: +g.spend.toFixed(2),
        cpm: +cpm.toFixed(2),
        cpc: +cpc.toFixed(2),
        ctr: +ctr.toFixed(2),
        purchases: g.purchases,
        revenue: +g.revenue.toFixed(2),
        roas: +roas.toFixed(2),
        cpa: +cpa.toFixed(2),
      };
    });

    // Sort by spend descending
    campaigns.sort((a, b) => b.spend - a.spend);

    // Top/Bottom 5 by ROAS (only campaigns with spend > 0)
    const withSpend = campaigns.filter((c) => c.spend > 0);
    const sortedByRoas = [...withSpend].sort((a, b) => b.roas - a.roas);
    const top5 = sortedByRoas.slice(0, 5);
    const bottom5 = sortedByRoas.slice(-5).reverse();

    // Totals
    const totals = {
      impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
      clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
      spend: +campaigns.reduce((s, c) => s + c.spend, 0).toFixed(2),
      purchases: campaigns.reduce((s, c) => s + c.purchases, 0),
      revenue: +campaigns.reduce((s, c) => s + c.revenue, 0).toFixed(2),
    };
    const totalCtr = totals.impressions > 0 ? +((totals.clicks / totals.impressions) * 100).toFixed(2) : 0;
    const totalRoas = totals.spend > 0 ? +(totals.revenue / totals.spend).toFixed(2) : 0;
    const totalCpa = totals.purchases > 0 ? +(totals.spend / totals.purchases).toFixed(2) : 0;

    // Daily spend evolution
    const dailySpend = await prisma.dailySnapshot.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
      select: { date: true, totalSpend: true, totalImpressions: true, totalClicks: true, avgCpm: true },
    });

    const spendEvolution = dailySpend.map((d) => ({
      date: format(d.date, "yyyy-MM-dd"),
      spend: +d.totalSpend.toFixed(2),
      impressions: d.totalImpressions,
      clicks: d.totalClicks,
      cpm: +d.avgCpm.toFixed(2),
    }));

    return NextResponse.json({
      campaigns,
      top5,
      bottom5,
      totals: { ...totals, ctr: totalCtr, roas: totalRoas, cpa: totalCpa },
      spendEvolution,
    });
  } catch (err) {
    console.error("[Campaigns API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
