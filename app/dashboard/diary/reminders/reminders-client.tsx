"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ReminderItem = {
  id: number;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  reminder_text: string;
  trigger_day: number | null;
  trigger_date: string | null;
  trigger_month: number | null;
};

type RemindersClientProps = {
  reminders: ReminderItem[];
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return dateKey(new Date());
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function formatDisplayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function reminderMatchesDate(reminder: ReminderItem, key: string) {
  if (reminder.trigger_date?.slice(0, 10) === key) {
    return true;
  }

  if (!reminder.is_recurring || !reminder.trigger_month || !reminder.trigger_day) {
    return false;
  }

  const date = new Date(`${key}T00:00:00`);
  return (
    date.getMonth() + 1 === reminder.trigger_month &&
    date.getDate() === reminder.trigger_day
  );
}

function formatReminderDate(reminder: ReminderItem) {
  if (reminder.trigger_date) {
    return formatDisplayDate(reminder.trigger_date.slice(0, 10));
  }

  if (reminder.is_recurring && reminder.trigger_month && reminder.trigger_day) {
    const date = new Date(2026, reminder.trigger_month - 1, reminder.trigger_day);
    return `Every year on ${date.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    })}`;
  }

  return "No date";
}

function getReminderStatus(reminder: ReminderItem) {
  if (reminder.is_recurring) {
    return "Recurring";
  }

  if (!reminder.trigger_date) {
    return "No Date";
  }

  const reminderDate = reminder.trigger_date.slice(0, 10);
  const today = todayKey();

  if (reminderDate < today) return "Past";
  if (reminderDate === today) return "Today";
  return "Upcoming";
}

export function RemindersClient({ reminders }: RemindersClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(`${todayKey()}T00:00:00`),
  );
  const [showAll, setShowAll] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReminderItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const reminderMap = useMemo(() => {
    const map = new Map<string, ReminderItem[]>();

    for (const reminder of reminders) {
      if (reminder.trigger_date) {
        const key = reminder.trigger_date.slice(0, 10);
        map.set(key, [...(map.get(key) ?? []), reminder]);
      }

      if (
        reminder.is_recurring &&
        reminder.trigger_month &&
        reminder.trigger_day
      ) {
        const year = visibleMonth.getFullYear();
        const recurringDate = new Date(
          year,
          reminder.trigger_month - 1,
          reminder.trigger_day,
        );
        const key = dateKey(recurringDate);
        map.set(key, [...(map.get(key) ?? []), reminder]);
      }
    }

    return map;
  }, [reminders, visibleMonth]);
  const calendarDays = buildCalendarDays(visibleMonth);
  const selectedReminders = reminders.filter((reminder) =>
    reminderMatchesDate(reminder, selectedDate),
  );
  const visibleReminders = showAll ? reminders : selectedReminders;

  function changeMonth(offset: number) {
    setVisibleMonth(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not save reminder.");
      return;
    }

    form.reset();
    setStatus("Reminder saved.");
    router.refresh();
  }

  function startEdit(reminder: ReminderItem) {
    setError("");
    setStatus("");
    setEditingId(reminder.id);
    setEditText(reminder.reminder_text);
    setEditDate(reminder.trigger_date?.slice(0, 10) ?? selectedDate);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditDate("");
  }

  async function saveEdit(reminder: ReminderItem) {
    setError("");
    setStatus("");

    if (!editText.trim() || !editDate) {
      setError("Reminder and date are required.");
      return;
    }

    setIsUpdating(true);
    const response = await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: reminder.id,
        reminder_text: editText.trim(),
        trigger_date: editDate,
      }),
    });
    setIsUpdating(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not update reminder.");
      return;
    }

    cancelEdit();
    setStatus("Reminder updated.");
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setError("");
    setStatus("");
    setIsDeleting(true);
    const response = await fetch(`/api/reminders?id=${deleteTarget.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not delete reminder.");
      return;
    }

    setDeleteTarget(null);
    setStatus("Reminder deleted.");
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="rounded-md border-2 border-green-600 p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            className="h-9 rounded-md border border-foreground/20 px-3 text-sm font-medium hover:border-foreground/45 hover:bg-foreground/5"
            onClick={() => changeMonth(-1)}
            type="button"
          >
            Back
          </button>
          <h2 className="text-lg font-semibold tracking-normal">
            {monthLabel(visibleMonth)}
          </h2>
          <button
            className="h-9 rounded-md border border-foreground/20 px-3 text-sm font-medium hover:border-foreground/45 hover:bg-foreground/5"
            onClick={() => changeMonth(1)}
            type="button"
          >
            Next
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground/55">
          {weekdayLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const key = dateKey(day);
            const hasReminder = reminderMap.has(key);
            const isSelected = key === selectedDate;
            const inMonth = day.getMonth() === visibleMonth.getMonth();

            return (
              <button
                className={`relative flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors ${
                  isSelected
                    ? "border-green-700 bg-green-700 text-white"
                    : "border-foreground/10 hover:border-green-600 hover:bg-green-50"
                } ${inMonth ? "" : "text-foreground/35"}`}
                key={key}
                onClick={() => {
                  setSelectedDate(key);
                  setShowAll(false);
                }}
                type="button"
              >
                {day.getDate()}
                {hasReminder ? (
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-green-700"
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
          <h3 className="text-sm font-semibold tracking-normal">
            Add Reminder
          </h3>
          <label className="block text-sm">
            Date
            <input
              className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
              defaultValue={selectedDate}
              name="trigger_date"
              required
              type="date"
            />
          </label>
          <label className="block text-sm">
            Reminder
            <textarea
              className="mt-2 min-h-20 w-full rounded-md border border-foreground/20 bg-background px-3 py-2"
              name="reminder_text"
              required
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Reminder"}
            </button>
            {status ? (
              <span className="text-sm text-green-700">{status}</span>
            ) : null}
            {error ? <span className="text-sm text-red-600">{error}</span> : null}
          </div>
        </form>
      </section>

      <section className="rounded-md border-2 border-green-600 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">
              {showAll ? "All Reminders" : formatDisplayDate(selectedDate)}
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              {showAll
                ? `${reminders.length} active reminder${reminders.length === 1 ? "" : "s"}`
                : `${selectedReminders.length} reminder${selectedReminders.length === 1 ? "" : "s"} for this day`}
            </p>
          </div>
          <button
            className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium transition-colors hover:border-green-700 hover:bg-green-50 hover:text-green-800"
            onClick={() => setShowAll((current) => !current)}
            type="button"
          >
            {showAll ? "Selected Day" : "All Reminders"}
          </button>
        </div>

        <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-2">
          {visibleReminders.length > 0 ? (
            visibleReminders.map((reminder) => (
              <article
                className="rounded-md border border-foreground/10 p-4"
                key={reminder.id}
              >
                {editingId === reminder.id ? (
                  <div className="grid gap-3">
                    <label className="block text-sm">
                      Date
                      <input
                        className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                        onChange={(event) => setEditDate(event.currentTarget.value)}
                        type="date"
                        value={editDate}
                      />
                    </label>
                    <label className="block text-sm">
                      Reminder
                      <textarea
                        className="mt-2 min-h-20 w-full rounded-md border border-foreground/20 bg-background px-3 py-2"
                        onChange={(event) => setEditText(event.currentTarget.value)}
                        value={editText}
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="h-9 rounded-md bg-green-700 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isUpdating}
                        onClick={() => saveEdit(reminder)}
                        type="button"
                      >
                        {isUpdating ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="h-9 rounded-md border border-foreground/20 px-3 text-sm font-medium hover:border-foreground/45 hover:bg-foreground/5"
                        onClick={cancelEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{reminder.reminder_text}</p>
                        <p className="mt-2 text-sm text-foreground/60">
                          {formatReminderDate(reminder)}
                        </p>
                      </div>
                      <span className="rounded-md border border-green-700 px-2 py-1 text-xs font-medium text-green-800">
                        {getReminderStatus(reminder)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        className="h-9 rounded-md border border-foreground/20 px-3 text-sm font-medium hover:border-green-700 hover:bg-green-50 hover:text-green-800"
                        onClick={() => startEdit(reminder)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="h-9 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:border-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(reminder)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))
          ) : (
            <p className="rounded-md border border-foreground/10 p-5 text-sm text-foreground/60">
              No reminders to show.
            </p>
          )}
        </div>
      </section>

      {deleteTarget ? (
        <div
          aria-labelledby="delete-reminder-title"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-md border border-foreground/10 bg-background p-5 shadow-2xl">
            <h3
              className="text-lg font-semibold tracking-normal"
              id="delete-reminder-title"
            >
              Delete Reminder
            </h3>
            <p className="mt-3 text-sm text-foreground/70">
              Delete this reminder? This will remove it from the active reminder
              list.
            </p>
            <div className="mt-4 rounded-md border border-foreground/10 bg-foreground/5 p-3 text-sm">
              {deleteTarget.reminder_text}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium hover:border-foreground/45 hover:bg-foreground/5"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={confirmDelete}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
