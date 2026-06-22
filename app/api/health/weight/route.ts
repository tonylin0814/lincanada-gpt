import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { createWeightLog } from "@/lib/health";

function toNullableString(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function currentTorontoTime() {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Toronto",
  }).format(new Date());
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const logDate =
    typeof body.log_date === "string" && body.log_date
      ? body.log_date
      : new Date().toISOString().slice(0, 10);
  const weightKg =
    typeof body.weight_kg === "string" ? body.weight_kg.trim() : "";
  const weightNumber = Number(weightKg);

  if (!Number.isFinite(weightNumber) || weightNumber <= 0) {
    return NextResponse.json(
      { error: "Weight is required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const log = await createWeightLog(client, {
      log_date: logDate,
      log_time: toNullableString(body.log_time) ?? currentTorontoTime(),
      notes: toNullableString(body.notes),
      weight_kg: weightKg,
    });

    return NextResponse.json({ log });
  } finally {
    await client.end();
  }
}
