import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateWebhook, parseHotmartEvent } from "@/lib/hotmart";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const isValid = await validateWebhook(request);
    if (!isValid) {
      console.warn("[Webhook/Hotmart] Invalid HOTTOK received");
      return NextResponse.json({ received: true });
    }

    const body = await request.json();
    const eventData = parseHotmartEvent(body);

    const status = eventData.event === "PURCHASE_APPROVED" ? "approved"
      : eventData.event === "PURCHASE_REFUNDED" ? "refunded"
      : eventData.event === "PURCHASE_CHARGEBACK" ? "chargeback"
      : "completed";

    await prisma.hotmartSale.upsert({
      where: { transactionId: eventData.transactionId },
      update: {
        event: eventData.event,
        status,
        productName: eventData.productName,
        productId: eventData.productId,
        buyerName: eventData.buyerName,
        buyerEmail: eventData.buyerEmail,
        buyerGender: eventData.buyerGender,
        buyerState: eventData.buyerState,
        buyerCity: eventData.buyerCity,
        paymentType: eventData.paymentType,
        priceValue: eventData.price,
        priceCurrency: eventData.currency,
        isUpsell: eventData.isUpsell,
        ...(eventData.event === "PURCHASE_APPROVED" && eventData.approvedDate
          ? { approvedDate: eventData.approvedDate }
          : {}),
      },
      create: {
        transactionId: eventData.transactionId,
        event: eventData.event,
        productName: eventData.productName,
        productId: eventData.productId,
        buyerName: eventData.buyerName,
        buyerEmail: eventData.buyerEmail,
        buyerGender: eventData.buyerGender,
        buyerState: eventData.buyerState,
        buyerCity: eventData.buyerCity,
        paymentType: eventData.paymentType,
        priceValue: eventData.price,
        priceCurrency: eventData.currency,
        status,
        isUpsell: eventData.isUpsell,
        approvedDate: eventData.approvedDate,
      },
    });

    // Update DailySnapshot using approvedDate if available, otherwise createdAt
    const snapshotDate = eventData.approvedDate ?? eventData.createdAt;
    await updateDailySnapshotSales(snapshotDate);

    return NextResponse.json({ received: true, transactionId: eventData.transactionId });
  } catch (err) {
    console.error("[Webhook/Hotmart] Error:", err);
    return NextResponse.json({ received: true });
  }
}

async function updateDailySnapshotSales(saleDate: Date) {
  const date = new Date(saleDate);
  date.setUTCHours(0, 0, 0, 0);

  try {
    const daySales = await prisma.hotmartSale.findMany({
      where: {
        approvedDate: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
        event: "PURCHASE_APPROVED",
      },
    });

    const frontSales = daySales.filter((s: { isUpsell: boolean }) => !s.isUpsell);
    const upsellSales = daySales.filter((s: { isUpsell: boolean }) => s.isUpsell);

    const totalSales = frontSales.length;
    const totalRevenue = frontSales.reduce((sum: number, s: { priceValue: number }) => sum + s.priceValue, 0);
    const totalUpsellSales = upsellSales.length;
    const totalUpsellRevenue = upsellSales.reduce((sum: number, s: { priceValue: number }) => sum + s.priceValue, 0);

    const existing = await prisma.dailySnapshot.findUnique({ where: { date } });

    const salesData = {
      totalSales,
      totalRevenue: +totalRevenue.toFixed(2),
      totalUpsellSales,
      totalUpsellRevenue: +totalUpsellRevenue.toFixed(2),
    };

    if (existing) {
      const totalAllRevenue = totalRevenue + totalUpsellRevenue;
      const cpa = totalSales > 0 ? +(existing.totalSpend / totalSales).toFixed(2) : 0;
      const roas = existing.totalSpend > 0 ? +(totalAllRevenue / existing.totalSpend).toFixed(2) : 0;
      const profit = +(totalAllRevenue - existing.totalSpend).toFixed(2);

      await prisma.dailySnapshot.update({
        where: { date },
        data: { ...salesData, cpa, roas, profit },
      });
    } else {
      await prisma.dailySnapshot.create({
        data: {
          date,
          ...salesData,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          avgCpm: 0,
          avgCpc: 0,
          avgCtr: 0,
          vslViews: 0,
          vslStarts: 0,
          vslFinishes: 0,
          vslPlayRate: 0,
          vslCompletionRate: 0,
          cpa: 0,
          roas: 0,
          profit: 0,
        },
      });
    }
  } catch (err) {
    console.error("[Webhook/Hotmart] Snapshot update error:", err);
  }
}
