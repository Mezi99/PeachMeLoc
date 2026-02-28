"use client";

import { useState, useEffect } from "react";

interface SystemPromptsData {
  publicImportantRules: string;
  dmImportantRules: string;
  publicPostInstruction: string;
  dmPostInstruction: string;
  prototypePublicRules: string;
  prototypeDmRules: string;
  prototypePublicPostInstruction: string;
  prototypeDmPostInstruction: string;
}

export default function SystemPromptsPage() {
  const [data, setData] = useState<SystemPromptsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    publicRules: true,
    dmRules: true,
    publicPostInstruction: true,
    dmPostInstruction: true,
  });

  useEffect(() => {
    fetchSystemPrompts();
  }, []);

  async function fetchSystemPrompts() {
    try {
      const res = await fetch("/api/system-prompt");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to fetch system prompts:", e);
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  async function handleSavePublicRules() {
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
        setMessage({ type: "success", text: "Public rules saved!" });
      } else {
        setMessage({ type: "error", text: "Failed to save rules" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save rules" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDmRules() {
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

  async function handleSavePublicPostInstruction() {
    if (!data) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicPostInstruction: data.publicPostInstruction }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "Public post-instruction saved!" });
      } else {
        setMessage({ type: "error", text: "Failed to save post-instruction" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save post-instruction" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDmPostInstruction() {
    if (!data) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dmPostInstruction: data.dmPostInstruction }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "DM post-instruction saved!" });
      } else {
        setMessage({ type: "error", text: "Failed to save post-instruction" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to save post-instruction" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPublicRules() {
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
        setMessage({ type: "success", text: "Public rules reset to prototype!" });
      } else {
        setMessage({ type: "error", text: "Failed to reset rules" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to reset rules" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDmRules() {
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

  async function handleResetPublicPostInstruction() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPublicPostInstructionToPrototype: true }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "Public post-instruction reset to prototype!" });
      } else {
        setMessage({ type: "error", text: "Failed to reset post-instruction" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to reset post-instruction" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDmPostInstruction() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetDmPostInstructionToPrototype: true }),
      });
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setMessage({ type: "success", text: "DM post-instruction reset to prototype!" });
      } else {
        setMessage({ type: "error", text: "Failed to reset post-instruction" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to reset post-instruction" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">📋 System Prompts</h1>
      <p className="text-gray-400 mb-6">
        Customize the AI agents&apos; system prompts. Use <code className="bg-gray-800 px-1.5 py-0.5 rounded text-pink-400">{"{agentName}"}</code> as a placeholder for the agent&apos;s name.
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Public Thread Rules */}
        <details className="bg-gray-900 rounded-xl border border-gray-800" open={expandedSections.publicRules}>
          <summary 
            className="p-5 cursor-pointer flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            onClick={(e) => { e.preventDefault(); toggleSection("publicRules"); }}
          >
            <h2 className="text-lg font-semibold text-indigo-400">🐛 Public Thread Rules</h2>
            <span className="text-gray-500">{expandedSections.publicRules ? "▼" : "▶"}</span>
          </summary>
          <div className="px-5 pb-5">
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
                onClick={handleSavePublicRules}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleResetPublicRules}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Resetting..." : "Reset to Prototype"}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Prototype (Default)</h3>
              <pre className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
                {data?.prototypePublicRules ?? "No prototype set"}
              </pre>
            </div>
          </div>
        </details>

        {/* DM Rules */}
        <details className="bg-gray-900 rounded-xl border border-gray-800" open={expandedSections.dmRules}>
          <summary 
            className="p-5 cursor-pointer flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            onClick={(e) => { e.preventDefault(); toggleSection("dmRules"); }}
          >
            <h2 className="text-lg font-semibold text-pink-400">💬 DM Rules</h2>
            <span className="text-gray-500">{expandedSections.dmRules ? "▼" : "▶"}</span>
          </summary>
          <div className="px-5 pb-5">
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
                onClick={handleSaveDmRules}
                disabled={saving}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleResetDmRules}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Resetting..." : "Reset to Prototype"}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Prototype (Default)</h3>
              <pre className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
                {data?.prototypeDmRules ?? "No prototype set"}
              </pre>
            </div>
          </div>
        </details>

        {/* Public Post-Instruction */}
        <details className="bg-gray-900 rounded-xl border border-gray-800" open={expandedSections.publicPostInstruction}>
          <summary 
            className="p-5 cursor-pointer flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            onClick={(e) => { e.preventDefault(); toggleSection("publicPostInstruction"); }}
          >
            <h2 className="text-lg font-semibold text-indigo-400">📝 Public Post-Instruction (SYSTEM)</h2>
            <span className="text-gray-500">{expandedSections.publicPostInstruction ? "▼" : "▶"}</span>
          </summary>
          <div className="px-5 pb-5">
            <p className="text-sm text-gray-500 mb-4">
              Final instruction sent as SYSTEM role after the conversation history. This is appended to the prompt when agents respond to public threads.
            </p>
            
            <textarea
              value={data?.publicPostInstruction ?? ""}
              onChange={(e) => setData((prev) => prev ? { ...prev, publicPostInstruction: e.target.value } : prev)}
              className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Enter post-instruction for public threads..."
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSavePublicPostInstruction}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleResetPublicPostInstruction}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Resetting..." : "Reset to Prototype"}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Prototype (Default)</h3>
              <pre className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
                {data?.prototypePublicPostInstruction ?? "No prototype set"}
              </pre>
            </div>
          </div>
        </details>

        {/* DM Post-Instruction */}
        <details className="bg-gray-900 rounded-xl border border-gray-800" open={expandedSections.dmPostInstruction}>
          <summary 
            className="p-5 cursor-pointer flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            onClick={(e) => { e.preventDefault(); toggleSection("dmPostInstruction"); }}
          >
            <h2 className="text-lg font-semibold text-pink-400">📝 DM Post-Instruction (SYSTEM)</h2>
            <span className="text-gray-500">{expandedSections.dmPostInstruction ? "▼" : "▶"}</span>
          </summary>
          <div className="px-5 pb-5">
            <p className="text-sm text-gray-500 mb-4">
              Final instruction sent as SYSTEM role after the conversation history. This is appended to the prompt when agents respond in DMs.
            </p>
            
            <textarea
              value={data?.dmPostInstruction ?? ""}
              onChange={(e) => setData((prev) => prev ? { ...prev, dmPostInstruction: e.target.value } : prev)}
              className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-pink-500 resize-none"
              placeholder="Enter post-instruction for DMs..."
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSaveDmPostInstruction}
                disabled={saving}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleResetDmPostInstruction}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {saving ? "Resetting..." : "Reset to Prototype"}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Prototype (Default)</h3>
              <pre className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-500 overflow-x-auto whitespace-pre-wrap">
                {data?.prototypeDmPostInstruction ?? "No prototype set"}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
