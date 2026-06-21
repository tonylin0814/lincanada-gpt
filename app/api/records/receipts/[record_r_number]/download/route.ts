import chromium from "@sparticuz/chromium";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import { getCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: { record_r_number: string } };

function getBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXTAUTH_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const url = new URL(request.url);
  return url.origin;
}

async function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (process.env.VERCEL || process.env.AWS_REGION) {
    return chromium.executablePath();
  }

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  const { existsSync } = await import("fs");
  return candidates.find((candidate) => existsSync(candidate));
}

export async function GET(request: Request, { params }: RouteContext) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = decodeURIComponent(params.record_r_number);
  const executablePath = await getExecutablePath();

  if (!executablePath) {
    return NextResponse.json(
      { error: "Chromium executable is not available for PDF rendering." },
      { status: 500 },
    );
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-web-security",
        "--font-render-hinting=none",
      ],
      defaultViewport: {
        height: 1100,
        width: 1440,
      },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    const cookieHeader = request.headers.get("cookie");

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    const receiptUrl = `${getBaseUrl(request)}/dashboard/records/receipts/${encodeURIComponent(record)}`;
    await page.goto(receiptUrl, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("body", { timeout: 5000 });
    await page.waitForFunction(() => document.fonts.ready, { timeout: 5000 }).catch(
      () => undefined,
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (page.url().includes("/login")) {
      return NextResponse.json(
        { error: "Could not render PDF because the print page requires login." },
        { status: 401 },
      );
    }

    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "letter",
      landscape: true,
      margin: {
        bottom: "0.35in",
        left: "0.35in",
        right: "0.35in",
        top: "0.35in",
      },
      printBackground: true,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${record}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("Could not render receipt PDF with Chromium:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not render receipt PDF.",
      },
      { status: 500 },
    );
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
