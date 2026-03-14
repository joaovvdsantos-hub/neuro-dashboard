"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface UseDateRangeReturn {
  dateRange: { from: Date; to: Date };
  setDateRange: (range: { from: Date; to: Date | undefined }) => void;
  formattedRange: string;
}

export function useDateRange(): UseDateRangeReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateRange = useMemo(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam
      ? parse(fromParam, "yyyy-MM-dd", new Date())
      : subDays(new Date(), 6);
    const to = toParam
      ? parse(toParam, "yyyy-MM-dd", new Date())
      : new Date();

    return { from, to };
  }, [searchParams]);

  const setDateRange = useCallback(
    (range: { from: Date; to: Date | undefined }) => {
      if (!range.to) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("from", format(range.from, "yyyy-MM-dd"));
      params.set("to", format(range.to, "yyyy-MM-dd"));
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const formattedRange = useMemo(() => {
    const fromStr = format(dateRange.from, "dd 'de' MMM, yyyy", {
      locale: ptBR,
    });
    const toStr = format(dateRange.to, "dd 'de' MMM, yyyy", { locale: ptBR });
    return `${fromStr} – ${toStr}`;
  }, [dateRange]);

  return { dateRange, setDateRange, formattedRange };
}
