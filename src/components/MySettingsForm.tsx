"use client";

import { useState } from "react";

interface UserSettingsData {
  id: number;
  nickname: string;
  mainApiBaseUrl: string;
  mainApiKey: string;
  mainApiModel: string;
  hopCounter: number;
  summarizationEnabled: boolean;
  summarizationModel: string;
  summarizationInterval: number;
  summarizationMessagesToSummarize: number;
}

interface MySettingsFormProps {
  initialSettings: UserSettingsData;
}

export default function MySettingsForm({ initialSettings }: MySettingsFormProps) {
  const [nickname, setNickname] = useState(initialSettings.nickname);
  const [mainApiBaseUrl, setMainApiBaseUrl] = useState(initialSettings.mainApiBaseUrl);
  const [mainApiKey, setMainApiKey] = useState(initialSettings.mainApiKey);
  const [mainApiModel, setMainApiModel] = useState(initialSettings.mainApiModel);
  const [hopCounter, setHopCounter] = useState(initialSettings.hopCounter || 2);
  const [summarizationEnabled, setSummarizationEnabled] = useState(initialSettings.summarizationEnabled ?? false);
  const [summarizationModel, setSummarizationModel] = useState(initialSettings.summarizationModel || "gpt-4o-mini");
  const [summarizationInterval, setSummarizationInterval] = useState(initialSettings.summarizationInterval || 50);
  const [summarizationMessagesToSummarize, setSummarizationMessagesToSummarize] = useState(initialSettings.summarizationMessagesToSummarize || 30);
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
        body: JSON.stringify({ 
          nickname, 
          mainApiBaseUrl, 
          mainApiKey, 
          mainApiModel, 
          hopCounter,
          summarizationEnabled,
          summarizationModel,
          summarizationInterval,
          summarizationMessagesToSummarize
        }),
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

      {/* Loop Guard section */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <span>🔄</span> Loop Guard
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Control how many times agents can reply to each other when they mention each other.
          Human messages reset the counter.
        </p>
        <div className="bg-gray-900 rounded-xl p-5 space-y-4 border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Max Reply Hops
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={hopCounter}
              onChange={(e) => setHopCounter(parseInt(e.target.value) || 0)}
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Set to 0 to disable agent-to-agent replies. Recommended: 1-3.
            </p>
          </div>
        </div>
      </section>

      {/* Summarization section */}
      <section>
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <span>📝</span> Context Summarization
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Automatically compress older messages into summaries to extend context window.
          Helps agents remember more of the conversation history.
        </p>
        <div className="bg-gray-900 rounded-xl p-5 space-y-4 border border-gray-800">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Enable Summarization
            </label>
            <button
              type="button"
              onClick={() => setSummarizationEnabled(!summarizationEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                summarizationEnabled ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  summarizationEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {summarizationEnabled && (
            <>
              {/* Summarization Model */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Summarization Model
                </label>
                <input
                  type="text"
                  value={summarizationModel}
                  onChange={(e) => setSummarizationModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  A cheaper/faster model works well for summarization.
                </p>
              </div>

              {/* Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Summarize After Every
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={summarizationInterval}
                    onChange={(e) => setSummarizationInterval(parseInt(e.target.value) || 50)}
                    className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <span className="text-gray-400 text-sm">messages</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  How many new messages before triggering summarization.
                </p>
              </div>

              {/* Messages to summarize */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Messages to Compress
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={summarizationMessagesToSummarize}
                    onChange={(e) => setSummarizationMessagesToSummarize(parseInt(e.target.value) || 30)}
                    className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <span className="text-gray-400 text-sm">messages</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  How many older messages to compress into each summary.
                </p>
              </div>
            </>
          )}
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
