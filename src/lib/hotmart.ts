export function verifyHotmartWebhook(hottok: string): boolean {
  const expectedHottok = process.env.HOTMART_HOTTOK;
  if (!expectedHottok) return false;
  return hottok === expectedHottok;
}

export type HotmartEvent =
  | "PURCHASE_APPROVED"
  | "PURCHASE_COMPLETE"
  | "PURCHASE_CANCELED"
  | "PURCHASE_REFUNDED"
  | "PURCHASE_CHARGEBACK"
  | "PURCHASE_DELAYED";

export interface HotmartWebhookPayload {
  event: HotmartEvent;
  data: {
    product: {
      id: number;
      name: string;
    };
    buyer: {
      email: string;
      name: string;
    };
    purchase: {
      transaction: string;
      order_date: string;
      approved_date: string;
      original_offer_price: {
        value: number;
        currency_code: string;
      };
      offer: {
        code: string;
      };
    };
  };
  hottok: string;
}
