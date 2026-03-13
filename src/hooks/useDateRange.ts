"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";

export function useDateRange(defaultDays = 7) {
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), defaultDays), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });

  return { dateRange, setDateRange };
}
