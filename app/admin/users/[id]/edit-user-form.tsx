"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserDetail } from "@/lib/admin-users";
import type { UserFeature } from "@/lib/features";

type EditUserFormProps = {
  user: AdminUserDetail;
  features: UserFeature[];
  detectedRecordTypes: Array<{
    record_category: string;
    record_type: string;
    feature_key: string | null;
    record_count: number;
    confidence: string;
    source_table: string;
    last_seen_at: string | null;
  }>;
};

export function EditUserForm({
  user,
  features,
  detectedRecordTypes,
}: EditUserFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [showInitializeConfirm, setShowInitializeConfirm] = useState(false);
  const [initializeConfirmed, setInitializeConfirmed] = useState(false);
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
    setSaveStatus("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const shouldInitialize = formData.get("initialize_database") === "on";

    if (shouldInitialize && !initializeConfirmed) {
      setShowInitializeConfirm(true);
      setIsSaving(false);
      return;
    }

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supabase_connection_string: formData.get("supabase_connection_string"),
        google_drive_folder_id: formData.get("google_drive_folder_id"),
        initialize_database: shouldInitialize,
        enabled_features: formData.getAll("enabled_features"),
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

    setInitializeConfirmed(false);
    setShowInitializeConfirm(false);
    setSaveStatus(
      shouldInitialize
        ? "User saved and database initialized."
        : "User saved.",
    );
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
            {user.is_active
              ? user.has_supabase_connection
                ? "Active"
                : "Pending Setup"
              : "Inactive"}
          </dd>
        </div>
        <div>
          <dt className="text-foreground/60">Role</dt>
          <dd className="mt-1 font-medium">
            {user.is_admin ? "Admin" : "User"}
          </dd>
        </div>
      </dl>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} ref={formRef}>
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
        <label className="flex items-start gap-3 rounded-md border border-foreground/10 p-4 text-sm">
          <input
            className="mt-1 h-4 w-4"
            name="initialize_database"
            onChange={() => {
              setInitializeConfirmed(false);
              setShowInitializeConfirm(false);
            }}
            type="checkbox"
          />
          <span>
            <span className="block font-medium">
              Initialize this user&apos;s database
            </span>
            <span className="mt-1 block text-foreground/60">
              Use this after creating or replacing the user&apos;s Supabase project.
              It clears old public data, creates the app tables, and adds only
              starter categories.
            </span>
          </span>
        </label>
        {showInitializeConfirm ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-950">
            <p className="font-medium">Confirm database initialization</p>
            <p className="mt-1">
              This will delete the user&apos;s old Supabase public schema and create
              a clean starter database. Existing records in that Supabase
              project will be removed.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white"
                onClick={() => {
                  setInitializeConfirmed(true);
                  setShowInitializeConfirm(false);
                  setTimeout(() => formRef.current?.requestSubmit(), 0);
                }}
                type="button"
              >
                Initialize and Save
              </button>
              <button
                className="h-10 rounded-md border border-red-300 px-4 text-sm font-medium"
                onClick={() => {
                  setInitializeConfirmed(false);
                  setShowInitializeConfirm(false);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        <label className="block">
          <span className="text-sm font-medium">Google Drive folder ID</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus:border-foreground"
            defaultValue={user.google_drive_folder_id ?? ""}
            name="google_drive_folder_id"
          />
        </label>
        <section className="rounded-md border border-foreground/10 p-4">
          <h2 className="text-base font-semibold tracking-normal">
            Detected Data
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            Read-only summary from this user&apos;s Supabase database.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-foreground/5">
                <tr>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Count</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {detectedRecordTypes.length > 0 ? (
                  detectedRecordTypes.map((recordType) => (
                    <tr
                      className="border-t border-foreground/10"
                      key={`${recordType.record_category}-${recordType.record_type}-${recordType.source_table}`}
                    >
                      <td className="px-3 py-2">{recordType.record_category}</td>
                      <td className="px-3 py-2">{recordType.record_type}</td>
                      <td className="px-3 py-2">{recordType.record_count}</td>
                      <td className="px-3 py-2">{recordType.confidence}</td>
                      <td className="px-3 py-2">{recordType.source_table}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-foreground/60" colSpan={5}>
                      No detected data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-md border border-foreground/10 p-4">
          <h2 className="text-base font-semibold tracking-normal">
            Enabled Features
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            These checkboxes control what this user can see in Lin System.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <label
                className="flex items-start gap-3 rounded-md border border-foreground/10 p-3 text-sm"
                key={feature.key}
              >
                <input
                  className="mt-1 h-4 w-4"
                  defaultChecked={feature.is_enabled}
                  name="enabled_features"
                  type="checkbox"
                  value={feature.key}
                />
                <span>
                  <span className="block font-medium">{feature.label}</span>
                  <span className="mt-1 block text-foreground/55">
                    {feature.group} / {feature.record_type}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saveStatus ? (
          <p className="text-sm text-green-700">{saveStatus}</p>
        ) : null}
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
