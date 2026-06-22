import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { askJudy, checkJudyDatabaseHealth } from "@/lib/judy";

type RequestMessage = {
  role: "assistant" | "user";
  text: string;
};

function isValidMessage(value: unknown): value is RequestMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<RequestMessage>;
  return (
    (message.role === "assistant" || message.role === "user") &&
    typeof message.text === "string" &&
    message.text.trim().length > 0 &&
    message.text.length <= 4_000
  );
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.supabase_connection_string) {
    return NextResponse.json(
      { error: "No user database is connected." },
      { status: 400 },
    );
  }

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const messages = body.messages.filter(isValidMessage).slice(-12);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No user message provided." }, { status: 400 });
  }

  const client = await getUserDb(session.user.supabase_connection_string).catch(
    (error) => {
      console.error("Judy could not connect to user database:", error);
      return null;
    },
  );

  if (!client) {
    return NextResponse.json(
      {
        error:
          "Judy could not connect to your records. Please check your user database connection.",
      },
      { status: 502 },
    );
  }

  try {
    const result = await askJudy(client, messages);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Judy assistant failed:", error);
    return NextResponse.json(
      { error: "Judy could not answer right now." },
      { status: 500 },
    );
  } finally {
    await client.end();
  }
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasConnection = Boolean(session.user.supabase_connection_string);
  const health = {
    authenticated: true,
    user_id: session.user.id,
    has_user_database_connection: hasConnection,
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    judy_model: process.env.OPENAI_JUDY_MODEL || "gpt-5.4-mini",
    database: null as Awaited<ReturnType<typeof checkJudyDatabaseHealth>> | null,
  };

  if (!hasConnection) {
    return NextResponse.json(health);
  }

  const client = await getUserDb(session.user.supabase_connection_string).catch(
    () => null,
  );

  if (!client) {
    return NextResponse.json({
      ...health,
      database: {
        connected: false,
        error: "Could not connect to the user's records database.",
      },
    });
  }

  try {
    health.database = await checkJudyDatabaseHealth(client);
    return NextResponse.json(health);
  } finally {
    await client.end();
  }
}
