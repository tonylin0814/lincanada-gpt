import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getUnreviewedCount } from "@/lib/queries";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Lincanada_GPT",
  description: "Personal life management companion app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  let unreviewedCount = 0;

  if (session?.user.supabase_connection_string) {
    const client = await getUserDb(session.user.supabase_connection_string).catch(
      () => null,
    );

    if (client) {
      try {
        unreviewedCount = await getUnreviewedCount(client);
      } finally {
        await client.end();
      }
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {session?.user ? (
          <header className="border-b border-foreground/10 bg-background px-6 py-4 text-sm text-foreground">
            <nav className="mx-auto flex max-w-6xl items-center gap-5">
              <Link className="font-semibold" href="/dashboard">
                Lincanada_GPT
              </Link>
              <Link className="text-foreground/75 hover:text-foreground" href="/dashboard/records">
                Records
              </Link>
              <Link className="text-foreground/75 hover:text-foreground" href="/dashboard/upload">
                Upload
              </Link>
              <Link className="text-foreground/75 hover:text-foreground" href="/dashboard/reports">
                Reports
              </Link>
              <Link className="text-foreground/75 hover:text-foreground" href="/dashboard/review">
                Review
                {unreviewedCount > 0 ? (
                  <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                    {unreviewedCount}
                  </span>
                ) : null}
              </Link>
              {session.user.is_admin ? (
                <Link className="text-foreground/75 hover:text-foreground" href="/admin">
                  Admin Panel
                </Link>
              ) : null}
            </nav>
          </header>
        ) : null}
        {children}
      </body>
    </html>
  );
}
