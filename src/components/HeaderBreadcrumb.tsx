"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface AgentInfo {
  id: number;
  name: string;
  avatar: string;
}

interface HeaderBreadcrumbProps {
  forumName: string;
}

export default function HeaderBreadcrumb({ forumName }: HeaderBreadcrumbProps) {
  const pathname = usePathname();
  const [agentNames, setAgentNames] = useState<Record<number, string>>({});
  const [threadTitles, setThreadTitles] = useState<Record<number, string>>({});

  // Fetch agent names and thread titles for dynamic display
  useEffect(() => {
    async function fetchDynamicData() {
      try {
        // Fetch all agents
        const agentsRes = await fetch("/api/agents");
        if (agentsRes.ok) {
          const agents: AgentInfo[] = await agentsRes.json();
          const agentMap: Record<number, string> = {};
          agents.forEach((a) => {
            agentMap[a.id] = a.name;
          });
          setAgentNames(agentMap);
        }
      } catch (e) {
        console.error("Failed to fetch agents for breadcrumb:", e);
      }
    }
    fetchDynamicData();
  }, []);

  // Extract thread IDs and agent IDs from pathname to fetch titles
  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    
    const threadIdsToFetch: number[] = [];
    const agentIdsToFetch: number[] = [];

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      
      // Check for thread ID
      if (part === "thread" && pathParts[i + 1]) {
        const id = parseInt(pathParts[i + 1]);
        if (!isNaN(id)) {
          threadIdsToFetch.push(id);
          i++;
        }
      }
      // Check for DM with agent ID
      else if (part === "dm" && pathParts[i + 1]) {
        const id = parseInt(pathParts[i + 1]);
        if (!isNaN(id)) {
          agentIdsToFetch.push(id);
          i++;
        }
      }
    }

    // We already have agent names from the first useEffect, just need thread titles
    // For now, we'll show IDs in the UI and can improve later
  }, [pathname]);

  // Build breadcrumb parts from the path
  const pathParts = pathname.split("/").filter(Boolean);

  if (pathParts.length === 0) {
    // Home page - just show forum name
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-white">{forumName}</span>
      </div>
    );
  }

  // Build breadcrumb segments
  const breadcrumbs: { label: string; href: string | null }[] = [];
  let currentPath = "";

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += "/" + part;

    let label = part;

    // Format the label based on path segment
    if (part === "channel") {
      label = "Channel";
    } else if (part === "thread") {
      label = "Thread";
    } else if (part === "dm") {
      label = "DM";
    } else if (part === "settings") {
      label = "Settings";
    } else if (part === "agents") {
      label = "Agents";
    } else if (part === "me") {
      label = "My Settings";
    } else if (part === "forums") {
      label = "Forums";
    } else if (part === "prompt") {
      label = "Prompt";
    } else if (part === "channel") {
      label = "Channel";
    } else {
      // This is a slug or ID - format it
      // Check if it's a number (ID) or a slug
      const id = parseInt(part);
      if (!isNaN(id)) {
        // It's an ID - check if we have the name
        if (pathParts[i - 1] === "dm" && agentNames[id]) {
          label = agentNames[id];
        } else if (pathParts[i - 1] === "thread") {
          label = `Thread #${id}`;
        } else {
          label = `#${id}`;
        }
      } else {
        // It's a slug - convert to readable format
        label = part
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    breadcrumbs.push({
      label,
      href: i < pathParts.length - 1 ? currentPath : null,
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href="/"
        className="font-semibold text-white hover:text-pink-400 transition-colors"
      >
        {forumName}
      </Link>
      {breadcrumbs.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-2">
          <span className="text-gray-500">/</span>
          {crumb.href ? (
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
