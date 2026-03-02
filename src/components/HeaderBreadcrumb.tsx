"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderBreadcrumbProps {
  forumName: string;
}

export default function HeaderBreadcrumb({ forumName }: HeaderBreadcrumbProps) {
  const pathname = usePathname();

  // Build breadcrumb parts from the path
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
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

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath += "/" + part;

    // Format the label - convert slugs to readable names
    let label = part;
    // Convert slug-case to Title Case
    label = label
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    breadcrumbs.push({
      label,
      href: i < parts.length - 1 ? currentPath : null, // Last part is not a link
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
              className="text-gray-300 hover:text-pink-400 transition-colors capitalize"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-400 capitalize">{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
