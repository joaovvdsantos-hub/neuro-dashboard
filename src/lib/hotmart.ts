export interface HotmartEventData {
  transactionId: string;
  event: string;
  productId: string;
  productName: string;
  buyerEmail: string;
  buyerName: string;
  buyerGender: null;
  buyerState: string | null;
  buyerCity: string | null;
  paymentType: string;
  price: number;
  currency: string;
  approvedDate: Date | null;
  createdAt: Date;
  isUpsell: boolean;
}

export interface HotmartWebhookPayload {
  id: string;
  creation_date: number;
  event: string;
  version: string;
  data: {
    product: {
      id: number;
      ucode: string;
      name: string;
      has_co_production?: boolean;
    };
    buyer: {
      email: string;
      name: string;
      first_name?: string;
      last_name?: string;
      checkout_phone?: string;
      document?: string;
      document_type?: string;
      address?: {
        country_iso?: string;
        country?: string;
        zipcode?: string;
        state?: string;
        city?: string;
        neighborhood?: string;
        street?: string;
        complement?: string;
        number?: string;
      };
    };
    purchase: {
      transaction: string;
      approved_date?: number;
      full_price?: { value: number; currency_value: string };
      price: { value: number; currency_value: string };
      offer?: { code: string };
      order_date: string;
      status: string;
      payment?: {
        installments_number?: number;
        type?: string;
      };
    };
  };
}

export async function validateWebhook(request: Request): Promise<boolean> {
  const hottok = request.headers.get("X-HOTMART-HOTTOK");
  const expectedHottok = process.env.HOTMART_HOTTOK;
  if (!expectedHottok || !hottok) return false;
  return hottok === expectedHottok;
}

export function determineIsUpsell(productName: string): boolean {
  const lower = productName.toLowerCase();
  return lower.includes("protocolos") || lower.includes("upsell");
}

export function parseHotmartEvent(body: unknown): HotmartEventData {
  const payload = body as HotmartWebhookPayload;
  const { event, data } = payload;
  const { product, buyer, purchase } = data;

  let approvedDate: Date | null = null;
  if (event === "PURCHASE_APPROVED" && purchase.approved_date) {
    approvedDate = new Date(purchase.approved_date);
  }

  const createdAt = purchase.order_date
    ? new Date(purchase.order_date)
    : new Date(payload.creation_date);

  return {
    transactionId: purchase.transaction,
    event,
    productId: String(product.id),
    productName: product.name,
    buyerEmail: buyer.email,
    buyerName: buyer.name,
    buyerGender: null,
    buyerState: buyer.address?.state ?? null,
    buyerCity: buyer.address?.city ?? null,
    paymentType: purchase.payment?.type ?? "UNKNOWN",
    price: purchase.price.value,
    currency: purchase.price.currency_value,
    approvedDate,
    createdAt,
    isUpsell: determineIsUpsell(product.name),
  };
}
