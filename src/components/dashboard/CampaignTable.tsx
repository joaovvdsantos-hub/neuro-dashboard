"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { fmtCurrency, fmtNumber, fmtPercent, fmtRoas } from "@/lib/format";

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  cpm: number;
  cpc: number;
  ctr: number;
  purchases: number;
  revenue: number;
  roas: number;
  cpa: number;
}

interface CampaignTableProps {
  data: CampaignRow[];
  level: string;
}

type SortKey = keyof CampaignRow;

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string; align: string }[] = [
  { key: "campaignName", label: "Nome", format: (v) => String(v), align: "left" },
  { key: "impressions", label: "Impressões", format: fmtNumber, align: "right" },
  { key: "clicks", label: "Cliques", format: fmtNumber, align: "right" },
  { key: "ctr", label: "CTR", format: (v) => fmtPercent(v), align: "right" },
  { key: "spend", label: "Investimento", format: fmtCurrency, align: "right" },
  { key: "cpm", label: "CPM", format: fmtCurrency, align: "right" },
  { key: "cpc", label: "CPC", format: fmtCurrency, align: "right" },
  { key: "purchases", label: "Vendas", format: fmtNumber, align: "right" },
  { key: "revenue", label: "Receita", format: fmtCurrency, align: "right" },
  { key: "roas", label: "ROAS", format: fmtRoas, align: "right" },
  { key: "cpa", label: "CPA", format: fmtCurrency, align: "right" },
];

export function CampaignTable({ data, level }: CampaignTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === "asc" ? an - bn : bn - an;
    });
  }, [data, sortKey, sortDir]);

  const nameLabel = level === "adset" ? "Conjunto" : level === "ad" ? "Anúncio" : "Campanha";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2A2A]">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`py-3 px-2 font-medium text-[#A0A0A0] cursor-pointer hover:text-white transition-colors ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.key === "campaignName" ? nameLabel : col.label}
                  {sortKey === col.key && (
                    sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.campaignId} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors">
              {COLUMNS.map((col) => {
                const val = row[col.key];
                return (
                  <td
                    key={col.key}
                    className={`py-3 px-2 ${col.align === "right" ? "text-right" : "text-left"} ${
                      col.key === "campaignName"
                        ? "text-white font-medium max-w-[200px] truncate"
                        : col.key === "roas"
                        ? Number(val) >= 1 ? "text-[#00FF9D]" : "text-[#FF4444]"
                        : "text-[#A0A0A0]"
                    }`}
                    title={col.key === "campaignName" ? String(val) : undefined}
                  >
                    {col.key === "campaignName" ? String(val) : col.format(Number(val))}
                  </td>
                );
              })}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="py-8 text-center text-[#A0A0A0]">
                Nenhuma campanha encontrada
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
