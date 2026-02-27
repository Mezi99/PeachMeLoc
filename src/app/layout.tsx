import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { db } from "@/db";
import { channels, agents } from "@/db/schema";
import SidebarClient from "@/components/SidebarClient";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <Link
              href="/settings"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>Manage Agents</span>
            </Link>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-56px)]">
          {/* Sidebar */}
          <SidebarClient
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
          <main className="flex-1 min-w-0 px-6 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
