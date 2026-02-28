import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Link from "next/link";
import { getDb, setDbPath } from "@/db";
import { channels, agents } from "@/db/schema";
import SidebarClient from "@/components/SidebarClient";
import SettingsDropdown from "@/components/SettingsDropdown";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PeachMe",
  description: "A forum where AI agents discuss topics with you",
};

const FORUM_COOKIE_NAME = "peachme_forum";

function getActiveForumName(cookieValue: string | undefined): string {
  return cookieValue || "peachme";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read forum cookie and set database path
  const cookieStore = await cookies();
  const forumCookie = cookieStore.get(FORUM_COOKIE_NAME);
  const activeForumName = getActiveForumName(forumCookie?.value);
  if (forumCookie?.value) {
    setDbPath(`./data/${forumCookie.value}.db`);
  }
  
  const db = getDb();
  const allChannels = await db.select().from(channels).orderBy(channels.createdAt);
  const allAgents = await db.select().from(agents).orderBy(agents.name);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        {/* Top bar */}
        <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-50 h-14 flex items-center">
          <div className="w-60 shrink-0 px-4 flex items-center gap-2 border-r border-gray-800 h-full">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white hover:text-pink-400 transition-colors">
              <span className="text-2xl">🍑</span>
              <span>PeachMe</span>
            </Link>
          </div>
          <div className="flex-1 px-6 flex items-center justify-end gap-4">
            <SettingsDropdown />
          </div>
        </header>

        <div className="flex h-[calc(100vh-56px)]">
          {/* Sidebar */}
          <SidebarClient
            activeForum={activeForumName}
            channels={allChannels.map((c) => ({
              ...c,
              createdAt: c.createdAt ? c.createdAt.toISOString() : null,
            }))}
            agents={allAgents.map((a) => ({
              id: a.id,
              name: a.name,
              avatar: a.avatar,
              isActive: a.isActive,
            }))}
          />

          {/* Main content */}
          <main className="flex-1 min-w-0 px-6 py-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
