export interface HotmartEventData {
  transactionId: string;
  event: string;
  productId: string;
  productName: string;
  buyerEmail: string;
  buyerName: string;
  buyerGender: string | null;
  price: number;
  currency: string;
  createdAt: Date;
  isUpsell: boolean;
}

export interface HotmartWebhookPayload {
  event: string;
  data: {
    product: { id: string; name: string };
    buyer: {
      email: string;
      name: string;
      gender?: string;
    };
    purchase: {
      transaction: string;
      price: { value: number; currency_value: string };
      order_date: number;
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

  return {
    transactionId: purchase.transaction,
    event,
    productId: String(product.id),
    productName: product.name,
    buyerEmail: buyer.email,
    buyerName: buyer.name,
    buyerGender: buyer.gender || null,
    price: purchase.price.value,
    currency: purchase.price.currency_value,
    createdAt: new Date(purchase.order_date),
    isUpsell: determineIsUpsell(product.name),
  };
}
