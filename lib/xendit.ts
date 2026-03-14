import Xendit from "xendit-node";

function getXenditMode() {
  return process.env.XENDIT_MODE || "mock";
}

let xenditClient: Xendit | null = null;

function getXendit(): Xendit {
  if (!xenditClient) {
    xenditClient = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY! });
  }
  return xenditClient;
}

interface CreatePaymentParams {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
}

export async function createPaymentInvoice(params: CreatePaymentParams) {
  if (getXenditMode() === "mock") {
    return {
      id: `mock_${params.externalId}`,
      invoice_url: `${process.env.NEXT_PUBLIC_APP_URL}/fees/checkout?ref=${params.externalId}`,
      external_id: params.externalId,
      status: "PENDING",
    };
  }

  const xendit = getXendit();
  return xendit.Invoice.createInvoice({
    data: {
      externalId: params.externalId,
      amount: params.amount,
      payerEmail: params.payerEmail,
      description: params.description,
      currency: "PHP",
      successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/fees/success?ref=${params.externalId}`,
    },
  });
}

export function verifyWebhookToken(token: string | null): boolean {
  if (getXenditMode() === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Mock mode must not be used in production");
    }
    return true;
  }
  return token === process.env.XENDIT_WEBHOOK_TOKEN;
}

export function isMockMode(): boolean {
  return getXenditMode() === "mock";
}
