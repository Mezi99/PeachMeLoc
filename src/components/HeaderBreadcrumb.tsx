"use client";

import Link from "next/link";
import { useBreadcrumb } from "./BreadcrumbContext";

interface HeaderBreadcrumbProps {
  forumName: string;
}

export default function HeaderBreadcrumb({ forumName }: HeaderBreadcrumbProps) {
  const { items } = useBreadcrumb();

  if (items.length === 0) {
    // No breadcrumb set yet - show just forum name
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-white">{forumName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-semibold text-white">{forumName}</span>
      
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-2">
          <span className="text-gray-500">/</span>
          {item.href ? (
            <Link
              href={item.href}
              className="text-gray-300 hover:text-pink-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-400">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
