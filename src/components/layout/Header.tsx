"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";

export function Header() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentProduct = searchParams.get("produto") || "todos";

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [queryClient]);

  const handleProductChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const params = new URLSearchParams(searchParams.toString());
      if (value === "todos") {
        params.delete("produto");
      } else {
        params.set("produto", value);
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : "?");
    },
    [router, searchParams]
  );

  return (
    <header className="flex items-center justify-between py-4 border-b border-[#2A2A2A]">
      <div>
        <span className="text-xl text-white">NEURO </span>
        <span className="text-xl font-bold text-white">DASH</span>
      </div>

      <div className="flex items-center gap-3">
        <DateRangePicker />

        <Select value={currentProduct} onValueChange={handleProductChange}>
          <SelectTrigger className="w-[160px] bg-[#111111] border-[#2A2A2A] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="neuro-academy">Neuro Academy</SelectItem>
            <SelectItem value="upsell">Upsell</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="border-[#2A2A2A] bg-[#111111] text-[#A0A0A0] hover:text-white hover:border-[#00FF9D]"
          onClick={handleRefresh}
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    </header>
  );
}
