const BASE_URL = "https://graph.facebook.com/v21.0";

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

export interface MetaInsight {
  date_start: string;
  date_stop: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions: string;
  clicks: string;
  spend: string;
  cpm: string;
  cpc: string;
  ctr: string;
  actions?: Array<{ action_type: string; value: string }>;
}

interface InsightsResponse {
  data: MetaInsight[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

function getAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID!;
  return id.startsWith("act_") ? id : `act_${id}`;
}

function getAccessToken(): string {
  return process.env.META_ACCESS_TOKEN!;
}

async function fetchAllPages(url: string): Promise<MetaInsight[]> {
  const allData: MetaInsight[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    try {
      const res = await fetch(nextUrl);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Meta Ads API ${res.status}: ${text}`);
      }
      const json = (await res.json()) as InsightsResponse;
      allData.push(...json.data);
      nextUrl = json.paging?.next || null;
    } catch (err) {
      console.error("[MetaAds] Pagination error:", (err as Error).message);
      throw err;
    }
  }

  return allData;
}

export async function getCampaignInsights(
  dateRange: DateRange,
  level: string = "campaign"
): Promise<MetaInsight[]> {
  const accountId = getAccountId();
  const token = getAccessToken();
  const fields = "impressions,clicks,spend,cpm,cpc,ctr,actions";

  const params = new URLSearchParams({
    fields,
    level,
    time_increment: "1",
    time_range: JSON.stringify({ since: dateRange.since, until: dateRange.until }),
    access_token: token,
    limit: "500",
  });

  const url = `${BASE_URL}/${accountId}/insights?${params}`;
  return fetchAllPages(url);
}

export async function getAdInsights(dateRange: DateRange): Promise<MetaInsight[]> {
  const accountId = getAccountId();
  const token = getAccessToken();
  const fields =
    "impressions,clicks,spend,cpm,cpc,ctr,actions,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name";

  const params = new URLSearchParams({
    fields,
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since: dateRange.since, until: dateRange.until }),
    access_token: token,
    limit: "500",
  });

  const url = `${BASE_URL}/${accountId}/insights?${params}`;
  return fetchAllPages(url);
}

export async function getAdsetInsights(dateRange: DateRange): Promise<MetaInsight[]> {
  const accountId = getAccountId();
  const token = getAccessToken();
  const fields =
    "impressions,clicks,spend,cpm,cpc,ctr,actions,adset_id,adset_name,campaign_id,campaign_name";

  const params = new URLSearchParams({
    fields,
    level: "adset",
    time_increment: "1",
    time_range: JSON.stringify({ since: dateRange.since, until: dateRange.until }),
    access_token: token,
    limit: "500",
  });

  const url = `${BASE_URL}/${accountId}/insights?${params}`;
  return fetchAllPages(url);
}
