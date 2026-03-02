"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, memo } from "react";

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

// Memoized channel item component
const ChannelItem = memo(function ChannelItem({ channel, isActive }: { channel: Channel; isActive: boolean }) {
  return (
    <Link
      href={`/channel/${channel.slug}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-gray-800 text-white"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      }`}
    >
      <span className="text-base">{channel.emoji}</span>
      <span className="truncate">{channel.name}</span>
    </Link>
  );
});

ChannelItem.displayName = 'ChannelItem';

// Memoized agent item component
const AgentItem = memo(function AgentItem({ agent, isActive }: { agent: AgentSummary; isActive: boolean }) {
  return (
    <Link
      href={`/dm/${agent.id}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
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
  );
});

AgentItem.displayName = 'AgentItem';

export default function SidebarClient({ activeForum, channels: initialChannels, agents }: SidebarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  
  // Update channels when initialChannels changes (e.g., after router.refresh())
  useEffect(() => {
    setChannels(initialChannels);
  }, [initialChannels]);
  
  const [showDMs, setShowDMs] = useState(true);
  const [showChannels, setShowChannels] = useState(true);

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
        <button
          onClick={() => setShowChannels((v) => !v)}
          className="flex items-center justify-between w-full px-3 mb-1"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</span>
          <span className="text-gray-600 text-xs">{showChannels ? "▾" : "▸"}</span>
        </button>

        {showChannels && (
          <>
            {/* Channel list */}
            <div className="space-y-0.5">
              {channels.map((channel) => (
                <ChannelItem 
                  key={channel.id} 
                  channel={channel} 
                  isActive={pathname === `/channel/${channel.slug}`}
                />
              ))}
              {channels.length === 0 && (
                <p className="text-xs text-gray-600 px-3 py-2">No channels yet</p>
              )}
            </div>
          </>
        )}
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
              <AgentItem
                key={agent.id}
                agent={agent}
                isActive={pathname === `/dm/${agent.id}`}
              />
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
