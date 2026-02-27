"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function SettingsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-800"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span>⚙️</span>
        <span>Settings</span>
        <span className="text-gray-600 text-xs ml-0.5">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <Link
            href="/settings/me"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>👤</span>
            <span>My Settings</span>
          </Link>
          <Link
            href="/settings/prompt"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>📋</span>
            <span>Important Rules</span>
          </Link>
          <Link
            href="/settings/agents"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>🤖</span>
            <span>Manage Agents</span>
          </Link>
          <div className="border-t border-gray-700" />
          <Link
            href="/settings/forums"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <span>💾</span>
            <span>Saved Forums</span>
          </Link>
        </div>
      )}
    </div>
  );
}
