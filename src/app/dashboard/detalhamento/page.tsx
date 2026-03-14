"use client";

import { Suspense, useState, useCallback } from "react";
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  ShoppingCart,
  Package,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDateRange } from "@/hooks/useDateRange";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { format } from "date-fns";

interface SaleRow {
  id: string;
  transactionId: string;
  event: string;
  productName: string;
  productId: string;
  buyerName: string;
  buyerEmail: string;
  buyerState: string | null;
  buyerCity: string | null;
  priceValue: number;
  paymentType: string;
  status: string;
  isUpsell: boolean;
  approvedDate: string | null;
  createdAt: string;
}

interface ProductBreakdown {
  name: string;
  count: number;
  revenue: number;
}

interface DetailsResponse {
  sales: SaleRow[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalSales: number;
    totalRevenue: number;
    frontSales: number;
    frontRevenue: number;
    upsellSales: number;
    upsellRevenue: number;
    avgTicket: number;
  };
  products: ProductBreakdown[];
}

const STATUS_COLORS: Record<string, string> = {
  approved: "text-[#00FF9D]",
  refunded: "text-[#FF4444]",
  canceled: "text-[#FF4444]",
  pending: "text-[#FFB800]",
  dispute: "text-[#FF8800]",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  refunded: "Reembolsado",
  canceled: "Cancelado",
  pending: "Pendente",
  dispute: "Disputa",
};

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
            <div className="h-4 w-20 bg-[#1A1A1A] rounded animate-pulse mb-2" />
            <div className="h-8 w-24 bg-[#1A1A1A] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="h-[400px] bg-[#1A1A1A] rounded animate-pulse" />
      </div>
    </div>
  );
}

function DetalhamentoContent() {
  const { dateRange } = useDateRange();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [upsellFilter, setUpsellFilter] = useState("");

  const filters: Record<string, string> = { page: String(page), perPage: "25" };
  if (search) filters.search = search;
  if (statusFilter) filters.status = statusFilter;
  if (upsellFilter) filters.isUpsell = upsellFilter;

  const { data, isLoading } = useDashboardData<DetailsResponse>({
    endpoint: "/api/dashboard/details",
    dateRange,
    filters,
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  }, [handleSearch]);

  const exportCSV = useCallback(() => {
    if (!data?.sales?.length) return;
    const headers = ["Data", "Transação", "Produto", "Comprador", "Email", "Estado", "Valor", "Tipo Pgto", "Status", "Upsell"];
    const rows = data.sales.map((s) => [
      s.approvedDate ?? s.createdAt,
      s.transactionId,
      s.productName,
      s.buyerName,
      s.buyerEmail,
      s.buyerState ?? "",
      s.priceValue.toFixed(2),
      s.paymentType,
      s.status,
      s.isUpsell ? "Sim" : "Não",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, dateRange]);

  if (isLoading) return <LoadingSkeleton />;

  const summary = data?.summary;
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1 flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" /> Vendas Totais
          </p>
          <p className="text-xl font-bold text-white">{fmtNumber(summary?.totalSales ?? 0)}</p>
          <p className="text-xs text-[#A0A0A0]">{fmtCurrency(summary?.totalRevenue ?? 0)}</p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Package className="w-3 h-3" /> Front-end
          </p>
          <p className="text-xl font-bold text-white">{fmtNumber(summary?.frontSales ?? 0)}</p>
          <p className="text-xs text-[#A0A0A0]">{fmtCurrency(summary?.frontRevenue ?? 0)}</p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">Upsell</p>
          <p className="text-xl font-bold text-[#FFB800]">{fmtNumber(summary?.upsellSales ?? 0)}</p>
          <p className="text-xs text-[#A0A0A0]">{fmtCurrency(summary?.upsellRevenue ?? 0)}</p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-1">Ticket Médio</p>
          <p className="text-xl font-bold text-[#00FF9D]">{fmtCurrency(summary?.avgTicket ?? 0)}</p>
        </div>
      </div>

      {/* Products Breakdown */}
      {data?.products && data.products.length > 0 && (
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-[#00FF9D]" />
            PRODUTOS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.products.map((p) => (
              <div key={p.name} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{p.name}</p>
                  <p className="text-[#A0A0A0] text-sm">{fmtNumber(p.count)} vendas</p>
                </div>
                <p className="text-[#00FF9D] font-bold">{fmtCurrency(p.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00FF9D]" />
            TRANSAÇÕES
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-[#A0A0A0]" />
              <input
                type="text"
                placeholder="Buscar nome ou email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-transparent text-white text-sm outline-none w-48 placeholder:text-[#666]"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-white outline-none"
            >
              <option value="">Todos os status</option>
              <option value="approved">Aprovado</option>
              <option value="refunded">Reembolsado</option>
              <option value="canceled">Cancelado</option>
              <option value="pending">Pendente</option>
            </select>

            {/* Upsell filter */}
            <select
              value={upsellFilter}
              onChange={(e) => { setUpsellFilter(e.target.value); setPage(1); }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-white outline-none"
            >
              <option value="">Todos os tipos</option>
              <option value="false">Front-end</option>
              <option value="true">Upsell</option>
            </select>

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left py-3 px-2 text-[#A0A0A0] font-medium">Data</th>
                <th className="text-left py-3 px-2 text-[#A0A0A0] font-medium">Produto</th>
                <th className="text-left py-3 px-2 text-[#A0A0A0] font-medium">Comprador</th>
                <th className="text-left py-3 px-2 text-[#A0A0A0] font-medium">UF</th>
                <th className="text-right py-3 px-2 text-[#A0A0A0] font-medium">Valor</th>
                <th className="text-center py-3 px-2 text-[#A0A0A0] font-medium">Pagamento</th>
                <th className="text-center py-3 px-2 text-[#A0A0A0] font-medium">Status</th>
                <th className="text-center py-3 px-2 text-[#A0A0A0] font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {data?.sales?.map((s) => (
                <tr key={s.id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors">
                  <td className="py-3 px-2 text-[#A0A0A0]">
                    {s.approvedDate ? format(new Date(s.approvedDate), "dd/MM/yy HH:mm") : "—"}
                  </td>
                  <td className="py-3 px-2 text-white max-w-[150px] truncate" title={s.productName}>
                    {s.productName}
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-white text-sm">{s.buyerName}</p>
                    <p className="text-[#666] text-xs">{s.buyerEmail}</p>
                  </td>
                  <td className="py-3 px-2 text-[#A0A0A0]">{s.buyerState ?? "—"}</td>
                  <td className="py-3 px-2 text-right text-white font-medium">{fmtCurrency(s.priceValue)}</td>
                  <td className="py-3 px-2 text-center text-[#A0A0A0]">{s.paymentType}</td>
                  <td className={`py-3 px-2 text-center font-medium ${STATUS_COLORS[s.status] ?? "text-[#A0A0A0]"}`}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      s.isUpsell ? "bg-[#FFB800]/20 text-[#FFB800]" : "bg-[#00FF9D]/20 text-[#00FF9D]"
                    }`}>
                      {s.isUpsell ? "Upsell" : "Front"}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.sales || data.sales.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#A0A0A0]">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2A2A]">
            <p className="text-sm text-[#A0A0A0]">
              {fmtNumber(pagination.total)} transações — Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const startPage = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
                const p = startPage + i;
                if (p > pagination.totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                      p === page
                        ? "bg-[#00FF9D] text-black font-semibold"
                        : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DetalhamentoPage() {
  return (
    <Suspense>
      <DetalhamentoContent />
    </Suspense>
  );
}
