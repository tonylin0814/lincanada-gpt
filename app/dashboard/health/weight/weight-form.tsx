"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function WeightForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/health/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not save weight reading.");
      return;
    }

    form.reset();
    setStatus("Weight reading saved.");
    router.refresh();
  }

  return (
    <form
      className="mt-6 grid gap-4 border border-foreground/10 p-4 md:grid-cols-4"
      onSubmit={handleSubmit}
    >
      <label className="block text-sm">
        Date
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={today()}
          name="log_date"
          required
          type="date"
        />
      </label>
      <label className="block text-sm">
        Time
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          name="log_time"
          type="time"
        />
      </label>
      <label className="block text-sm">
        Weight (kg)
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          min="1"
          name="weight_kg"
          required
          step="0.1"
          type="number"
        />
      </label>
      <label className="block text-sm md:col-span-4">
        Notes
        <textarea
          className="mt-2 min-h-20 w-full rounded-md border border-foreground/20 bg-background px-3 py-2"
          name="notes"
        />
      </label>
      <div className="flex items-center gap-3 md:col-span-4">
        <button
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save Weight"}
        </button>
        {status ? <span className="text-sm text-green-700">{status}</span> : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
