import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { createBloodPressureLog } from "@/lib/health";

function toNullableString(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  const systolic = Number(body.systolic);
  const diastolic = Number(body.diastolic);

  if (!Number.isInteger(systolic) || !Number.isInteger(diastolic)) {
    return NextResponse.json(
      { error: "Systolic and diastolic are required." },
      { status: 400 },
    );
  }

  const client = await getUserDb(session.user.supabase_connection_string);

  try {
    const log = await createBloodPressureLog(client, {
      arm: toNullableString(body.arm),
      device: toNullableString(body.device),
      diastolic,
      log_date: logDate,
      log_time: toNullableString(body.log_time),
      notes: toNullableString(body.notes),
      position: toNullableString(body.position),
      pulse: toNullableNumber(body.pulse),
      systolic,
    });

    return NextResponse.json({ log });
  } finally {
    await client.end();
  }
}
