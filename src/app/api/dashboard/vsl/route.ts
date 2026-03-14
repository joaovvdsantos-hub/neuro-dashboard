import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, format } from "date-fns";
import {
  getSessionStats,
  getSessionStatsByDay,
  getUserEngagement,
  getLiveUsers,
  getTrafficOrigin,
  PLAYER_FRONT,
  PLAYER_UPSELL,
} from "@/lib/vturb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const now = new Date();
    const start = new Date(sp.get("from") || format(subDays(now, 29), "yyyy-MM-dd"));
    const end = new Date(sp.get("to") || format(now, "yyyy-MM-dd"));
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const videoDuration = parseInt(process.env.VTURB_VIDEO_DURATION ?? "1800");
    const pitchTime = parseInt(process.env.VTURB_PITCH_TIME ?? "900");

    // Parallel: session stats, daily stats, engagement, live users, traffic for both players
    const [
      frontStats,
      upsellStats,
      frontDaily,
      upsellDaily,
      frontEngagement,
      upsellEngagement,
      frontLive,
      upsellLive,
      frontTraffic,
    ] = await Promise.allSettled([
      getSessionStats(PLAYER_FRONT, startStr, endStr, videoDuration, pitchTime),
      getSessionStats(PLAYER_UPSELL, startStr, endStr, videoDuration),
      getSessionStatsByDay(PLAYER_FRONT, startStr, endStr),
      getSessionStatsByDay(PLAYER_UPSELL, startStr, endStr),
      getUserEngagement(PLAYER_FRONT, startStr, endStr, videoDuration, pitchTime),
      getUserEngagement(PLAYER_UPSELL, startStr, endStr, videoDuration),
      getLiveUsers(PLAYER_FRONT),
      getLiveUsers(PLAYER_UPSELL),
      getTrafficOrigin(PLAYER_FRONT, startStr, endStr, ["utm_source", "utm_medium", "utm_campaign"], videoDuration, pitchTime),
    ]);

    const safe = <T>(r: PromiseSettledResult<T>): T | null =>
      r.status === "fulfilled" ? r.value : null;

    const fs = safe(frontStats)?.data;
    const us = safe(upsellStats)?.data;

    // KPIs for front VSL
    const frontKpis = {
      totalViews: fs?.total_views ?? 0,
      totalStarted: fs?.total_started ?? 0,
      totalFinished: fs?.total_finished ?? 0,
      uniqueSessions: fs?.unique_sessions ?? 0,
      playRate: fs?.play_rate ?? 0,
      completionRate: fs?.completion_rate ?? 0,
      engagementRate: fs?.engagement_rate ?? 0,
      avgWatchTime: fs?.avg_watch_time ?? 0,
      conversions: fs?.conversions ?? 0,
      liveUsers: safe(frontLive)?.data?.live_users ?? 0,
    };

    // KPIs for upsell VSL
    const upsellKpis = {
      totalViews: us?.total_views ?? 0,
      totalStarted: us?.total_started ?? 0,
      totalFinished: us?.total_finished ?? 0,
      uniqueSessions: us?.unique_sessions ?? 0,
      playRate: us?.play_rate ?? 0,
      completionRate: us?.completion_rate ?? 0,
      engagementRate: us?.engagement_rate ?? 0,
      avgWatchTime: us?.avg_watch_time ?? 0,
      conversions: us?.conversions ?? 0,
      liveUsers: safe(upsellLive)?.data?.live_users ?? 0,
    };

    // Daily evolution for both players
    const frontDailyData = safe(frontDaily)?.data ?? [];
    const upsellDailyData = safe(upsellDaily)?.data ?? [];

    const dailyEvolution = frontDailyData.map((d) => {
      const upsellDay = upsellDailyData.find((u) => u.date === d.date);
      return {
        date: d.date,
        frontViews: d.total_views,
        frontStarts: d.total_started,
        frontFinished: d.total_finished,
        frontPlayRate: d.play_rate,
        upsellViews: upsellDay?.total_views ?? 0,
        upsellStarts: upsellDay?.total_started ?? 0,
        upsellFinished: upsellDay?.total_finished ?? 0,
        upsellPlayRate: upsellDay?.play_rate ?? 0,
      };
    });

    // Retention curves
    const frontEng = safe(frontEngagement)?.data;
    const upsellEng = safe(upsellEngagement)?.data;

    const frontRetention = {
      engagement: (frontEng?.retention ?? []).map((r) => ({
        time: r.second,
        retention: r.percentage,
      })),
      avgWatchTime: frontEng?.avg_watch_time ?? 0,
      medianWatchTime: frontEng?.median_watch_time ?? 0,
    };

    const upsellRetention = {
      engagement: (upsellEng?.retention ?? []).map((r) => ({
        time: r.second,
        retention: r.percentage,
      })),
      avgWatchTime: upsellEng?.avg_watch_time ?? 0,
      medianWatchTime: upsellEng?.median_watch_time ?? 0,
    };

    // Traffic origin
    const trafficData = safe(frontTraffic)?.data ?? [];
    const trafficOrigin = trafficData.map((t) => ({
      origin: t.origin || "Direto",
      views: t.views,
      started: t.started,
      finished: t.finished,
      conversions: t.conversions,
      playRate: t.play_rate,
      completionRate: t.completion_rate,
    }));

    // DB metrics for comparison (previous period from snapshots)
    const dbMetrics = await prisma.vturbMetric.findMany({
      where: { date: { gte: start, lte: end }, playerId: PLAYER_FRONT },
      orderBy: { date: "asc" },
    });

    const dbSparkline = dbMetrics.map((m) => ({
      date: format(m.date, "yyyy-MM-dd"),
      views: m.totalViewed,
      starts: m.totalStarted,
      playRate: m.playRate ?? 0,
    }));

    return NextResponse.json({
      frontKpis,
      upsellKpis,
      dailyEvolution,
      frontRetention,
      upsellRetention,
      trafficOrigin,
      dbSparkline,
    });
  } catch (err) {
    console.error("[VSL API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
