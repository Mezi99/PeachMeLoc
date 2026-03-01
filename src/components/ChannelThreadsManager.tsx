"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Thread {
  id: number;
  title: string;
  category: string;
  channelId: number | null;
  authorName: string;
  createdAt: string | null;
  lastActivityAt: string | null;
  replyCount: number;
  isActive: boolean;
}

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

function formatDate(date: string | null) {
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

export default function ChannelThreadsManager({ 
  initialThreads, 
  channelId,
  channelName 
}: { 
  initialThreads: Thread[];
  channelId: number;
  channelName: string;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState("");

  const displayedThreads = showInactive 
    ? threads 
    : threads.filter(t => t.isActive);

  const handleToggleActive = async (thread: Thread) => {
    setLoading(thread.id);
    setError("");
    try {
      const newActive = !thread.isActive;
      const res = await fetch(`/api/threads/${thread.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update thread");
      }
      
      setThreads(threads.map(t => 
        t.id === thread.id ? { ...t, isActive: newActive } : t
      ));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update thread");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (thread: Thread) => {
    if (!confirm(`Delete thread "${thread.title}"? This will also delete all ${thread.replyCount} posts. This cannot be undone.`)) {
      return;
    }
    
    setLoading(thread.id);
    setError("");
    try {
      const res = await fetch(`/api/threads/${thread.id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete thread");
      }
      
      setThreads(threads.filter(t => t.id !== thread.id));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete thread");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {/* Toggle show inactive */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          Show inactive threads
        </label>
        <span className="text-xs text-gray-500">
          ({threads.filter(t => !t.isActive).length} inactive)
        </span>
      </div>
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}
      
      {displayedThreads.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-lg font-medium text-gray-400">No threads yet in #{channelName}</p>
          <p className="text-sm mt-2">Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedThreads.map((thread) => {
            const catColor = CATEGORY_COLORS[thread.category] ?? CATEGORY_COLORS.Other;
            return (
              <div
                key={thread.id}
                className={`bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 group ${
                  thread.isActive 
                    ? "hover:border-indigo-600 hover:bg-gray-800" 
                    : "opacity-50"
                } transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/thread/${thread.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
                        {thread.category}
                      </span>
                      {!thread.isActive && (
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <h2 className="text-white font-semibold group-hover:text-indigo-300 transition-colors truncate">
                      {thread.title}
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                      by {thread.authorName} · {formatDate(thread.createdAt)}
                    </p>
                  </Link>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-gray-400 text-sm font-medium">
                      {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {formatDate(thread.lastActivityAt)}
                    </span>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => handleToggleActive(thread)}
                        disabled={loading === thread.id}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          thread.isActive
                            ? "bg-gray-700 hover:bg-gray-600 text-white"
                            : "bg-green-900/50 hover:bg-green-900 text-green-400"
                        } disabled:opacity-50`}
                      >
                        {thread.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(thread)}
                        disabled={loading === thread.id}
                        className="px-2 py-1 rounded text-xs font-medium bg-red-900/50 hover:bg-red-900 text-red-400 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
