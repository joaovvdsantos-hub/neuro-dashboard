const META_API_BASE = "https://graph.facebook.com/v21.0";

export async function getMetaAdsInsights(dateFrom: string, dateTo: string) {
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    throw new Error("Meta Ads credentials not configured");
  }

  const url = `${META_API_BASE}/act_${accountId}/insights?fields=impressions,clicks,spend,actions,action_values,cpc,cpm,ctr&time_range={"since":"${dateFrom}","until":"${dateTo}"}&access_token=${accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Meta Ads API error: ${response.statusText}`);
  }

  return response.json();
}
