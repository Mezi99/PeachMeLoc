import { db } from "@/db";
import { agents, directMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import DMView from "@/components/DMView";

export const dynamic = "force-dynamic";

export default async function DMPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const agentIdNum = parseInt(agentId);

  const [agent] = await db.select().from(agents).where(eq(agents.id, agentIdNum));
  if (!agent) notFound();

  const messages = await db
    .select()
    .from(directMessages)
    .where(eq(directMessages.agentId, agentIdNum))
    .orderBy(asc(directMessages.createdAt));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/settings" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 mb-4">
          ← Back to Agents
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl">
            {agent.avatar}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{agent.name}</h1>
            <p className="text-gray-500 text-sm">Direct Message</p>
          </div>
        </div>
      </div>

      <DMView
        agentId={agentIdNum}
        agentName={agent.name}
        agentAvatar={agent.avatar}
        initialMessages={messages.map((m) => ({
          ...m,
          createdAt: m.createdAt ? m.createdAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
