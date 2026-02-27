import { getDb } from "@/db";
import { threads, posts, channels } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ThreadView from "@/components/ThreadView";

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
