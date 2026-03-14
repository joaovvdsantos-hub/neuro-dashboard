import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getSessionStatsByDay,
  PLAYER_FRONT,
  PLAYER_UPSELL,
} from "@/lib/vturb";
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
    const startDate = format(subDays(today, 1), "yyyy-MM-dd");
    const endDate = format(today, "yyyy-MM-dd");

    const players = [
      { id: PLAYER_FRONT, name: "Neuro Academy VSL" },
      { id: PLAYER_UPSELL, name: "Upsell VSL" },
    ];

    const results: Array<{ playerId: string; days: number }> = [];

    for (const player of players) {
      try {
        const stats = await getSessionStatsByDay(player.id, startDate, endDate);

        for (const day of stats.data) {
          const date = new Date(day.date);
          date.setUTCHours(0, 0, 0, 0);

          const playRate = day.total_views > 0
            ? +((day.total_started / day.total_views) * 100).toFixed(2)
            : 0;
          const completionRate = day.total_started > 0
            ? +((day.total_finished / day.total_started) * 100).toFixed(2)
            : 0;

          await prisma.vturbMetric.upsert({
            where: {
              date_playerId: { date, playerId: player.id },
            },
            update: {
              playerName: player.name,
              totalViewed: day.total_views,
              totalStarted: day.total_started,
              totalFinished: day.total_finished,
              uniqueSessions: day.unique_sessions,
              uniqueDevices: day.unique_devices,
              playRate,
              completionRate,
              engagementRate: day.engagement_rate,
            },
            create: {
              date,
              playerId: player.id,
              playerName: player.name,
              totalViewed: day.total_views,
              totalStarted: day.total_started,
              totalFinished: day.total_finished,
              uniqueSessions: day.unique_sessions,
              uniqueDevices: day.unique_devices,
              playRate,
              completionRate,
              engagementRate: day.engagement_rate,
            },
          });
        }

        results.push({ playerId: player.id, days: stats.data.length });
      } catch (err) {
        console.error(`[Cron/Vturb] Error for player ${player.id}:`, err);
        results.push({ playerId: player.id, days: 0 });
      }
    }

    // Update DailySnapshot for each processed day
    const dates = [startDate, endDate];
    for (const dateStr of [...new Set(dates)]) {
      await updateDailySnapshotVturb(new Date(dateStr));
    }

    return NextResponse.json({
      success: true,
      processed: results,
      range: { startDate, endDate },
    });
  } catch (err) {
    console.error("[Cron/Vturb] Fatal error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateDailySnapshotVturb(date: Date) {
  date.setUTCHours(0, 0, 0, 0);

  try {
    const frontMetric = await prisma.vturbMetric.findUnique({
      where: { date_playerId: { date, playerId: PLAYER_FRONT } },
    });

    const upsellMetric = await prisma.vturbMetric.findUnique({
      where: { date_playerId: { date, playerId: PLAYER_UPSELL } },
    });

    if (!frontMetric) return;

    const existing = await prisma.dailySnapshot.findUnique({ where: { date } });

    const vslData = {
      vslViews: frontMetric.totalViewed,
      vslStarts: frontMetric.totalStarted,
      vslFinishes: frontMetric.totalFinished,
      vslPlayRate: frontMetric.playRate ?? 0,
      vslCompletionRate: frontMetric.completionRate ?? 0,
      upsellVslViews: upsellMetric?.totalViewed ?? null,
      upsellVslStarts: upsellMetric?.totalStarted ?? null,
      upsellVslFinishes: upsellMetric?.totalFinished ?? null,
    };

    if (existing) {
      await prisma.dailySnapshot.update({ where: { date }, data: vslData });
    } else {
      await prisma.dailySnapshot.create({
        data: {
          date,
          ...vslData,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          avgCpm: 0,
          avgCpc: 0,
          avgCtr: 0,
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
    console.error("[Cron/Vturb] Snapshot update error:", err);
  }
}
