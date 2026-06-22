import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import {
  createReminder,
  deleteReminder,
  updateReminder,
} from "@/lib/reminders";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const reminderText =
    typeof body.reminder_text === "string" ? body.reminder_text.trim() : "";
  const triggerDate =
    typeof body.trigger_date === "string" ? body.trigger_date.trim() : "";

  if (!reminderText || !triggerDate) {
    return NextResponse.json(
      { error: "Reminder and date are required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const reminder = await createReminder(client, {
      reminder_text: reminderText,
      trigger_date: triggerDate,
    });

    return NextResponse.json({ reminder });
  } finally {
    await client.end();
  }
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = Number(body.id);
  const reminderText =
    typeof body.reminder_text === "string" ? body.reminder_text.trim() : "";
  const triggerDate =
    typeof body.trigger_date === "string" ? body.trigger_date.trim() : "";

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid reminder." }, { status: 400 });
  }

  if (!reminderText || !triggerDate) {
    return NextResponse.json(
      { error: "Reminder and date are required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const reminder = await updateReminder(client, id, {
      reminder_text: reminderText,
      trigger_date: triggerDate,
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ reminder });
  } finally {
    await client.end();
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid reminder." }, { status: 400 });
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const deleted = await deleteReminder(client, id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Reminder was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } finally {
    await client.end();
  }
}
