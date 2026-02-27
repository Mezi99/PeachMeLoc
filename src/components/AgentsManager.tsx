"use client";

import { useState } from "react";

interface Agent {
  id: number;
  name: string;
  avatar: string;
  personaPrompt: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  isActive: boolean;
  createdAt: string | null;
}

const EMOJI_OPTIONS = [
  "🤖", "🧠", "👾", "🦊", "🐺", "🦁", "🐻", "🦅", "🧙", "👨‍💻",
  "👩‍🔬", "🧑‍🎨", "👨‍🏫", "🧑‍⚖️", "🕵️", "🧑‍🚀", "🎭", "🦄", "🐉", "🌟",
];

const DEFAULT_AGENT: Omit<Agent, "id" | "createdAt"> = {
  name: "",
  avatar: "🤖",
  personaPrompt: "",
  llmBaseUrl: "https://api.openai.com/v1",
  llmApiKey: "",
  llmModel: "gpt-4o-mini",
  isActive: true,
};

interface AgentFormProps {
  initial: Omit<Agent, "id" | "createdAt">;
  onSave: (data: Omit<Agent, "id" | "createdAt">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function AgentForm({ initial, onSave, onCancel, saving }: AgentFormProps) {
  const [form, setForm] = useState(initial);
  const [showKey, setShowKey] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      {/* Name + Avatar */}
      <div className="flex gap-3 items-start">
        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiPickerOpen((v) => !v)}
            className="w-14 h-14 rounded-xl bg-gray-800 border border-gray-700 hover:border-indigo-500 flex items-center justify-center text-2xl transition-colors"
          >
            {form.avatar}
          </button>
          {emojiPickerOpen && (
            <div className="absolute top-16 left-0 z-10 bg-gray-900 border border-gray-700 rounded-xl p-3 grid grid-cols-5 gap-2 shadow-2xl">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { set("avatar", e); setEmojiPickerOpen(false); }}
                  className="w-9 h-9 rounded-lg hover:bg-gray-700 flex items-center justify-center text-xl transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400 mb-1">Agent Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Alex the Skeptic"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Persona Prompt */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Persona Prompt
          <span className="text-gray-600 font-normal ml-1">— describe who this agent is</span>
        </label>
        <textarea
          value={form.personaPrompt}
          onChange={(e) => set("personaPrompt", e.target.value)}
          placeholder="You are a skeptical scientist who questions everything with data and logic. You enjoy debating and often play devil's advocate..."
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm resize-none"
        />
      </div>

      {/* LLM Settings */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">LLM Settings</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Base URL</label>
            <input
              type="text"
              value={form.llmBaseUrl}
              onChange={(e) => set("llmBaseUrl", e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
            <input
              type="text"
              value={form.llmModel}
              onChange={(e) => set("llmModel", e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={form.llmApiKey}
              onChange={(e) => set("llmApiKey", e.target.value)}
              placeholder="sk-..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set("isActive", !form.isActive)}
          className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? "bg-indigo-600" : "bg-gray-700"}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
        <span className="text-sm text-gray-300">
          {form.isActive ? "Active — will respond to threads" : "Inactive — will not respond"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim() || !form.personaPrompt.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? "Saving..." : "Save Agent"}
        </button>
      </div>
    </div>
  );
}

export default function AgentsManager({ initialAgents }: { initialAgents: Agent[] }) {
  const [agentsList, setAgentsList] = useState<Agent[]>(initialAgents);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = async (data: Omit<Agent, "id" | "createdAt">) => {
    setSaving(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create agent");
      const agent = await res.json();
      setAgentsList((prev) => [...prev, agent]);
      setCreating(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create agent.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number, data: Omit<Agent, "id" | "createdAt">) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update agent");
      const updated = await res.json();
      setAgentsList((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update agent.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete agent");
      setAgentsList((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete agent.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (agent: Agent) => {
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAgentsList((prev) => prev.map((a) => (a.id === agent.id ? updated : a)));
    } catch {
      alert("Failed to update agent.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Agent cards */}
      {agentsList.map((agent) => (
        <div
          key={agent.id}
          className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
            agent.isActive ? "border-gray-700" : "border-gray-800 opacity-60"
          }`}
        >
          {editingId === agent.id ? (
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Editing: {agent.name}</h3>
              <AgentForm
                initial={{
                  name: agent.name,
                  avatar: agent.avatar,
                  personaPrompt: agent.personaPrompt,
                  llmBaseUrl: agent.llmBaseUrl,
                  llmApiKey: agent.llmApiKey,
                  llmModel: agent.llmModel,
                  isActive: agent.isActive,
                }}
                onSave={(data) => handleUpdate(agent.id, data)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            </div>
          ) : (
            <div className="p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl shrink-0">
                {agent.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{agent.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      agent.isActive
                        ? "bg-green-900 text-green-300"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {agent.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-2">{agent.personaPrompt}</p>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>🔗 {agent.llmBaseUrl.replace("https://", "").replace("/v1", "")}</span>
                  <span>📦 {agent.llmModel}</span>
                  <span>🔑 {agent.llmApiKey ? "••••••••" : "No key set"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(agent)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    agent.isActive
                      ? "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
                      : "border-green-800 text-green-400 hover:bg-green-900/30"
                  }`}
                >
                  {agent.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => setEditingId(agent.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  disabled={deletingId === agent.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-900 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-40"
                >
                  {deletingId === agent.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Create new agent */}
      {creating ? (
        <div className="bg-gray-900 border border-indigo-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-indigo-300 mb-4">New Agent</h3>
          <AgentForm
            initial={DEFAULT_AGENT}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            saving={saving}
          />
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full border-2 border-dashed border-gray-700 hover:border-indigo-600 rounded-xl py-6 text-gray-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <span className="text-xl">+</span>
          Add New Agent
        </button>
      )}

      {agentsList.length === 0 && !creating && (
        <div className="text-center py-8 text-gray-600">
          <p className="text-sm">No agents yet. Add one to get started!</p>
        </div>
      )}
    </div>
  );
}
