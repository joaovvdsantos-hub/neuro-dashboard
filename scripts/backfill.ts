import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { format, eachDayOfInterval, parseISO } from "date-fns";

config({ path: ".env.local" });

// --- Config ---
const START_DATE = "2026-03-01";
const END_DATE = format(new Date(), "yyyy-MM-dd"); // hoje

const META_BASE_URL = "https://graph.facebook.com/v21.0";
const VTURB_BASE_URL = "https://analytics.vturb.net";

const PLAYER_FRONT = process.env.VTURB_PLAYER_FRONT!;
const PLAYER_UPSELL = process.env.VTURB_PLAYER_UPSELL!;

// Prisma setup
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// --- Meta Ads ---
function getAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID!;
  return id.startsWith("act_") ? id : `act_${id}`;
}

async function fetchMetaInsights(since: string, until: string) {
  const accountId = getAccountId();
  const token = process.env.META_ACCESS_TOKEN!;
  const fields = "impressions,clicks,spend,cpm,cpc,ctr,actions,action_values,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name";

  const params = new URLSearchParams({
    fields,
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    access_token: token,
    limit: "500",
  });

  const allData: Record<string, unknown>[] = [];
  let nextUrl: string | null = `${META_BASE_URL}/${accountId}/insights?${params}`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meta Ads API ${res.status}: ${text}`);
    }
    const json = await res.json() as { data: Record<string, unknown>[]; paging?: { next?: string } };
    allData.push(...json.data);
    nextUrl = json.paging?.next || null;
  }

  return allData;
}

// --- Vturb ---
function vturbHeaders() {
  return {
    "X-Api-Token": process.env.VTURB_API_KEY!,
    "X-Api-Version": "v1",
    "Content-Type": "application/json",
  };
}

async function fetchVturbStatsByDay(playerId: string, startDate: string, endDate: string) {
  const res = await fetch(`${VTURB_BASE_URL}/sessions/stats_by_day`, {
    method: "POST",
    headers: vturbHeaders(),
    body: JSON.stringify({
      player_id: playerId,
      start_date: `${startDate} 00:00:00`,
      end_date: `${endDate} 23:59:59`,
      timezone: "America/Sao_Paulo",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vturb API ${res.status}: ${text}`);
  }

  const json = await res.json();
  // Vturb may return array directly or wrapped in { data: [...] }
  const data = Array.isArray(json) ? json : (json.data ?? []);
  return data as Array<{
    date_key: string;
    total_viewed: number;
    total_viewed_session_uniq: number;
    total_viewed_device_uniq: number;
    total_started: number;
    total_started_session_uniq: number;
    total_started_device_uniq: number;
    total_finished: number;
    total_finished_session_uniq: number;
    total_finished_device_uniq: number;
    total_clicked: number;
    engagement_rate?: number;
    play_rate?: number;
  }>;
}

// --- Main ---
async function main() {
  console.log(`\n🗑️  Limpando dados existentes...`);
  await prisma.dailySnapshot.deleteMany();
  await prisma.hotmartSale.deleteMany();
  await prisma.vturbMetric.deleteMany();
  await prisma.metaAdInsight.deleteMany();
  console.log("   ✅ Banco limpo\n");

  // === META ADS ===
  console.log(`📊 Buscando Meta Ads: ${START_DATE} → ${END_DATE}`);
  const insights = await fetchMetaInsights(START_DATE, END_DATE);
  console.log(`   Recebidos: ${insights.length} registros`);

  let metaUpserted = 0;
  for (const row of insights) {
    const date = new Date(row.date_start as string);
    date.setUTCHours(0, 0, 0, 0);

    const actionsValue = row.actions
      ? (row.actions as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    const actionValuesValue = row.action_values
      ? (row.action_values as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    await prisma.metaAdInsight.upsert({
      where: {
        date_campaignId_adsetId_adId: {
          date,
          campaignId: (row.campaign_id as string) ?? "",
          adsetId: (row.adset_id as string) ?? "",
          adId: (row.ad_id as string) ?? "",
        },
      },
      update: {
        campaignName: (row.campaign_name as string) ?? "",
        adsetName: row.adset_name as string | undefined,
        adName: row.ad_name as string | undefined,
        impressions: parseInt(row.impressions as string),
        clicks: parseInt(row.clicks as string),
        spend: parseFloat(row.spend as string),
        cpm: parseFloat(row.cpm as string),
        cpc: parseFloat((row.cpc as string) || "0"),
        ctr: parseFloat(row.ctr as string),
        actions: actionsValue,
        actionValues: actionValuesValue,
      },
      create: {
        date,
        campaignId: (row.campaign_id as string) ?? "",
        campaignName: (row.campaign_name as string) ?? "",
        adsetId: row.adset_id as string | undefined,
        adsetName: row.adset_name as string | undefined,
        adId: row.ad_id as string | undefined,
        adName: row.ad_name as string | undefined,
        impressions: parseInt(row.impressions as string),
        clicks: parseInt(row.clicks as string),
        spend: parseFloat(row.spend as string),
        cpm: parseFloat(row.cpm as string),
        cpc: parseFloat((row.cpc as string) || "0"),
        ctr: parseFloat(row.ctr as string),
        actions: actionsValue,
        actionValues: actionValuesValue,
      },
    });
    metaUpserted++;
  }
  console.log(`   ✅ ${metaUpserted} registros Meta Ads salvos\n`);

  // === VTURB ===
  console.log(`📹 Buscando Vturb: ${START_DATE} → ${END_DATE}`);

  const players = [
    { id: PLAYER_FRONT, name: "Neuro Academy VSL" },
    { id: PLAYER_UPSELL, name: "Upsell VSL" },
  ];

  for (const player of players) {
    console.log(`   Player: ${player.name} (${player.id})`);
    try {
      const stats = await fetchVturbStatsByDay(player.id, START_DATE, END_DATE);
      console.log(`   Recebidos: ${stats.length} dias`);

      for (const day of stats) {
        const date = new Date(day.date_key);
        if (isNaN(date.getTime())) {
          console.warn(`   Skipping invalid date:`, day.date_key);
          continue;
        }
        date.setUTCHours(0, 0, 0, 0);

        const totalViewed = day.total_viewed ?? 0;
        const totalStarted = day.total_started ?? 0;
        const totalFinished = day.total_finished ?? 0;
        const uniqueSessions = day.total_viewed_session_uniq ?? 0;
        const uniqueDevices = day.total_viewed_device_uniq ?? 0;

        const playRate = totalViewed > 0
          ? +((totalStarted / totalViewed) * 100).toFixed(2)
          : 0;
        const completionRate = totalStarted > 0
          ? +((totalFinished / totalStarted) * 100).toFixed(2)
          : 0;
        const engagementRate = day.engagement_rate ?? 0;

        await prisma.vturbMetric.upsert({
          where: {
            date_playerId: { date, playerId: player.id },
          },
          update: {
            playerName: player.name,
            totalViewed,
            totalStarted,
            totalFinished,
            uniqueSessions,
            uniqueDevices,
            playRate,
            completionRate,
            engagementRate,
          },
          create: {
            date,
            playerId: player.id,
            playerName: player.name,
            totalViewed,
            totalStarted,
            totalFinished,
            uniqueSessions,
            uniqueDevices,
            playRate,
            completionRate,
            engagementRate,
          },
        });
      }
      console.log(`   ✅ ${stats.length} dias salvos para ${player.name}`);
    } catch (err) {
      console.error(`   ❌ Erro no player ${player.name}:`, err);
    }
  }

  // === DAILY SNAPSHOTS ===
  console.log(`\n📈 Gerando DailySnapshots...`);

  const allDays = eachDayOfInterval({
    start: parseISO(START_DATE),
    end: parseISO(END_DATE),
  });

  for (const dayDate of allDays) {
    dayDate.setUTCHours(0, 0, 0, 0);

    // Agregar Meta Ads do dia
    const dayInsights = await prisma.metaAdInsight.findMany({ where: { date: dayDate } });
    const totalSpend = dayInsights.reduce((sum: number, r) => sum + r.spend, 0);
    const totalImpressions = dayInsights.reduce((sum: number, r) => sum + r.impressions, 0);
    const totalClicks = dayInsights.reduce((sum: number, r) => sum + r.clicks, 0);
    const avgCpm = totalImpressions > 0 ? +((totalSpend / totalImpressions) * 1000).toFixed(2) : 0;
    const avgCpc = totalClicks > 0 ? +(totalSpend / totalClicks).toFixed(2) : 0;
    const avgCtr = totalImpressions > 0 ? +((totalClicks / totalImpressions) * 100).toFixed(2) : 0;

    // Vturb do dia
    const frontMetric = await prisma.vturbMetric.findUnique({
      where: { date_playerId: { date: dayDate, playerId: PLAYER_FRONT } },
    });
    const upsellMetric = await prisma.vturbMetric.findUnique({
      where: { date_playerId: { date: dayDate, playerId: PLAYER_UPSELL } },
    });

    // Hotmart do dia (será 0 porque não temos vendas ainda)
    const daySales = await prisma.hotmartSale.findMany({
      where: {
        approvedDate: {
          gte: dayDate,
          lt: new Date(dayDate.getTime() + 86400000),
        },
        event: "PURCHASE_APPROVED",
      },
    });
    const frontSales = daySales.filter((s) => !s.isUpsell);
    const upsellSales = daySales.filter((s) => s.isUpsell);
    const totalSales = frontSales.length;
    const totalRevenue = frontSales.reduce((sum: number, s) => sum + s.priceValue, 0);
    const totalUpsellSales = upsellSales.length;
    const totalUpsellRevenue = upsellSales.reduce((sum: number, s) => sum + s.priceValue, 0);
    const allRevenue = totalRevenue + totalUpsellRevenue;

    const cpa = totalSales > 0 ? +(totalSpend / totalSales).toFixed(2) : 0;
    const roas = totalSpend > 0 ? +(allRevenue / totalSpend).toFixed(2) : 0;
    const profit = +(allRevenue - totalSpend).toFixed(2);

    await prisma.dailySnapshot.upsert({
      where: { date: dayDate },
      update: {
        totalSpend: +totalSpend.toFixed(2),
        totalImpressions,
        totalClicks,
        avgCpm,
        avgCpc,
        avgCtr,
        vslViews: frontMetric?.totalViewed ?? 0,
        vslStarts: frontMetric?.totalStarted ?? 0,
        vslFinishes: frontMetric?.totalFinished ?? 0,
        vslPlayRate: frontMetric?.playRate ?? 0,
        vslCompletionRate: frontMetric?.completionRate ?? 0,
        upsellVslViews: upsellMetric?.totalViewed ?? null,
        upsellVslStarts: upsellMetric?.totalStarted ?? null,
        upsellVslFinishes: upsellMetric?.totalFinished ?? null,
        totalSales,
        totalRevenue: +totalRevenue.toFixed(2),
        totalUpsellSales,
        totalUpsellRevenue: +totalUpsellRevenue.toFixed(2),
        cpa,
        roas,
        profit,
      },
      create: {
        date: dayDate,
        totalSpend: +totalSpend.toFixed(2),
        totalImpressions,
        totalClicks,
        avgCpm,
        avgCpc,
        avgCtr,
        vslViews: frontMetric?.totalViewed ?? 0,
        vslStarts: frontMetric?.totalStarted ?? 0,
        vslFinishes: frontMetric?.totalFinished ?? 0,
        vslPlayRate: frontMetric?.playRate ?? 0,
        vslCompletionRate: frontMetric?.completionRate ?? 0,
        upsellVslViews: upsellMetric?.totalViewed ?? null,
        upsellVslStarts: upsellMetric?.totalStarted ?? null,
        upsellVslFinishes: upsellMetric?.totalFinished ?? null,
        totalSales,
        totalRevenue: +totalRevenue.toFixed(2),
        totalUpsellSales,
        totalUpsellRevenue: +totalUpsellRevenue.toFixed(2),
        cpa,
        roas,
        profit,
      },
    });

    const dateStr = format(dayDate, "yyyy-MM-dd");
    const metaCount = dayInsights.length;
    const vslViews = frontMetric?.totalViewed ?? 0;
    console.log(`   ${dateStr} — Meta: ${metaCount} ads, R$${totalSpend.toFixed(0)} | VSL: ${vslViews} views | Sales: ${totalSales}`);
  }

  console.log(`\n🎉 Backfill concluído! ${allDays.length} dias processados.`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
