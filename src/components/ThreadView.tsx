"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Post {
  id: number;
  threadId: number;
  content: string;
  authorType: string;
  authorName: string;
  authorAvatar: string;
  agentId: number | null;
  llmPrompt?: string | null;
  createdAt: string | null;
}

interface ThreadViewProps {
  threadId: number;
  initialPosts: Post[];
  activeAgents?: { id: number; name: string; avatar: string }[];
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

// Render @mentions in posts with bold and different color (for agent posts)
function renderContentWithMentions(content: string, isAgent: boolean) {
  if (!isAgent) {
    // For human posts, just render as-is
    return content;
  }
  
  // For agent posts, highlight @mentions
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="font-bold text-yellow-400">
          {part}
        </span>
      );
    }
    return part;
  });
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

export default function ThreadView({ threadId, initialPosts, activeAgents = [] }: ThreadViewProps) {
  const [postsList, setPostsList] = useState<Post[]>(initialPosts);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<{ name: string; avatar: string } | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Edit state
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [postsList]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      // Post human reply
      const res = await fetch(`/api/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post reply");
      const result = await res.json();
      const newPost = result;
      setPostsList((prev) => [...prev, { ...newPost, createdAt: newPost.createdAt ?? new Date().toISOString() }]);
      setReplyContent("");

      // Get mentioned agent IDs from the post response
      const mentionedAgentIds = result.mentionedAgentIds || [];

      // Trigger AI agent responses (mentioned agents respond first)
      setGenerating(true);
      
      const genRes = await fetch(`/api/threads/${threadId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentionedAgentIds }),
      });
      
      if (!genRes.ok) throw new Error("Failed to generate AI responses");
      
      // Read the response as a stream
      const reader = genRes.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error("Failed to read response stream");
      }
      
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "agent_starting") {
                // Agent is about to start thinking - show typing indicator
                setCurrentAgent({ name: data.agentName, avatar: data.agentAvatar });
              } else if (data.type === "agent_response") {
                // Agent response arrived - add the post to the list
                // (typing indicator stays visible until we get done or next starting event)
                const newPost = data.post;
                setPostsList((prev) => [...prev, { ...newPost, createdAt: newPost.createdAt ?? new Date().toISOString() }]);
              } else if (data.type === "done") {
                // All agents have responded
                setGenerating(false);
                setCurrentAgent(null);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      setGenerating(false);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  };

  // Handle clicking reply on an agent post - adds @mention to the reply box
  const handleAgentReply = (agentName: string) => {
    setReplyContent(`@${agentName} `);
    // Focus the textarea
    const textarea = document.querySelector('textarea[placeholder*="Write a reply"]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };

  // Start editing a post
  const handleEditStart = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  // Cancel editing
  const handleEditCancel = () => {
    setEditingPostId(null);
    setEditContent("");
  };

  // Save edited post
  const handleEditSave = async (postId: number) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/threads/${threadId}/posts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: editContent.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update post");
      const updatedPost = await res.json();
      setPostsList((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, content: updatedPost.content } : p))
      );
      setEditingPostId(null);
      setEditContent("");
    } catch (err) {
      console.error(err);
      alert("Failed to update post");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete a post
  const handleDelete = async (postId: number) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/threads/${threadId}/posts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error("Failed to delete post");
      setPostsList((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete post");
    }
  };

  return (
    <div>
      {/* Posts */}
      <div className="space-y-4 mb-8">
        {postsList.map((post, idx) => {
          const isHuman = post.authorType === "human";
          const isAgent = post.authorType === "agent";
          const isOP = idx === 0;
          return (
            <div
              key={post.id}
              className={`flex gap-4 ${isHuman ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div className="shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    isHuman
                      ? "bg-indigo-900 border border-indigo-700"
                      : "bg-gray-800 border border-gray-700"
                  }`}
                >
                  {post.authorAvatar}
                </div>
              </div>

              {/* Bubble */}
              <div className={`flex-1 max-w-2xl ${isHuman ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`flex items-center gap-2 mb-1 ${isHuman ? "flex-row-reverse" : ""}`}>
                  <Link
                    href={`/dm/${post.agentId}`}
                    className={`text-sm font-semibold ${isHuman ? "text-indigo-300" : "text-indigo-400 hover:text-indigo-300"} cursor-pointer`}
                  >
                    {post.authorName}
                  </Link>
                  {isOP && (
                    <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                      OP
                    </span>
                  )}
                  {!isHuman && (
                    <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                      AI
                    </span>
                  )}
                  <span className="text-xs text-gray-600">{formatTime(post.createdAt)}</span>
                  {/* Action buttons - inside bubble header, aligned right */}
                  {editingPostId !== post.id && (
                    <div className={`flex gap-0.5 ${isHuman ? "flex-row-reverse" : ""} ml-auto`}>
                      {post.llmPrompt && (
                        <PromptButton prompt={post.llmPrompt} />
                      )}
                      {!isHuman && (
                        <button
                          onClick={() => handleAgentReply(post.authorName)}
                          className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
                          title="Reply"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 17 4 12 9 7"/>
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleEditStart(post)}
                        className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
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
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isHuman
                      ? "bg-indigo-700 text-white rounded-tr-sm"
                      : "bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700"
                  }`}
                >
                  {editingPostId === post.id ? (
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
                          onClick={() => handleEditSave(post.id)}
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
                    isAgent ? renderContentWithMentions(post.content, true) : post.content
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Generating indicator - shows current agent typing */}
        {generating && currentAgent && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xl">
              {currentAgent.avatar}
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="text-gray-400 text-sm">{currentAgent.name} is thinking</span>
                  <span className="flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback indicator when we don't know which agent is responding */}
        {generating && !currentAgent && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xl">
              🤖
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="text-gray-400 text-sm">AI agents are thinking</span>
                  <span className="flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply form */}
      <div className="sticky bottom-4">
        <form
          onSubmit={handleReply}
          className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl"
        >
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="flex gap-3 items-end">
            <div className="w-8 h-8 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center text-base shrink-0">
              👤
            </div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply... (AI agents will respond)"
              rows={2}
              disabled={submitting || generating}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm resize-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply(e as unknown as React.FormEvent);
                }
              }}
            />
            <button
              type="submit"
              disabled={submitting || generating || !replyContent.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shrink-0"
            >
              {submitting ? "Posting..." : generating ? "Waiting..." : "Reply"}
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-2 ml-11">
            Press Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
