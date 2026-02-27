import SettingsNav from "@/components/SettingsNav";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Settings header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>⚙️</span>
          <span>Settings</span>
        </h1>
      </div>

      {/* Sub-navigation tabs */}
      <SettingsNav />

      {children}
    </div>
  );
}
