"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDateRange } from "@/hooks/useDateRange";
import type { DateRange } from "react-day-picker";

const presets = [
  {
    label: "Hoje",
    range: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Últimos 7 dias",
    range: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: "Últimos 30 dias",
    range: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: "Este mês",
    range: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Mês passado",
    range: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
];

export function DateRangePicker() {
  const { dateRange, setDateRange, formattedRange } = useDateRange();
  const [open, setOpen] = useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) return;
    setDateRange({ from: range.from, to: range.to });
    if (range.from && range.to) {
      setOpen(false);
    }
  };

  const handlePreset = (preset: (typeof presets)[number]) => {
    const r = preset.range();
    setDateRange(r);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center bg-[#111111] border border-[#2A2A2A] text-white hover:border-[#00FF9D] text-sm h-9 px-3 gap-2 rounded-md cursor-pointer"
      >
        <CalendarIcon className="w-4 h-4 text-[#A0A0A0]" />
        {formattedRange}
      </PopoverTrigger>
      <PopoverContent
        className="bg-[#111111] border border-[#2A2A2A] p-0 w-auto"
        align="end"
      >
        <div className="flex">
          <div className="w-36 border-r border-[#2A2A2A] p-3 flex flex-col gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="w-full justify-start text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              numberOfMonths={2}
              locale={ptBR}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
