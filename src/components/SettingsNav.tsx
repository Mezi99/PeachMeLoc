"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/settings/me", label: "👤 My Settings" },
  { href: "/settings/agents", label: "🤖 Manage Agents" },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-8 border-b border-gray-800">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "text-white border-indigo-500"
                : "text-gray-400 hover:text-white border-transparent hover:border-gray-600"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
