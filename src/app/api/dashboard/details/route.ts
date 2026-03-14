import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const now = new Date();
    const start = new Date(sp.get("from") || format(subDays(now, 29), "yyyy-MM-dd"));
    const end = new Date(sp.get("to") || format(now, "yyyy-MM-dd"));
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    // Pagination
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const perPage = Math.min(100, Math.max(10, parseInt(sp.get("perPage") || "25")));
    const skip = (page - 1) * perPage;

    // Filters
    const status = sp.get("status"); // approved, refunded, etc.
    const product = sp.get("product"); // product ID filter
    const search = sp.get("search"); // buyer name/email search
    const isUpsell = sp.get("isUpsell"); // "true" or "false"

    // Build where clause
    const where: Record<string, unknown> = {
      approvedDate: { gte: start, lte: end },
    };

    if (status) where.status = status;
    if (product) where.productId = product;
    if (isUpsell === "true") where.isUpsell = true;
    if (isUpsell === "false") where.isUpsell = false;

    if (search) {
      where.OR = [
        { buyerName: { contains: search, mode: "insensitive" } },
        { buyerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    // Query with pagination
    const [sales, total] = await Promise.all([
      prisma.hotmartSale.findMany({
        where,
        orderBy: { approvedDate: "desc" },
        skip,
        take: perPage,
      }),
      prisma.hotmartSale.count({ where }),
    ]);

    // Summary stats
    const allApproved = await prisma.hotmartSale.findMany({
      where: {
        status: "approved",
        approvedDate: { gte: start, lte: end },
      },
      select: { priceValue: true, isUpsell: true, productId: true },
    });

    const summary = {
      totalSales: allApproved.length,
      totalRevenue: +allApproved.reduce((s, r) => s + r.priceValue, 0).toFixed(2),
      frontSales: allApproved.filter((r) => !r.isUpsell).length,
      frontRevenue: +allApproved.filter((r) => !r.isUpsell).reduce((s, r) => s + r.priceValue, 0).toFixed(2),
      upsellSales: allApproved.filter((r) => r.isUpsell).length,
      upsellRevenue: +allApproved.filter((r) => r.isUpsell).reduce((s, r) => s + r.priceValue, 0).toFixed(2),
      avgTicket: allApproved.length > 0
        ? +(allApproved.reduce((s, r) => s + r.priceValue, 0) / allApproved.length).toFixed(2)
        : 0,
    };

    // Products breakdown
    const productMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const sale of allApproved) {
      const existing = productMap.get(sale.productId);
      if (existing) {
        existing.count += 1;
        existing.revenue += sale.priceValue;
      } else {
        productMap.set(sale.productId, { name: sale.productId, count: 1, revenue: sale.priceValue });
      }
    }
    const products = Array.from(productMap.values()).map((p) => ({
      ...p,
      revenue: +p.revenue.toFixed(2),
    }));

    // Format sales for response
    const formattedSales = sales.map((s) => ({
      id: s.id,
      transactionId: s.transactionId,
      event: s.event,
      productName: s.productName,
      productId: s.productId,
      buyerName: s.buyerName,
      buyerEmail: s.buyerEmail,
      buyerState: s.buyerState,
      buyerCity: s.buyerCity,
      priceValue: s.priceValue,
      paymentType: s.paymentType,
      status: s.status,
      isUpsell: s.isUpsell,
      approvedDate: s.approvedDate ? format(s.approvedDate, "yyyy-MM-dd HH:mm:ss") : null,
      createdAt: format(s.createdAt, "yyyy-MM-dd HH:mm:ss"),
    }));

    return NextResponse.json({
      sales: formattedSales,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
      summary,
      products,
    });
  } catch (err) {
    console.error("[Details API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
