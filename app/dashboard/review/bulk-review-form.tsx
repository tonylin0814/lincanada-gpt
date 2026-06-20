"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { ReviewQueueRecord } from "@/lib/queries";

export function BulkReviewForm({
  records,
}: {
  records: ReviewQueueRecord[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const selected = formData.getAll("record").map((value) => {
      const [type, ...idParts] = String(value).split(":");
      return { type, id: idParts.join(":") };
    });

    if (selected.length === 0) {
      setError("Select at least one record.");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/records/bulk-review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: selected }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not mark records reviewed.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mt-8 overflow-x-auto border border-foreground/10">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-foreground/5">
            <tr>
              <th className="px-4 py-3 font-medium">Select</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Record #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Vendor/Buyer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr className="border-t border-foreground/10" key={`${record.type}:${record.id}`}>
                <td className="px-4 py-3">
                  <input
                    className="h-4 w-4"
                    name="record"
                    type="checkbox"
                    value={`${record.type}:${record.id}`}
                  />
                </td>
                <td className="px-4 py-3">
                  {record.type === "receipt" ? "Receipt" : "Invoice"}
                </td>
                <td className="px-4 py-3">{record.record_number}</td>
                <td className="px-4 py-3">
                  {new Date(record.record_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">{record.name}</td>
                <td className="px-4 py-3">
                  {record.total
                    ? new Intl.NumberFormat("en-CA", {
                        style: "currency",
                        currency: record.currency,
                      }).format(Number(record.total))
                    : ""}
                </td>
                <td className="px-4 py-3">
                  <a
                    className="underline"
                    href={
                      record.type === "receipt"
                        ? `/dashboard/review/receipt/${encodeURIComponent(record.id)}`
                        : `/dashboard/review/invoice/${encodeURIComponent(record.id)}`
                    }
                  >
                    Review
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? (
          <p className="p-4 text-sm text-foreground/60">No records to review.</p>
        ) : null}
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <button
        className="mt-5 h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || records.length === 0}
        type="submit"
      >
        {isSubmitting ? "Marking..." : "Mark Selected as Reviewed"}
      </button>
    </form>
  );
}
