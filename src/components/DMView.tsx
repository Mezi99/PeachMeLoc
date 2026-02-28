"use client";

import { useState, useRef, useEffect } from "react";

interface DMMessage {
  id: number;
  agentId: number;
  role: string;
  content: string;
  llmPrompt?: string | null;
  createdAt: string | null;
}

interface DMViewProps {
  agentId: number;
  agentName: string;
  agentAvatar: string;
  initialMessages: DMMessage[];
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString();
}

function PromptButton({ prompt }: { prompt: string }) {
  const [show, setShow] = useState(false);

  let messages: { role: string; content: string }[] = [];
  try {
    messages = JSON.parse(prompt);
  } catch {
    messages = [];
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
        title="View Prompt"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </button>
      {show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShow(false)}>
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-200">Prompt Sent to LLM</h3>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${msg.role === 'system' ? 'bg-purple-900/30 border border-purple-800' : msg.role === 'user' ? 'bg-indigo-900/30 border border-indigo-800' : 'bg-gray-800 border border-gray-700'}`}>
                  <span className={`font-medium ${msg.role === 'system' ? 'text-purple-400' : msg.role === 'user' ? 'text-indigo-400' : 'text-green-400'}`}>
                    {msg.role === 'system' ? 'System' : msg.role === 'user' ? 'User' : 'Assistant'}:
                  </span>
                  <pre className="mt-1 whitespace-pre-wrap text-gray-300 font-mono text-xs">{msg.content}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DMView({ agentId, agentName, agentAvatar, initialMessages }: DMViewProps) {
  const [messages, setMessages] = useState<DMMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError("");

    // Optimistically add human message
    const optimisticHuman: DMMessage = {
      id: Date.now(),
      agentId,
      role: "human",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticHuman]);
    const sentContent = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/dms/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sentContent }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const { humanMessage, agentMessage } = await res.json();

      // Replace optimistic message with real one, add agent reply
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticHuman.id),
        { ...humanMessage, createdAt: humanMessage.createdAt ?? new Date().toISOString() },
        { ...agentMessage, createdAt: agentMessage.createdAt ?? new Date().toISOString() },
      ]);
    } catch (err) {
      console.error(err);
      setError("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticHuman.id));
    } finally {
      setSending(false);
    }
  };

  // Start editing a message
  const handleEditStart = (msg: DMMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  // Cancel editing
  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  // Save edited message
  const handleEditSave = async (messageId: number) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/dms/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content: editContent.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update message");
      const updatedMsg = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: updatedMsg.content } : m))
      );
      setEditingMessageId(null);
      setEditContent("");
    } catch (err) {
      console.error(err);
      alert("Failed to update message");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete a message
  const handleDelete = async (messageId: number) => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/dms/${agentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error("Failed to delete message");
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete message");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <div className="text-4xl mb-3">{agentAvatar}</div>
            <p className="text-sm">Start a conversation with {agentName}</p>
          </div>
        )}

        {messages.map((msg) => {
          const isHuman = msg.role === "human";
          return (
            <div key={msg.id} className={`flex gap-3 ${isHuman ? "flex-row-reverse" : ""}`}>
              <div className="shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${
                    isHuman
                      ? "bg-indigo-900 border border-indigo-700"
                      : "bg-gray-800 border border-gray-700"
                  }`}
                >
                  {isHuman ? "👤" : agentAvatar}
                </div>
              </div>
              <div className={`flex-1 max-w-lg flex flex-col ${isHuman ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-2 mb-1 ${isHuman ? "flex-row-reverse" : ""}`}>
                  <span className={`text-xs font-semibold ${isHuman ? "text-indigo-300" : "text-gray-400"}`}>
                    {isHuman ? "You" : agentName}
                  </span>
                  <span className="text-xs text-gray-600">{formatTime(msg.createdAt)}</span>
                  {/* Action buttons - inside bubble header, aligned right */}
                  {editingMessageId !== msg.id && (
                    <div className={`flex gap-0.5 ${isHuman ? "flex-row-reverse" : ""} ml-auto`}>
                      {!isHuman && msg.llmPrompt && (
                        <PromptButton prompt={msg.llmPrompt} />
                      )}
                      <button
                        onClick={() => handleEditStart(msg)}
                        className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    isHuman
                      ? "bg-indigo-700 text-white rounded-tr-sm"
                      : "bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700"
                  }`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(msg.id)}
                          disabled={savingEdit || !editContent.trim()}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors disabled:opacity-40"
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg">
              {agentAvatar}
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 pt-4">
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <div className="w-8 h-8 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center text-base shrink-0">
            👤
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${agentName}...`}
            rows={2}
            disabled={sending}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm resize-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shrink-0"
          >
            Send
          </button>
        </form>
        <p className="text-gray-700 text-xs mt-2 ml-11">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
