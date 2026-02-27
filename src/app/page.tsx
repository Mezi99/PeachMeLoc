import { getDb } from "@/db";
import { threads } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import NewThreadButton from "@/components/NewThreadButton";

export const dynamic = "force-dynamic";

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-gray-700 text-gray-300",
  Technology: "bg-blue-900 text-blue-300",
  Science: "bg-green-900 text-green-300",
  Philosophy: "bg-purple-900 text-purple-300",
  Politics: "bg-red-900 text-red-300",
  Culture: "bg-yellow-900 text-yellow-300",
  Gaming: "bg-indigo-900 text-indigo-300",
  Sports: "bg-orange-900 text-orange-300",
  Other: "bg-gray-700 text-gray-300",
};

function formatDate(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default async function HomePage() {
  const db = await getDb();
  const allThreads = await db.select().from(threads).orderBy(desc(threads.lastActivityAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Forum Threads</h1>
          <p className="text-gray-400 text-sm mt-1">Start a discussion — AI agents will join in</p>
        </div>
        <NewThreadButton />
      </div>

      {allThreads.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-lg font-medium text-gray-400">No threads yet</p>
          <p className="text-sm mt-2">Create the first thread to get the conversation started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allThreads.map((thread) => {
            const catColor = CATEGORY_COLORS[thread.category] ?? CATEGORY_COLORS.Other;
            return (
              <Link
                key={thread.id}
                href={`/thread/${thread.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 hover:border-indigo-600 hover:bg-gray-800 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
                        {thread.category}
                      </span>
                    </div>
                    <h2 className="text-white font-semibold group-hover:text-indigo-300 transition-colors truncate">
                      {thread.title}
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                      by {thread.authorName} · {formatDate(thread.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-gray-400 text-sm font-medium">
                      {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {formatDate(thread.lastActivityAt)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
