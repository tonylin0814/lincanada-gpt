"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewUserForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  async function testConnection(form: HTMLFormElement) {
    setError("");
    setConnectionStatus("");
    setIsTestingConnection(true);

    const formData = new FormData(form);
    const response = await fetch("/api/admin/supabase-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supabase_connection_string: formData.get("supabase_connection_string"),
      }),
    });

    setIsTestingConnection(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setConnectionStatus("");
      setError(body?.error ?? "Could not connect to Supabase.");
      return;
    }

    setConnectionStatus("Supabase connection works.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        supabase_connection_string: formData.get("supabase_connection_string"),
        google_drive_folder_id: formData.get("google_drive_folder_id"),
        is_admin: formData.get("is_admin") === "on",
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not create user.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form className="mt-8 max-w-2xl space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
          name="name"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Temporary password</span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">
          Supabase connection string
        </span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
          name="supabase_connection_string"
          required
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isTestingConnection}
          onClick={(event) => testConnection(event.currentTarget.form!)}
          type="button"
        >
          {isTestingConnection ? "Testing..." : "Test Supabase"}
        </button>
        {connectionStatus ? (
          <span className="text-sm text-green-700">{connectionStatus}</span>
        ) : null}
      </div>
      <label className="block">
        <span className="text-sm font-medium">Google Drive folder ID</span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
          name="google_drive_folder_id"
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input className="h-4 w-4" name="is_admin" type="checkbox" />
        Admin user
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        className="h-11 rounded-md bg-foreground px-5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
