import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, format } from "date-fns";
import {
  getUserEngagement,
  getLiveUsers,
  getTrafficOrigin,
  PLAYER_FRONT,
  PLAYER_UPSELL,
} from "@/lib/vturb";

export const dynamic = "force-dynamic";

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

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const videoDuration = parseInt(process.env.VTURB_VIDEO_DURATION ?? "1800");
    const pitchTime = parseInt(process.env.VTURB_PITCH_TIME ?? "900");

    // --- Primary: DB data from VturbMetric ---
    const [frontMetrics, upsellMetrics] = await Promise.all([
      prisma.vturbMetric.findMany({
        where: { date: { gte: start, lte: end }, playerId: PLAYER_FRONT },
        orderBy: { date: "asc" },
      }),
      prisma.vturbMetric.findMany({
        where: { date: { gte: start, lte: end }, playerId: PLAYER_UPSELL },
        orderBy: { date: "asc" },
      }),
    ]);

    // KPIs from DB aggregation
    const frontTotalViews = sumField(frontMetrics, (m) => m.totalViewed);
    const frontTotalStarts = sumField(frontMetrics, (m) => m.totalStarted);
    const frontTotalFinished = sumField(frontMetrics, (m) => m.totalFinished);
    const frontTotalSessions = sumField(frontMetrics, (m) => m.uniqueSessions);

    const frontKpis = {
      totalViews: frontTotalViews,
      totalStarted: frontTotalStarts,
      totalFinished: frontTotalFinished,
      uniqueSessions: frontTotalSessions,
      playRate: frontTotalViews > 0 ? +((frontTotalStarts / frontTotalViews) * 100).toFixed(1) : 0,
      completionRate: frontTotalStarts > 0 ? +((frontTotalFinished / frontTotalStarts) * 100).toFixed(1) : 0,
      engagementRate: frontMetrics.length > 0
        ? +(sumField(frontMetrics, (m) => m.engagementRate ?? 0) / frontMetrics.length).toFixed(1)
        : 0,
      avgWatchTime: 0,
      conversions: 0,
      liveUsers: 0,
    };

    const upsellTotalViews = sumField(upsellMetrics, (m) => m.totalViewed);
    const upsellTotalStarts = sumField(upsellMetrics, (m) => m.totalStarted);
    const upsellTotalFinished = sumField(upsellMetrics, (m) => m.totalFinished);
    const upsellTotalSessions = sumField(upsellMetrics, (m) => m.uniqueSessions);

    const upsellKpis = {
      totalViews: upsellTotalViews,
      totalStarted: upsellTotalStarts,
      totalFinished: upsellTotalFinished,
      uniqueSessions: upsellTotalSessions,
      playRate: upsellTotalViews > 0 ? +((upsellTotalStarts / upsellTotalViews) * 100).toFixed(1) : 0,
      completionRate: upsellTotalStarts > 0 ? +((upsellTotalFinished / upsellTotalStarts) * 100).toFixed(1) : 0,
      engagementRate: upsellMetrics.length > 0
        ? +(sumField(upsellMetrics, (m) => m.engagementRate ?? 0) / upsellMetrics.length).toFixed(1)
        : 0,
      avgWatchTime: 0,
      conversions: 0,
      liveUsers: 0,
    };

    // Daily evolution from DB
    const dailyEvolution = frontMetrics.map((fm) => {
      const dateStr = format(fm.date, "yyyy-MM-dd");
      const um = upsellMetrics.find((u) => format(u.date, "yyyy-MM-dd") === dateStr);
      return {
        date: dateStr,
        frontViews: fm.totalViewed,
        frontStarts: fm.totalStarted,
        frontFinished: fm.totalFinished,
        frontPlayRate: fm.playRate ?? 0,
        upsellViews: um?.totalViewed ?? 0,
        upsellStarts: um?.totalStarted ?? 0,
        upsellFinished: um?.totalFinished ?? 0,
        upsellPlayRate: um?.playRate ?? 0,
      };
    });

    // --- Secondary: Vturb API for retention, traffic, live users ---
    const [frontEngagement, upsellEngagement, frontLive, upsellLive, frontTraffic] =
      await Promise.allSettled([
        getUserEngagement(PLAYER_FRONT, startStr, endStr, videoDuration, pitchTime),
        getUserEngagement(PLAYER_UPSELL, startStr, endStr, videoDuration),
        getLiveUsers(PLAYER_FRONT),
        getLiveUsers(PLAYER_UPSELL),
        getTrafficOrigin(PLAYER_FRONT, startStr, endStr, ["utm_source", "utm_medium", "utm_campaign"], videoDuration, pitchTime),
      ]);

    const safe = <T>(r: PromiseSettledResult<T>): T | null =>
      r.status === "fulfilled" ? r.value : null;

    // Update live users from API
    const frontLiveData = safe(frontLive);
    const upsellLiveData = safe(upsellLive);
    if (frontLiveData?.data?.live_users) frontKpis.liveUsers = frontLiveData.data.live_users;
    if (upsellLiveData?.data?.live_users) upsellKpis.liveUsers = upsellLiveData.data.live_users;

    // Retention curves from API
    const frontEng = safe(frontEngagement)?.data;
    const upsellEng = safe(upsellEngagement)?.data;

    if (frontEng?.avg_watch_time) frontKpis.avgWatchTime = frontEng.avg_watch_time;
    if (upsellEng?.avg_watch_time) upsellKpis.avgWatchTime = upsellEng.avg_watch_time;

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

    // Traffic origin from API
    const trafficRaw = safe(frontTraffic);
    const trafficArr = Array.isArray(trafficRaw) ? trafficRaw : (trafficRaw?.data ?? []);
    const trafficOrigin = (trafficArr as Array<Record<string, unknown>>).map((t) => ({
      origin: (t.origin as string) || "Direto",
      views: (t.views as number) ?? 0,
      started: (t.started as number) ?? 0,
      finished: (t.finished as number) ?? 0,
      conversions: (t.conversions as number) ?? 0,
      playRate: (t.play_rate as number) ?? 0,
      completionRate: (t.completion_rate as number) ?? 0,
    }));

    return NextResponse.json({
      frontKpis,
      upsellKpis,
      dailyEvolution,
      frontRetention,
      upsellRetention,
      trafficOrigin,
    });
  } catch (err) {
    console.error("[VSL API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
