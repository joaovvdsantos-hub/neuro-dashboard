// Meta Ads Types
export interface MetaAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  roas: number;
  conversions: number;
}

export interface CampaignData extends MetaAdsMetrics {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  date: string;
}

// Vturb Types
export interface VslMetrics {
  playerId: string;
  playerName: string;
  totalViews: number;
  uniqueViews: number;
  playRate: number;
  avgWatchTime: number;
  completionRate: number;
  retention: number[];
}

// Hotmart / Sales Types
export interface Sale {
  id: string;
  product: "neuro-academy" | "protocolos-neuromodulacao";
  productName: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  status: "approved" | "canceled" | "refunded" | "chargeback";
  transactionId: string;
  createdAt: string;
}

// Dashboard Overview
export interface OverviewData {
  totalSpend: number;
  totalRevenue: number;
  roas: number;
  totalSales: number;
  conversionRate: number;
  cpa: number;
  revenueByDay: { date: string; revenue: number; spend: number }[];
  salesByProduct: { product: string; count: number; revenue: number }[];
}

// Date Range
export interface DateRange {
  from: string;
  to: string;
}
