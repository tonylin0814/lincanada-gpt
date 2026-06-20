"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Receipt, ReceiptItem } from "@/types/licanada_gpt";

export function ReceiptReviewForm({
  receipt,
  items,
}: {
  receipt: Receipt;
  items: ReceiptItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  function collect(form: HTMLFormElement) {
    const formData = new FormData(form);
    return {
      vendor: String(formData.get("vendor") ?? ""),
      receipt_date: String(formData.get("receipt_date") ?? ""),
      category: String(formData.get("category") ?? ""),
      subtotal: String(formData.get("subtotal") || "") || null,
      taxes: JSON.parse(String(formData.get("taxes") || "[]")),
      tips: String(formData.get("tips") || "") || null,
      grand_total: String(formData.get("grand_total") || "") || null,
      payment_method: String(formData.get("payment_method") || "") || null,
      receipt_number: String(formData.get("receipt_number") || "") || null,
      transaction_number:
        String(formData.get("transaction_number") || "") || null,
      authorization_code:
        String(formData.get("authorization_code") || "") || null,
      review_notes: String(formData.get("review_notes") || "") || null,
      items: items.map((item) => ({
        id: item.id,
        item_name: String(formData.get(`item_name_${item.id}`) ?? ""),
        item_category: String(formData.get(`item_category_${item.id}`) ?? ""),
        item_qty: String(formData.get(`item_qty_${item.id}`) || "") || null,
        item_price: String(formData.get(`item_price_${item.id}`) || "") || null,
        item_total_price:
          String(formData.get(`item_total_price_${item.id}`) || "") || null,
      })),
    };
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/records/receipts/${encodeURIComponent(receipt.record_r_number)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(collect(event.currentTarget)),
        },
      );
      if (!response.ok) throw new Error("Could not save changes.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function markReviewed() {
    setError("");
    setIsReviewing(true);
    const notes = (
      document.querySelector("[name='review_notes']") as HTMLTextAreaElement | null
    )?.value;
    const response = await fetch(
      `/api/records/receipts/${encodeURIComponent(receipt.record_r_number)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_notes: notes || null }),
      },
    );
    setIsReviewing(false);
    if (!response.ok) {
      setError("Could not mark reviewed.");
      return;
    }
    router.push("/dashboard/review");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={save}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["vendor", "Vendor", receipt.vendor],
          ["receipt_date", "Date", String(receipt.receipt_date).slice(0, 10)],
          ["category", "Category", receipt.category],
          ["subtotal", "Subtotal", receipt.subtotal ?? ""],
          ["tips", "Tips", receipt.tips ?? ""],
          ["grand_total", "Grand total", receipt.grand_total ?? ""],
          ["payment_method", "Payment method", receipt.payment_method ?? ""],
          ["receipt_number", "Receipt number", receipt.receipt_number ?? ""],
          [
            "transaction_number",
            "Transaction number",
            receipt.transaction_number ?? "",
          ],
          [
            "authorization_code",
            "Authorization code",
            receipt.authorization_code ?? "",
          ],
        ].map(([name, label, value]) => (
          <label className="block text-sm" key={name}>
            {label}
            <input
              className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
              defaultValue={value}
              name={name}
              type={name === "receipt_date" ? "date" : "text"}
            />
          </label>
        ))}
        <label className="block text-sm md:col-span-2">
          Taxes JSONB
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 font-mono text-xs"
            defaultValue={JSON.stringify(receipt.taxes, null, 2)}
            name="taxes"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          Review notes
          <textarea
            className="mt-2 min-h-20 w-full rounded-md border border-foreground/20 bg-background px-3 py-2"
            defaultValue={receipt.review_notes ?? ""}
            name="review_notes"
          />
        </label>
      </div>

      <div className="overflow-x-auto border border-foreground/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-foreground/5">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t border-foreground/10" key={item.id}>
                {[
                  ["item_name", item.item_name],
                  ["item_category", item.item_category],
                  ["item_qty", item.item_qty ?? ""],
                  ["item_price", item.item_price ?? ""],
                  ["item_total_price", item.item_total_price ?? ""],
                ].map(([field, value]) => (
                  <td className="px-3 py-2" key={field}>
                    <input
                      className="h-9 w-full rounded-md border border-foreground/20 bg-background px-2"
                      defaultValue={value}
                      name={`${field}_${item.id}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3">
        <button className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
        <button className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium" disabled={isReviewing} onClick={markReviewed} type="button">
          {isReviewing ? "Marking..." : "Mark as Reviewed"}
        </button>
      </div>
    </form>
  );
}
