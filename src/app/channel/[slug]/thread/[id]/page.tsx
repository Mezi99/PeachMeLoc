import { getDb } from "@/db";
import { threads, posts, channels } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ChannelThreadPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const threadId = parseInt(id);
  const db = getDb();

  // Get the channel
  const [channel] = await db.select().from(channels).where(eq(channels.slug, slug));
  if (!channel) notFound();

  // Get the thread - must belong to this channel
  const [thread] = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId));
  if (!thread) notFound();
  if (thread.channelId !== channel.id) notFound();

  const threadPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.threadId, threadId))
    .orderBy(asc(posts.createdAt));

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/channel/${slug}`}
          className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 mb-4"
        >
          ← Back to #{channel.name}
        </Link>
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/channel/${slug}`}
                className="text-xs bg-gray-800 text-gray-400 hover:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
              >
                <span>{channel.emoji}</span>
                <span>{channel.name}</span>
              </Link>
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                {thread.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">{thread.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Started by {thread.authorName} · {thread.replyCount}{" "}
              {thread.replyCount === 1 ? "reply" : "replies"}
            </p>
          </div>
        </div>
      </div>

      <ThreadView
        threadId={threadId}
        initialPosts={threadPosts.map((p) => ({
          ...p,
          createdAt: p.createdAt ? p.createdAt.toISOString() : null,
        }))}
      />
    </div>
  );
}

// Inline ThreadView component for this page
"use client";

import { useState, useRef, useEffect } from "react";

interface Post {
  id: number;
  threadId: number;
  content: string;
  authorType: string;
  authorName: string;
  authorAvatar: string;
  agentId: number | null;
  createdAt: string | null;
}

interface ThreadViewProps {
  threadId: number;
  initialPosts: Post[];
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

function ThreadView({ threadId, initialPosts }: ThreadViewProps) {
  const [postsList, setPostsList] = useState<Post[]>(initialPosts);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
      const newPost = await res.json();
      setPostsList((prev) => [
        ...prev,
        { ...newPost, createdAt: newPost.createdAt ?? new Date().toISOString() },
      ]);
      setReplyContent("");

      // Trigger AI agent responses
      setGenerating(true);
      const genRes = await fetch(`/api/threads/${threadId}/generate`, {
        method: "POST",
      });
      if (!genRes.ok) throw new Error("Failed to generate AI responses");
      const { posts: agentPosts } = await genRes.json();
      setPostsList((prev) => [
        ...prev,
        ...agentPosts.map((p: Post) => ({
          ...p,
          createdAt: p.createdAt ?? new Date().toISOString(),
        })),
      ]);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Posts */}
      <div className="space-y-4 mb-8">
        {postsList.map((post, idx) => {
          const isHuman = post.authorType === "human";
          const isOP = idx === 0;
          return (
            <div key={post.id} className={`flex gap-4 ${isHuman ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className="shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    isHuman ? "bg-indigo-900 border border-indigo-700" : "bg-gray-800 border border-gray-700"
                  }`}
                >
                  {post.authorAvatar}
                </div>
              </div>

              {/* Bubble */}
              <div className={`flex-1 max-w-2xl ${isHuman ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`flex items-center gap-2 mb-1 ${isHuman ? "flex-row-reverse" : ""}`}>
                  <span className={`text-sm font-semibold ${isHuman ? "text-indigo-300" : "text-gray-300"}`}>
                    {post.authorName}
                  </span>
                  {isOP && (
                    <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded font-medium">OP</span>
                  )}
                  {!isHuman && (
                    <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">AI</span>
                  )}
                  <span className="text-xs text-gray-600">{formatTime(post.createdAt)}</span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isHuman
                      ? "bg-indigo-700 text-white rounded-tr-sm"
                      : "bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700"
                  }`}
                >
                  {post.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Generating indicator */}
        {generating && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xl">
              🤖
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="text-gray-400 text-sm">AI agents are thinking</span>
                  <span className="flex gap-1 ml-1">
                    <span
                      className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
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
        <form onSubmit={handleReply} className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl">
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
          <p className="text-gray-600 text-xs mt-2 ml-11">Press Enter to send · Shift+Enter for new line</p>
        </form>
      </div>
    </div>
  );
}
