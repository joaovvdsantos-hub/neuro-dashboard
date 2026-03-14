const BASE_URL = "https://analytics.vturb.net";
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const PLAYER_FRONT = process.env.VTURB_PLAYER_FRONT!;   // 698d3a927a04c8d380d2b7bf
export const PLAYER_UPSELL = process.env.VTURB_PLAYER_UPSELL!; // 6983dcdc9ea5127266915c06

function getHeaders(): Record<string, string> {
  return {
    "X-Api-Token": process.env.VTURB_API_KEY!,
    "X-Api-Version": "v1",
    "Content-Type": "application/json",
  };
}

async function fetchWithRetry<T>(
  endpoint: string,
  options: RequestInit,
  params?: Record<string, unknown>
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers: getHeaders() });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Vturb API ${res.status}: ${text}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err as Error;
      if (attempt === 0) {
        console.error(`[Vturb] Retry ${endpoint}`, params, lastError.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  console.error(`[Vturb] Failed ${endpoint}`, params, lastError?.message);
  throw lastError;
}

// --- Response types ---

export interface TotalByPlayersResponse {
  data: Array<{
    player_id: string;
    player_name: string;
    events: Record<string, number>;
  }>;
}

export interface TotalByDayResponse {
  data: Array<{
    date: string;
    events: Record<string, number>;
  }>;
}

export interface SessionStatsResponse {
  data: {
    total_views: number;
    total_started: number;
    total_finished: number;
    total_clicks: number;
    unique_sessions: number;
    unique_devices: number;
    engagement_rate: number;
    play_rate: number;
    completion_rate: number;
    conversions: number;
    avg_watch_time: number;
  };
}

export interface SessionStatsByDayResponse {
  data: Array<{
    date: string;
    total_views: number;
    total_started: number;
    total_finished: number;
    total_clicks: number;
    unique_sessions: number;
    unique_devices: number;
    engagement_rate: number;
    play_rate: number;
    conversions: number;
  }>;
}

export interface UserEngagementResponse {
  data: {
    retention: Array<{ second: number; percentage: number }>;
    avg_watch_time: number;
    median_watch_time: number;
  };
}

export interface LiveUsersResponse {
  data: {
    player_id: string;
    live_users: number;
    minutes: number;
  };
}

export interface ConversionsByDayResponse {
  data: Array<{
    date: string;
    conversions: number;
    conversion_rate: number;
  }>;
}

export interface CustomMetricsResponse {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export interface TrafficOriginResponse {
  data: Array<{
    origin: string;
    views: number;
    started: number;
    finished: number;
    conversions: number;
    play_rate: number;
    completion_rate: number;
  }>;
}

// --- API Functions ---

export async function getTotalByPlayers(
  events: string[],
  startDate: string,
  endDate: string,
  timezone: string = DEFAULT_TIMEZONE
): Promise<TotalByPlayersResponse> {
  return fetchWithRetry("/events/total_by_company_players", {
    method: "POST",
    body: JSON.stringify({
      events,
      start_date: startDate,
      end_date: endDate,
      timezone,
    }),
  }, { events, startDate, endDate });
}

export async function getTotalByDay(
  events: string[],
  startDate: string,
  endDate: string,
  timezone: string = DEFAULT_TIMEZONE
): Promise<TotalByDayResponse> {
  return fetchWithRetry("/events/total_by_company_day", {
    method: "POST",
    body: JSON.stringify({
      events,
      start_date: startDate,
      end_date: endDate,
      timezone,
    }),
  }, { events, startDate, endDate });
}

export async function getSessionStats(
  playerId: string,
  startDate: string,
  endDate: string,
  videoDuration: number,
  pitchTime?: number
): Promise<SessionStatsResponse> {
  const body: Record<string, unknown> = {
    player_id: playerId,
    start_date: startDate,
    end_date: endDate,
    video_duration: videoDuration,
    timezone: DEFAULT_TIMEZONE,
  };
  if (pitchTime !== undefined) body.pitch_time = pitchTime;

  return fetchWithRetry("/sessions/stats", {
    method: "POST",
    body: JSON.stringify(body),
  }, { playerId, startDate, endDate });
}

export async function getSessionStatsByDay(
  playerId: string,
  startDate: string,
  endDate: string,
  timezone: string = DEFAULT_TIMEZONE
): Promise<SessionStatsByDayResponse> {
  return fetchWithRetry("/sessions/stats_by_day", {
    method: "POST",
    body: JSON.stringify({
      player_id: playerId,
      start_date: startDate,
      end_date: endDate,
      timezone,
    }),
  }, { playerId, startDate, endDate });
}

export async function getUserEngagement(
  playerId: string,
  startDate: string,
  endDate: string,
  videoDuration: number,
  pitchTime?: number
): Promise<UserEngagementResponse> {
  const body: Record<string, unknown> = {
    player_id: playerId,
    start_date: startDate,
    end_date: endDate,
    video_duration: videoDuration,
    timezone: DEFAULT_TIMEZONE,
  };
  if (pitchTime !== undefined) body.pitch_time = pitchTime;

  return fetchWithRetry("/times/user_engagement", {
    method: "POST",
    body: JSON.stringify(body),
  }, { playerId, startDate, endDate });
}

export async function getLiveUsers(
  playerId: string,
  minutes: number = 60
): Promise<LiveUsersResponse> {
  const params = new URLSearchParams({
    player_id: playerId,
    minutes: String(minutes),
  });

  return fetchWithRetry(`${BASE_URL}/sessions/live_users?${params}`, {
    method: "GET",
  }, { playerId, minutes });
}

export async function getConversionsByDay(
  playerId: string,
  startDate: string,
  endDate: string,
  timezone: string = DEFAULT_TIMEZONE
): Promise<ConversionsByDayResponse> {
  return fetchWithRetry("/conversions/stats_by_day", {
    method: "POST",
    body: JSON.stringify({
      player_id: playerId,
      start_date: startDate,
      end_date: endDate,
      timezone,
    }),
  }, { playerId, startDate, endDate });
}

export async function getCustomMetrics(
  playerId: string,
  startDate: string,
  endDate: string,
  timezone: string = DEFAULT_TIMEZONE
): Promise<CustomMetricsResponse> {
  return fetchWithRetry("/custom_metrics/list", {
    method: "POST",
    body: JSON.stringify({
      player_id: playerId,
      start_date: startDate,
      end_date: endDate,
      timezone,
    }),
  }, { playerId, startDate, endDate });
}

export async function getTrafficOrigin(
  playerId: string,
  startDate: string,
  endDate: string,
  queryKeys?: string[],
  videoDuration?: number,
  pitchTime?: number,
  timezone: string = DEFAULT_TIMEZONE
): Promise<TrafficOriginResponse> {
  const body: Record<string, unknown> = {
    player_id: playerId,
    start_date: startDate,
    end_date: endDate,
    timezone,
  };
  if (queryKeys) body.query_keys = queryKeys;
  if (videoDuration !== undefined) body.video_duration = videoDuration;
  if (pitchTime !== undefined) body.pitch_time = pitchTime;

  return fetchWithRetry("/traffic_origin/stats", {
    method: "POST",
    body: JSON.stringify(body),
  }, { playerId, startDate, endDate });
}
