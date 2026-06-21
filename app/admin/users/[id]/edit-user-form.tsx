"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserDetail } from "@/lib/admin-users";

type EditUserFormProps = {
  user: AdminUserDetail;
};

export function EditUserForm({ user }: EditUserFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
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
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supabase_connection_string: formData.get("supabase_connection_string"),
        google_drive_folder_id: formData.get("google_drive_folder_id"),
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not update user.");
      return;
    }

    router.refresh();
  }

  async function deactivateUser() {
    setError("");
    setIsDeactivating(true);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });

    setIsDeactivating(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not deactivate user.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mt-8 max-w-2xl">
      <dl className="grid gap-4 border border-foreground/10 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-foreground/60">Name</dt>
          <dd className="mt-1 font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-foreground/60">Email</dt>
          <dd className="mt-1 font-medium">{user.email}</dd>
        </div>
        <div>
          <dt className="text-foreground/60">Status</dt>
          <dd className="mt-1 font-medium">
            {user.is_active ? "Active" : "Inactive"}
          </dd>
        </div>
        <div>
          <dt className="text-foreground/60">Role</dt>
          <dd className="mt-1 font-medium">
            {user.is_admin ? "Admin" : "User"}
          </dd>
        </div>
      </dl>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium">
            Supabase connection string
          </span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
            defaultValue={user.supabase_connection_string}
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
            defaultValue={user.google_drive_folder_id ?? ""}
            name="google_drive_folder_id"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            className="h-11 rounded-md bg-foreground px-5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <button
            className="h-11 rounded-md border border-red-600 px-5 text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeactivating || !user.is_active}
            onClick={deactivateUser}
            type="button"
          >
            {isDeactivating ? "Deactivating..." : "Deactivate account"}
          </button>
        </div>
      </form>
    </div>
  );
}
