"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function BloodPressureForm() {
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
    const response = await fetch("/api/health/blood-pressure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not save blood pressure reading.");
      return;
    }

    form.reset();
    setStatus("Blood pressure reading saved.");
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
        Systolic
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          min={1}
          name="systolic"
          required
          type="number"
        />
      </label>
      <label className="block text-sm">
        Diastolic
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          min={1}
          name="diastolic"
          required
          type="number"
        />
      </label>
      <label className="block text-sm">
        Pulse
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          min={1}
          name="pulse"
          type="number"
        />
      </label>
      <label className="block text-sm">
        Arm
        <select
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          name="arm"
        >
          <option value="">Not specified</option>
          <option value="Left">Left</option>
          <option value="Right">Right</option>
        </select>
      </label>
      <label className="block text-sm">
        Position
        <select
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          name="position"
        >
          <option value="">Not specified</option>
          <option value="Sitting">Sitting</option>
          <option value="Standing">Standing</option>
          <option value="Lying down">Lying down</option>
        </select>
      </label>
      <label className="block text-sm">
        Device
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          name="device"
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
          {isSaving ? "Saving..." : "Save Reading"}
        </button>
        {status ? <span className="text-sm text-green-700">{status}</span> : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
