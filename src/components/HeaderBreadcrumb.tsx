"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface AgentInfo {
  id: number;
  name: string;
  avatar: string;
}

interface ChannelInfo {
  id: number;
  name: string;
  slug: string;
  emoji: string;
}

interface ThreadInfo {
  id: number;
  title: string;
}

interface HeaderBreadcrumbProps {
  forumName: string;
}

export default function HeaderBreadcrumb({ forumName }: HeaderBreadcrumbProps) {
  const pathname = usePathname();
  const [agentNames, setAgentNames] = useState<Record<number, string>>({});
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [threadTitles, setThreadTitles] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch agents and channels on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch agents
        const agentsRes = await fetch("/api/agents");
        if (agentsRes.ok) {
          const agents: AgentInfo[] = await agentsRes.json();
          const agentMap: Record<number, string> = {};
          agents.forEach((a) => {
            agentMap[a.id] = a.name;
          });
          setAgentNames(agentMap);
        }

        // Fetch channels
        const channelsRes = await fetch("/api/channels");
        if (channelsRes.ok) {
          const result = await channelsRes.json();
          const channelsData = result.data || result;
          setChannels(channelsData);
        }
      } catch (e) {
        console.error("Failed to fetch breadcrumb data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch thread title when pathname contains thread ID
  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === "thread" && pathParts[i + 1]) {
        const threadId = parseInt(pathParts[i + 1]);
        if (!isNaN(threadId) && !threadTitles[threadId]) {
          // Fetch thread info
          fetch(`/api/threads/${threadId}`)
            .then(res => res.json())
            .then(data => {
              if (data.title) {
                setThreadTitles(prev => ({ ...prev, [threadId]: data.title }));
              }
            })
            .catch(console.error);
        }
      }
    }
  }, [pathname, threadTitles]);

  // Build breadcrumb parts from the path
  const pathParts = pathname.split("/").filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>{forumName}</span>
      </div>
    );
  }

  if (pathParts.length === 0) {
    // Home page - just show forum name (not a link)
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-white">{forumName}</span>
      </div>
    );
  }

  // Build breadcrumb segments
  const breadcrumbs: { label: string; href: string | null; isClickable: boolean }[] = [];
  let currentPath = "";

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += "/" + part;

    let label = part;
    let href: string | null = null;
    let isClickable = false;

    // Determine what this segment represents
    if (part === "channel" && pathParts[i + 1]) {
      // Next part is channel slug
      const slug = pathParts[i + 1];
      const channel = channels.find(c => c.slug === slug);
      label = channel ? `${channel.emoji} ${channel.name}` : slug;
      href = currentPath;
      isClickable = i < pathParts.length - 1; // Clickable if not current page
      i++;
    } 
    else if (part === "thread" && pathParts[i + 1]) {
      // Next part is thread ID
      const threadId = parseInt(pathParts[i + 1]);
      if (!isNaN(threadId)) {
        label = threadTitles[threadId] || `Thread #${threadId}`;
      }
      // This is the current page - not clickable
      href = null;
      isClickable = false;
      i++;
    }
    else if (part === "dm" && pathParts[i + 1]) {
      // Next part is agent ID
      const agentId = parseInt(pathParts[i + 1]);
      if (!isNaN(agentId)) {
        label = agentNames[agentId] ? `DM with ${agentNames[agentId]}` : `DM #${agentId}`;
      }
      href = currentPath;
      isClickable = i < pathParts.length - 1;
      i++;
    }
    else if (part === "settings") {
      label = "Settings";
      href = "/settings";
      isClickable = i < pathParts.length - 1;
    }
    else if (part === "agents") {
      label = "Manage Agents";
      href = "/settings/agents";
      isClickable = i < pathParts.length - 1;
    }
    else if (part === "me") {
      label = "My Settings";
      href = "/settings/me";
      isClickable = i < pathParts.length - 1;
    }
    else if (part === "forums") {
      label = "Saved Forums";
      href = "/settings/forums";
      isClickable = i < pathParts.length - 1;
    }
    else if (part === "prompt") {
      label = "System Prompt";
      href = "/settings/prompt";
      isClickable = i < pathParts.length - 1;
    }
    else if (part === "channels") {
      label = "Manage Channels";
      href = "/settings/channels";
      isClickable = i < pathParts.length - 1;
    }
    else {
      // Unknown segment - format it
      label = part.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    breadcrumbs.push({ label, href, isClickable });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Forum name - not a link */}
      <span className="font-semibold text-white">{forumName}</span>
      
      {breadcrumbs.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-2">
          <span className="text-gray-500">/</span>
          {crumb.isClickable && crumb.href ? (
            <Link
              href={crumb.href}
              className="text-gray-300 hover:text-pink-400 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-400">{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
