import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  DashboardNavigation,
  type NavigationEntity,
} from "@/components/dashboard-navigation";
import { PageLoadingIndicator } from "@/components/page-loading-indicator";
import { getCurrentSession } from "@/lib/auth";
import { getUserDb } from "@/lib/db";
import { getEntities } from "@/lib/queries";
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
  title: "Lin System",
  description: "Personal life management companion app",
  icons: {
    icon: "/lin-system-logo.png",
    apple: "/lin-system-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  let entities: NavigationEntity[] = [];

  if (session?.user.supabase_connection_string) {
    const client = await getUserDb(session.user.supabase_connection_string).catch(
      () => null,
    );

    if (client) {
      try {
        const nextEntities = await getEntities(client);
        entities = nextEntities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
        }));
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
        <PageLoadingIndicator />
        {session?.user ? (
          <header className="border-b border-foreground/10 bg-background px-6 py-4 text-sm text-foreground print:hidden">
            <DashboardNavigation
              entities={entities}
              isAdmin={session.user.is_admin}
              userName={session.user.name ?? session.user.email ?? "User"}
            />
          </header>
        ) : null}
        {children}
      </body>
    </html>
  );
}
