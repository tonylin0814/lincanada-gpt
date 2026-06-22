"use client";

import { FormEvent, useState } from "react";

export function PasswordForm() {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    let response: Response;

    try {
      response = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      setIsSaving(false);
      setError("Could not change password.");
      return;
    }

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not change password.");
      return;
    }

    form.reset();
    setStatus("Password changed.");
  }

  return (
    <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <label className="block text-sm">
        New Password
        <input
          autoComplete="new-password"
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block text-sm">
        Confirm New Password
        <input
          autoComplete="new-password"
          className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save Password"}
        </button>
        {status ? <span className="text-sm text-green-700">{status}</span> : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
