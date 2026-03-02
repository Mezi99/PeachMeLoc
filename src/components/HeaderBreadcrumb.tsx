"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderBreadcrumbProps {
  forumName: string;
}

export default function HeaderBreadcrumb({ forumName }: HeaderBreadcrumbProps) {
  const pathname = usePathname();

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

    // Format the label - convert slugs to readable names
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
    } else {
      // This could be a slug (channel name, thread ID, etc.)
      // Leave it as-is for now - could be enhanced to fetch actual names
      label = part
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
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
