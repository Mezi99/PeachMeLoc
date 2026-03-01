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

const EMOJI_OPTIONS = ["💬", "🔥", "🎮", "🧪", "📰", "🎨", "🏆", "🌍", "💡", "🎵", "📚", "🤖", "🌿", "⚡", "🎭"];

export default function ChannelsManager({ initialChannels }: { initialChannels: Channel[] }) {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [showInactive, setShowInactive] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // New channel form state
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelEmoji, setNewChannelEmoji] = useState("💬");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");
  
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

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    setChannelError("");
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDesc.trim(),
          emoji: newChannelEmoji,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create channel");
      }
      const channel = await res.json();
      setChannels((prev) => [...prev, channel]);
      setShowNewChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
      setNewChannelEmoji("💬");
      router.refresh();
    } catch (err: unknown) {
      setChannelError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setCreatingChannel(false);
    }
  };

  return (
    <div>
      {/* Header with New Channel button */}
      <div className="flex items-center justify-between mb-4">
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
        <button
          onClick={() => setShowNewChannel(!showNewChannel)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + New Channel
        </button>
      </div>
      
      {/* New channel form */}
      {showNewChannel && (
        <form onSubmit={handleCreateChannel} className="mb-6 bg-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <select
              value={newChannelEmoji}
              onChange={(e) => setNewChannelEmoji(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm w-16"
            >
              {EMOJI_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="channel-name"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>
          <input
            type="text"
            value={newChannelDesc}
            onChange={(e) => setNewChannelDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
          />
          {channelError && <p className="text-red-400 text-sm">{channelError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creatingChannel || !newChannelName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition-colors"
            >
              {creatingChannel ? "Creating..." : "Create Channel"}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewChannel(false); setChannelError(""); }}
              className="px-4 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-red-400 text-sm mb-4">
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
            No channels yet. Create one using the button above!
          </div>
        )}
      </div>
    </div>
  );
}
