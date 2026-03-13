"use client";

import { useQuery } from "@tanstack/react-query";

export function useDashboardData<T>(endpoint: string, dateRange?: { from: string; to: string }) {
  const params = new URLSearchParams();
  if (dateRange) {
    params.set("from", dateRange.from);
    params.set("to", dateRange.to);
  }

  return useQuery<T>({
    queryKey: [endpoint, dateRange],
    queryFn: async () => {
      const url = `/api/dashboard/${endpoint}${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    refetchInterval: 30000,
  });
}
