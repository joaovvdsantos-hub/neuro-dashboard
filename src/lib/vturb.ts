const VTURB_API_BASE = "https://api.vturb.com.br";

export async function getVturbAnalytics(playerId: string, dateFrom: string, dateTo: string) {
  const apiKey = process.env.VTURB_API_KEY;

  if (!apiKey) {
    throw new Error("Vturb API key not configured");
  }

  const response = await fetch(
    `${VTURB_API_BASE}/analytics/${playerId}?start=${dateFrom}&end=${dateTo}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Vturb API error: ${response.statusText}`);
  }

  return response.json();
}
