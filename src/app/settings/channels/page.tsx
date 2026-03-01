import { getDb } from "@/db";
import { channels, threads } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface ChannelWithStats {
  id: number;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  isActive: boolean;
  createdAt: string | null;
  threadCount: number;
}

export default async function ManageChannelsPage() {
  const db = getDb();
  const allChannels = await db.select().from(channels).orderBy(channels.createdAt);
  
  // Get thread counts for each channel
  const channelsWithStats: ChannelWithStats[] = await Promise.all(
    allChannels.map(async (channel) => {
      const threadCountResult = await db
        .select({ id: threads.id })
        .from(threads)
        .where(eq(threads.channelId, channel.id));
      
      return {
        ...channel,
        createdAt: channel.createdAt ? channel.createdAt.toISOString() : null,
        threadCount: threadCountResult.length,
      };
    })
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">Forum Channels</h2>
        <p className="text-gray-400 text-sm mt-1">
          Manage channels for organizing forum threads. You can delete channels (which removes all threads and posts)
          or mark channels as inactive (which keeps the data but excludes them from AI context).
        </p>
      </div>
      
      <ChannelManager initialChannels={channelsWithStats} />
    </div>
  );
}

export default function ChannelsPage({ initialChannels }: { initialChannels: ChannelWithStats[] }) {
  return (
    <ChannelsManagerClient channels={initialChannels} />
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Channel {
  id: number;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  isActive: boolean;
  createdAt: string | null;
  threadCount: number;
}

function ChannelsManagerClient({ channels: initialChannels }: { channels: Channel[] }) {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [showInactive, setShowInactive] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const displayedChannels = showInactive 
    ? channels 
    : channels.filter(c => c.isActive);

  const handleToggleActive = async (channel: Channel) => {
    setLoading(true);
    setError("");
    try {
      const newActive = !channel.isActive;
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update channel");
      }
      
      setChannels(channels.map(c => 
        c.id === channel.id ? { ...c, isActive: newActive } : c
      ));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update channel");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm(`Delete channel "${channel.name}"? This will also delete all ${channel.threadCount} threads and their posts. This cannot be undone.`)) {
      return;
    }
    
    setDeletingId(channel.id);
    setError("");
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete channel");
      }
      
      setChannels(channels.filter(c => c.id !== channel.id));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete channel");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle show inactive */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          Show inactive channels
        </label>
        <span className="text-xs text-gray-500">
          ({channels.filter(c => !c.isActive).length} inactive)
        </span>
      </div>
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {/* Channel list */}
      <div className="space-y-2">
        {displayedChannels.map((channel) => (
          <div
            key={channel.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              channel.isActive 
                ? "bg-gray-800 border-gray-700" 
                : "bg-gray-900 border-gray-800 opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{channel.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{channel.name}</span>
                  {!channel.isActive && (
                    <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                {channel.description && (
                  <p className="text-sm text-gray-500">{channel.description}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  {channel.threadCount} threads • /channel/{channel.slug}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Toggle active button */}
              <button
                onClick={() => handleToggleActive(channel)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  channel.isActive
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-green-900/50 hover:bg-green-900 text-green-400"
                } disabled:opacity-50`}
              >
                {channel.isActive ? "Deactivate" : "Activate"}
              </button>
              
              {/* Delete button */}
              <button
                onClick={() => handleDelete(channel)}
                disabled={deletingId === channel.id}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-900/50 hover:bg-red-900 text-red-400 transition-colors disabled:opacity-50"
              >
                {deletingId === channel.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
        
        {displayedChannels.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No channels yet. Create one from the sidebar!
          </div>
        )}
      </div>
    </div>
  );
}
