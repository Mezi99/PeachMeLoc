"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface Channel {
  id: number;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  createdAt: string | null;
}

interface AgentSummary {
  id: number;
  name: string;
  avatar: string;
  isActive: boolean;
}

interface SidebarClientProps {
  activeForum: string;
  channels: Channel[];
  agents: AgentSummary[];
}

const EMOJI_OPTIONS = ["💬", "🔥", "🎮", "🧪", "📰", "🎨", "🏆", "🌍", "💡", "🎵", "📚", "🤖", "🌿", "⚡", "🎭"];

export default function SidebarClient({ activeForum, channels: initialChannels, agents }: SidebarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelEmoji, setNewChannelEmoji] = useState("💬");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");
  const [showDMs, setShowDMs] = useState(true);

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
      router.push(`/channel/${channel.slug}`);
      router.refresh();
    } catch (err: unknown) {
      setChannelError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setCreatingChannel(false);
    }
  };

  return (
    <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Logo/Brand with active forum name */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-2xl">🍑</span>
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm leading-tight">PeachMe</span>
            <span className="text-xs text-gray-500 leading-tight">{activeForum}</span>
          </div>
        </div>
      </div>

      {/* All Threads link */}
      <div className="px-3 pt-2 pb-2">
        <Link
          href="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === "/"
              ? "bg-gray-800 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          <span>🏠</span>
          <span>All Threads</span>
        </Link>
      </div>

      {/* Channels section */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between px-3 mb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</span>
          <button
            onClick={() => setShowNewChannel((v) => !v)}
            className="text-gray-500 hover:text-white text-lg leading-none transition-colors"
            title="Add channel"
          >
            +
          </button>
        </div>

        {/* New channel form */}
        {showNewChannel && (
          <form onSubmit={handleCreateChannel} className="mb-2 bg-gray-800 rounded-xl p-3 space-y-2">
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
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
            <input
              type="text"
              value={newChannelDesc}
              onChange={(e) => setNewChannelDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500"
            />
            {channelError && <p className="text-red-400 text-xs">{channelError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creatingChannel || !newChannelName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
              >
                {creatingChannel ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewChannel(false); setChannelError(""); }}
                className="px-3 text-gray-400 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Channel list */}
        <div className="space-y-0.5">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channel/${channel.slug}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === `/channel/${channel.slug}`
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span className="text-base">{channel.emoji}</span>
              <span className="truncate">{channel.name}</span>
            </Link>
          ))}
          {channels.length === 0 && !showNewChannel && (
            <p className="text-xs text-gray-600 px-3 py-2">No channels yet</p>
          )}
        </div>
      </div>

      {/* Direct Messages section */}
      <div className="px-3 pt-5 pb-4 flex-1">
        <button
          onClick={() => setShowDMs((v) => !v)}
          className="flex items-center justify-between w-full px-3 mb-1"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct Messages</span>
          <span className="text-gray-600 text-xs">{showDMs ? "▾" : "▸"}</span>
        </button>

        {showDMs && (
          <div className="space-y-0.5">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dm/${agent.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === `/dm/${agent.id}`
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span className="text-base">{agent.avatar}</span>
                <span className="truncate flex-1">{agent.name}</span>
                {!agent.isActive && (
                  <span className="w-2 h-2 rounded-full bg-gray-700 shrink-0" title="Inactive" />
                )}
                {agent.isActive && (
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Active" />
                )}
              </Link>
            ))}
            {agents.length === 0 && (
              <p className="text-xs text-gray-600 px-3 py-2">
                No agents yet.{" "}
                <Link href="/settings/agents" className="text-indigo-400 hover:underline">
                  Add one
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
