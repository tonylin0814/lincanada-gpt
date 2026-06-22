"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AccountFormProps = {
  email: string;
  name: string;
};

export function AccountForm({ email, name }: AccountFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    let response: Response;

    try {
      response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });
    } catch {
      setIsSaving(false);
      setError("Could not update account.");
      return;
    }

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not update account.");
      return;
    }

    setStatus("User information updated.");
    router.refresh();
  }

  return (
    <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <label className="block text-sm">
        Name
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          defaultValue={name}
          name="name"
          required
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-foreground/5 px-3 text-foreground/70"
          defaultValue={email}
          disabled
        />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save User Information"}
        </button>
        {status ? <span className="text-sm text-green-700">{status}</span> : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
