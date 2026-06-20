import OpenAI from "openai";

export type ReceiptOcrTax = {
  name: string;
  amount: number | null;
};

export type ReceiptOcrResult = {
  vendor: string | null;
  vendor_address: string | null;
  store_number: string | null;
  receipt_number: string | null;
  transaction_number: string | null;
  authorization_code: string | null;
  receipt_date: string | null;
  receipt_time: string | null;
  subtotal: number | null;
  taxes: ReceiptOcrTax[];
  tips: number | null;
  grand_total: number | null;
  payment_method: string | null;
};

const emptyResult: ReceiptOcrResult = {
  vendor: null,
  vendor_address: null,
  store_number: null,
  receipt_number: null,
  transaction_number: null,
  authorization_code: null,
  receipt_date: null,
  receipt_time: null,
  subtotal: null,
  taxes: [],
  tips: null,
  grand_total: null,
  payment_method: null,
};

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function normalizeOcrResult(value: Partial<ReceiptOcrResult>): ReceiptOcrResult {
  return {
    ...emptyResult,
    ...value,
    taxes: Array.isArray(value.taxes) ? value.taxes : [],
  };
}

export async function ocrReceipt(imageBase64: string): Promise<ReceiptOcrResult> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract receipt fields as JSON only. Use null for unknown fields. Dates must be YYYY-MM-DD. Times must be HH:MM:SS if visible. Amounts must be numbers, not strings.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract this receipt into JSON with these keys: vendor, vendor_address, store_number, receipt_number, transaction_number, authorization_code, receipt_date, receipt_time, subtotal, taxes, tips, grand_total, payment_method. taxes must be an array of {name, amount}.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    return emptyResult;
  }

  return normalizeOcrResult(JSON.parse(content) as Partial<ReceiptOcrResult>);
}
