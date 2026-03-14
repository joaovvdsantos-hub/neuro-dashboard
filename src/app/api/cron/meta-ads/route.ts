import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getAdInsights, type MetaInsight } from "@/lib/meta-ads";
import { format, subDays } from "date-fns";

export const dynamic = "force-dynamic";

function validateSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === process.env.CRON_SECRET;
  }
  const secret = request.nextUrl.searchParams.get("secret");
  return secret === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const since = format(subDays(today, 7), "yyyy-MM-dd");
    const until = format(today, "yyyy-MM-dd");

    const insights = await getAdInsights({ since, until });

    let upserted = 0;

    for (const row of insights) {
      const date = new Date(row.date_start);
      date.setUTCHours(0, 0, 0, 0);

      const actionsValue = row.actions
        ? (row.actions as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;

      await prisma.metaAdInsight.upsert({
        where: {
          date_campaignId_adsetId_adId: {
            date,
            campaignId: row.campaign_id ?? "",
            adsetId: row.adset_id ?? "",
            adId: row.ad_id ?? "",
          },
        },
        update: {
          campaignName: row.campaign_name ?? "",
          adsetName: row.adset_name,
          adName: row.ad_name,
          impressions: parseInt(row.impressions),
          clicks: parseInt(row.clicks),
          spend: parseFloat(row.spend),
          cpm: parseFloat(row.cpm),
          cpc: parseFloat(row.cpc || "0"),
          ctr: parseFloat(row.ctr),
          actions: actionsValue,
        },
        create: {
          date,
          campaignId: row.campaign_id ?? "",
          campaignName: row.campaign_name ?? "",
          adsetId: row.adset_id,
          adsetName: row.adset_name,
          adId: row.ad_id,
          adName: row.ad_name,
          impressions: parseInt(row.impressions),
          clicks: parseInt(row.clicks),
          spend: parseFloat(row.spend),
          cpm: parseFloat(row.cpm),
          cpc: parseFloat(row.cpc || "0"),
          ctr: parseFloat(row.ctr),
          actions: actionsValue,
        },
      });

      upserted++;
    }

    // Update DailySnapshot for each day
    const datesProcessed = new Set(
      insights.map((r: MetaInsight) => r.date_start)
    );

    for (const dateStr of datesProcessed) {
      await updateDailySnapshotMeta(new Date(dateStr));
    }

    return NextResponse.json({
      success: true,
      insightsProcessed: upserted,
      daysUpdated: datesProcessed.size,
      range: { since, until },
    });
  } catch (err) {
    console.error("[Cron/MetaAds] Fatal error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateDailySnapshotMeta(date: Date) {
  date.setUTCHours(0, 0, 0, 0);

  try {
    const dayInsights = await prisma.metaAdInsight.findMany({
      where: { date },
    });

    if (dayInsights.length === 0) return;

    const totalSpend = dayInsights.reduce((sum: number, r) => sum + r.spend, 0);
    const totalImpressions = dayInsights.reduce((sum: number, r) => sum + r.impressions, 0);
    const totalClicks = dayInsights.reduce((sum: number, r) => sum + r.clicks, 0);
    const avgCpm = totalImpressions > 0 ? +((totalSpend / totalImpressions) * 1000).toFixed(2) : 0;
    const avgCpc = totalClicks > 0 ? +(totalSpend / totalClicks).toFixed(2) : 0;
    const avgCtr = totalImpressions > 0 ? +((totalClicks / totalImpressions) * 100).toFixed(2) : 0;

    const existing = await prisma.dailySnapshot.findUnique({ where: { date } });

    const metaData = {
      totalSpend: +totalSpend.toFixed(2),
      totalImpressions,
      totalClicks,
      avgCpm,
      avgCpc,
      avgCtr,
    };

    if (existing) {
      const totalRevenue = existing.totalRevenue + existing.totalUpsellRevenue;
      const totalSalesCount = existing.totalSales;
      const cpa = totalSalesCount > 0 ? +(totalSpend / totalSalesCount).toFixed(2) : 0;
      const roas = totalSpend > 0 ? +(totalRevenue / totalSpend).toFixed(2) : 0;
      const profit = +(totalRevenue - totalSpend).toFixed(2);

      await prisma.dailySnapshot.update({
        where: { date },
        data: { ...metaData, cpa, roas, profit },
      });
    } else {
      await prisma.dailySnapshot.create({
        data: {
          date,
          ...metaData,
          vslViews: 0,
          vslStarts: 0,
          vslFinishes: 0,
          vslPlayRate: 0,
          vslCompletionRate: 0,
          totalSales: 0,
          totalRevenue: 0,
          totalUpsellSales: 0,
          totalUpsellRevenue: 0,
          cpa: 0,
          roas: 0,
          profit: 0,
        },
      });
    }
  } catch (err) {
    console.error("[Cron/MetaAds] Snapshot update error:", err);
  }
}
