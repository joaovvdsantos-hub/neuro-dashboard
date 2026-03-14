import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// --- Helpers ---
function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[], weights?: number[]): T {
  if (!weights) return arr[Math.floor(Math.random() * arr.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function randomName(): string {
  const first = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena",
    "Igor", "Julia", "Lucas", "Maria", "Nicolas", "Olivia", "Pedro", "Rafaela",
    "Samuel", "Tatiana", "Victor", "Yasmin"];
  const last = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida",
    "Nascimento", "Lima", "Araújo", "Melo", "Barbosa", "Ribeiro", "Martins", "Carvalho"];
  return `${pick(first)} ${pick(last)}`;
}

function randomEmail(name: string): string {
  const domains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br"];
  const clean = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".");
  return `${clean}${randInt(1, 999)}@${pick(domains)}`;
}

// --- Config ---
const CAMPAIGNS = [
  { id: "camp_interesse_001", name: "Neuro Academy - Interesse", adsets: [
    { id: "adset_int_broad", name: "Interesse - Broad" },
    { id: "adset_int_neuro", name: "Interesse - Neurociência" },
  ]},
  { id: "camp_lookalike_002", name: "Neuro Academy - Lookalike", adsets: [
    { id: "adset_lal_purchase", name: "LAL - Purchasers 1%" },
    { id: "adset_lal_vsl50", name: "LAL - VSL 50%" },
  ]},
  { id: "camp_retargeting_003", name: "Neuro Academy - Retargeting", adsets: [
    { id: "adset_rtg_vsl75", name: "RTG - VSL 75%" },
    { id: "adset_rtg_checkout", name: "RTG - Checkout Abandon" },
  ]},
];

const STATES = [
  { uf: "SP", weight: 30 }, { uf: "RJ", weight: 15 }, { uf: "MG", weight: 12 },
  { uf: "BA", weight: 8 }, { uf: "PR", weight: 7 }, { uf: "RS", weight: 6 },
  { uf: "CE", weight: 5 }, { uf: "PE", weight: 5 }, { uf: "SC", weight: 5 },
  { uf: "GO", weight: 4 }, { uf: "DF", weight: 3 },
];

const CITIES: Record<string, string[]> = {
  SP: ["São Paulo", "Campinas", "Guarulhos", "Santos"],
  RJ: ["Rio de Janeiro", "Niterói", "Nova Iguaçu"],
  MG: ["Belo Horizonte", "Uberlândia", "Juiz de Fora"],
  BA: ["Salvador", "Feira de Santana"],
  PR: ["Curitiba", "Londrina", "Maringá"],
  RS: ["Porto Alegre", "Caxias do Sul"],
  CE: ["Fortaleza", "Juazeiro do Norte"],
  PE: ["Recife", "Olinda"],
  SC: ["Florianópolis", "Joinville"],
  GO: ["Goiânia", "Anápolis"],
  DF: ["Brasília"],
};

async function main() {
  console.log("🧹 Cleaning existing data...");
  await prisma.dailySnapshot.deleteMany();
  await prisma.hotmartSale.deleteMany();
  await prisma.vturbMetric.deleteMany();
  await prisma.metaAdInsight.deleteMany();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log("📊 Seeding 30 days of data...");

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);

    // Trend: more recent days slightly better (simulating growth)
    const trendFactor = 1 + (29 - dayOffset) * 0.005;

    // --- MetaAdInsight ---
    const dailyBudget = rand(200, 500) * trendFactor;
    const budgetPerCampaign = dailyBudget / CAMPAIGNS.length;

    let daySpend = 0;
    let dayImpressions = 0;
    let dayClicks = 0;

    for (const campaign of CAMPAIGNS) {
      for (const adset of campaign.adsets) {
        const spend = +(budgetPerCampaign / campaign.adsets.length * rand(0.7, 1.3)).toFixed(2);
        const cpc = +rand(0.5, 2.0).toFixed(2);
        const clicks = Math.max(1, Math.round(spend / cpc));
        const ctr = +rand(1.0, 3.0).toFixed(2);
        const impressions = Math.round(clicks / (ctr / 100));
        const cpm = +(spend / impressions * 1000).toFixed(2);

        daySpend += spend;
        dayImpressions += impressions;
        dayClicks += clicks;

        await prisma.metaAdInsight.create({
          data: {
            date,
            campaignId: campaign.id,
            campaignName: campaign.name,
            adsetId: adset.id,
            adsetName: adset.name,
            impressions,
            clicks,
            spend,
            cpm,
            cpc,
            ctr,
            actions: { purchase: randInt(0, 3), lead: randInt(1, 8) },
          },
        });
      }
    }

    // --- VturbMetric ---
    // Front VSL
    const frontViews = randInt(1000, 3000);
    const frontStarts = Math.round(frontViews * rand(0.4, 0.6));
    const frontFinishes = Math.round(frontStarts * rand(0.15, 0.30));
    const frontPlayRate = +(frontStarts / frontViews * 100).toFixed(2);
    const frontCompletionRate = +(frontFinishes / frontStarts * 100).toFixed(2);

    await prisma.vturbMetric.create({
      data: {
        date,
        playerId: "698d3a927a04c8d380d2b7bf",
        playerName: "Neuro Academy VSL",
        totalViewed: frontViews,
        totalStarted: frontStarts,
        totalFinished: frontFinishes,
        uniqueSessions: Math.round(frontViews * rand(0.85, 0.95)),
        uniqueDevices: Math.round(frontViews * rand(0.75, 0.88)),
        playRate: frontPlayRate,
        completionRate: frontCompletionRate,
        engagementRate: +rand(25, 50).toFixed(2),
      },
    });

    // Upsell VSL
    const upsellViews = randInt(200, 600);
    const upsellStarts = Math.round(upsellViews * rand(0.5, 0.7));
    const upsellFinishes = Math.round(upsellStarts * rand(0.2, 0.4));

    await prisma.vturbMetric.create({
      data: {
        date,
        playerId: "6983dcdc9ea5127266915c06",
        playerName: "Upsell VSL",
        totalViewed: upsellViews,
        totalStarted: upsellStarts,
        totalFinished: upsellFinishes,
        uniqueSessions: Math.round(upsellViews * rand(0.85, 0.95)),
        uniqueDevices: Math.round(upsellViews * rand(0.75, 0.88)),
        playRate: +(upsellStarts / upsellViews * 100).toFixed(2),
        completionRate: +(upsellFinishes / upsellStarts * 100).toFixed(2),
        engagementRate: +rand(30, 55).toFixed(2),
      },
    });

    // --- HotmartSale ---
    const numFrontSales = randInt(8, 16);
    const numUpsellSales = randInt(2, 6);
    let frontRevenue = 0;
    let upsellRevenue = 0;

    for (let i = 0; i < numFrontSales + numUpsellSales; i++) {
      const isUpsell = i >= numFrontSales;
      const price = isUpsell ? 197 : 297;
      const productName = isUpsell ? "Protocolos de Neuromodulação" : "Neuro Academy";
      const productId = isUpsell ? "protocolos-neuromodulacao" : "neuro-academy";
      const paymentType = pick(["PIX", "CREDIT_CARD"], [60, 40]);
      const state = pick(STATES.map(s => s.uf), STATES.map(s => s.weight));
      const city = pick(CITIES[state] || ["Cidade"]);
      const gender = pick(["M", "F", null] as (string | null)[], [55, 40, 5]);
      const name = randomName();
      const saleHour = randInt(6, 23);
      const saleMinute = randInt(0, 59);
      const saleDate = new Date(date);
      saleDate.setHours(saleHour, saleMinute, randInt(0, 59));

      if (isUpsell) upsellRevenue += price;
      else frontRevenue += price;

      await prisma.hotmartSale.create({
        data: {
          transactionId: `TRX-${date.toISOString().slice(0, 10).replace(/-/g, "")}-${String(i).padStart(4, "0")}-${randInt(1000, 9999)}`,
          event: "PURCHASE_APPROVED",
          productName,
          productId,
          buyerName: name,
          buyerEmail: randomEmail(name),
          buyerState: state,
          buyerCity: city,
          buyerGender: gender,
          priceValue: price,
          priceCurrency: "BRL",
          paymentType,
          status: "approved",
          isUpsell,
          approvedDate: saleDate,
        },
      });
    }

    // --- DailySnapshot ---
    const totalRevenue = frontRevenue + upsellRevenue;
    const totalSalesCount = numFrontSales + numUpsellSales;

    await prisma.dailySnapshot.create({
      data: {
        date,
        totalSpend: +daySpend.toFixed(2),
        totalImpressions: dayImpressions,
        totalClicks: dayClicks,
        avgCpm: +(daySpend / dayImpressions * 1000).toFixed(2),
        avgCpc: +(daySpend / dayClicks).toFixed(2),
        avgCtr: +(dayClicks / dayImpressions * 100).toFixed(2),
        vslViews: frontViews,
        vslStarts: frontStarts,
        vslFinishes: frontFinishes,
        vslPlayRate: frontPlayRate,
        vslCompletionRate: frontCompletionRate,
        upsellVslViews: upsellViews,
        upsellVslStarts: upsellStarts,
        upsellVslFinishes: upsellFinishes,
        totalSales: numFrontSales,
        totalRevenue: frontRevenue,
        totalUpsellSales: numUpsellSales,
        totalUpsellRevenue: upsellRevenue,
        cpa: numFrontSales > 0 ? +(daySpend / numFrontSales).toFixed(2) : 0,
        roas: daySpend > 0 ? +(totalRevenue / daySpend).toFixed(2) : 0,
        profit: +(totalRevenue - daySpend).toFixed(2),
      },
    });

    const dateStr = date.toISOString().slice(0, 10);
    console.log(`  ✅ ${dateStr} — Spend: R$${daySpend.toFixed(0)} | Sales: ${numFrontSales}+${numUpsellSales} | Revenue: R$${totalRevenue}`);
  }

  console.log("\n🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
