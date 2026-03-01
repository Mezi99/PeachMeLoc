import { getDb } from "@/db";
import { channels, threads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import NewThreadButton from "@/components/NewThreadButton";
import ChannelThreadsManager from "@/components/ChannelThreadsManager";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();

  const [channel] = await db.select().from(channels).where(eq(channels.slug, slug));
  if (!channel) notFound();

  const allThreads = await db
    .select()
    .from(threads)
    .where(eq(threads.channelId, channel.id))
    .orderBy(desc(threads.lastActivityAt));

  // Map threads to include isActive and format dates
  const channelThreads = allThreads.map(t => ({
    ...t,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
    lastActivityAt: t.lastActivityAt ? t.lastActivityAt.toISOString() : null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{channel.emoji}</span>
            <h1 className="text-2xl font-bold text-white">{channel.name}</h1>
          </div>
          {channel.description && (
            <p className="text-gray-400 text-sm">{channel.description}</p>
          )}
        </div>
        <NewThreadButton channelId={channel.id} channelName={channel.name} />
      </div>

      <ChannelThreadsManager 
        initialThreads={channelThreads} 
        channelId={channel.id}
        channelName={channel.name}
      />
    </div>
  );
}
