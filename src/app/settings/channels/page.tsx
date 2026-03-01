import { getDb } from "@/db";
import { channels, threads } from "@/db/schema";
import { eq } from "drizzle-orm";
import ChannelsManager from "@/components/ChannelsManager";

export const dynamic = "force-dynamic";

export default async function ManageChannelsPage() {
  const db = getDb();
  const allChannels = await db.select().from(channels).orderBy(channels.createdAt);
  
  // Get thread counts for each channel
  const channelsWithStats = await Promise.all(
    allChannels.map(async (channel) => {
      const threadCountResult = await db
        .select({ id: threads.id })
        .from(threads)
        .where(eq(threads.channelId, channel.id));
      
      return {
        ...channel,
        createdAt: channel.createdAt ? channel.createdAt.toISOString() : null,
        threadCount: threadCountResult.length,
      };
    })
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">Forum Channels</h2>
        <p className="text-gray-400 text-sm mt-1">
          Manage channels for organizing forum threads. You can delete channels (which removes all threads and posts)
          or mark channels as inactive (which keeps the data but excludes them from AI context).
        </p>
      </div>
      <ChannelsManager initialChannels={channelsWithStats} />
    </div>
  );
}
