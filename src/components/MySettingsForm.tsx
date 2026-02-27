"use client";

import { useState } from "react";

interface UserSettingsData {
  id: number;
  nickname: string;
  mainApiBaseUrl: string;
  mainApiKey: string;
  mainApiModel: string;
}

interface MySettingsFormProps {
  initialSettings: UserSettingsData;
}

export default function MySettingsForm({ initialSettings }: MySettingsFormProps) {
  const [nickname, setNickname] = useState(initialSettings.nickname);
  const [mainApiBaseUrl, setMainApiBaseUrl] = useState(initialSettings.mainApiBaseUrl);
  const [mainApiKey, setMainApiKey] = useState(initialSettings.mainApiKey);
  const [mainApiModel, setMainApiModel] = useState(initialSettings.mainApiModel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/user-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, mainApiBaseUrl, mainApiKey, mainApiModel }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save settings");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-xl">
      {/* Profile section */}
      <section>
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span>👤</span> Your Profile
        </h3>
        <div className="bg-gray-900 rounded-xl p-5 space-y-4 border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Forum Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your name in the forum"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              This is how you&apos;ll appear in threads and DMs.
            </p>
          </div>
        </div>
      </section>

      {/* Main API section */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <span>🔌</span> Main API (Fallback)
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          This is the default LLM connection used when an agent has no API key configured.
          Any OpenAI-compatible endpoint works (OpenAI, Ollama, Together AI, etc.).
        </p>
        <div className="bg-gray-900 rounded-xl p-5 space-y-4 border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Base URL
            </label>
            <input
              type="text"
              value={mainApiBaseUrl}
              onChange={(e) => setMainApiBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={mainApiKey}
              onChange={(e) => setMainApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Model
            </label>
            <input
              type="text"
              value={mainApiModel}
              onChange={(e) => setMainApiModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Save button */}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <span>✓</span> Saved!
          </span>
        )}
      </div>
    </form>
  );
}
