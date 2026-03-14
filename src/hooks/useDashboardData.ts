"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface UseDashboardDataOptions<T> {
  endpoint: string;
  dateRange: { from: Date; to: Date };
  filters?: Record<string, string>;
  enabled?: boolean;
}

export function useDashboardData<T>(options: UseDashboardDataOptions<T>) {
  const { endpoint, dateRange, filters, enabled = true } = options;

  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  return useQuery<T, Error>({
    queryKey: [endpoint, from, to, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          params.set(key, value);
        }
      }
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error(`Erro ao carregar dados: ${res.statusText}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    enabled,
  });
}
