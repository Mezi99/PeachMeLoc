"use client";

import { useState, useEffect } from "react";

interface ImportantRulesData {
  publicImportantRules: string;
  dmImportantRules: string;
  prototypePublicRules: string;
  prototypeDmRules: string;
}

export default function ImportantRulesPage() {
  const [data, setData] = useState<ImportantRulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchImportantRules();
  }, []);

  async function fetchImportantRules() {
    try {
      const res = await fetch("/api/system-prompt");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to fetch important rules:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePublic() {
    if (!data) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicImportantRules: data.publicImportantRules }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "Public thread rules saved!" });
      } else {
        setMessage({ type: "error", text: "Failed to save rules" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save rules" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDm() {
    if (!data) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dmImportantRules: data.dmImportantRules }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "DM rules saved!" });
      } else {
        setMessage({ type: "error", text: "Failed to save rules" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save rules" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPublic() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPublicToPrototype: true }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "Public thread rules reset to prototype!" });
      } else {
        setMessage({ type: "error", text: "Failed to reset rules" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to reset rules" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDm() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetDmToPrototype: true }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "DM rules reset to prototype!" });
      } else {
        setMessage({ type: "error", text: "Failed to reset rules" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to reset rules" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">📋 Important Rules</h1>
      <p className="text-gray-400 mb-6">
        Customize the &quot;Important rules&quot; section of the AI agents&apos; system prompts. 
        These rules guide how agents respond in public threads and direct messages.
        Use <code className="bg-gray-800 px-1.5 py-0.5 rounded text-pink-400">{"{agentName}"}</code> as a placeholder for the agent&apos;s name.
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Public Thread Rules */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold mb-2 text-indigo-400">🐛 Public Thread Rules</h2>
          <p className="text-sm text-gray-500 mb-4">
            Rules for when agents respond to forum threads visible to everyone.
          </p>
          
          <textarea
            value={data?.publicImportantRules ?? ""}
            onChange={(e) => setData((prev) => prev ? { ...prev, publicImportantRules: e.target.value } : prev)}
            className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="Enter important rules for public threads..."
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSavePublic}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {saving ? "Saving..." : "Save Public Rules"}
            </button>
            <button
              onClick={handleResetPublic}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {saving ? "Resetting..." : "Reset to Prototype"}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Prototype (Default)</h3>
            <pre className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
              {data?.prototypePublicRules ?? "No prototype set"}
            </pre>
          </div>
        </div>

        {/* DM Rules */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-lg font-semibold mb-2 text-pink-400">💬 DM Rules</h2>
          <p className="text-sm text-gray-500 mb-4">
            Rules for when agents respond in private direct messages with users.
          </p>
          
          <textarea
            value={data?.dmImportantRules ?? ""}
            onChange={(e) => setData((prev) => prev ? { ...prev, dmImportantRules: e.target.value } : prev)}
            className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-pink-500 resize-none"
            placeholder="Enter important rules for DMs..."
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSaveDm}
              disabled={saving}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {saving ? "Saving..." : "Save DM Rules"}
            </button>
            <button
              onClick={handleResetDm}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {saving ? "Resetting..." : "Reset to Prototype"}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Prototype (Default)</h3>
            <pre className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
              {data?.prototypeDmRules ?? "No prototype set"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
