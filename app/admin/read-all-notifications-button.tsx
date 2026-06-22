"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReadAllNotificationsButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function markRead() {
    setIsSaving(true);
    const response = await fetch("/api/admin/notifications/read-all", {
      method: "POST",
    });
    setIsSaving(false);

    if (response.ok) {
      router.push("/admin?tab=notifications");
      router.refresh();
    }
  }

  return (
    <button
      className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || isSaving}
      onClick={markRead}
      type="button"
    >
      {isSaving ? "Clearing..." : "Read All"}
    </button>
  );
}
