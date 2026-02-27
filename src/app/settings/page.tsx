import { db } from "@/db";
import { agents } from "@/db/schema";
import AgentsManager from "@/components/AgentsManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const allAgents = await db.select().from(agents).orderBy(agents.createdAt);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Forum Agents</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage the AI agents that participate in forum discussions. Each agent has its own persona and LLM settings.
        </p>
      </div>
      <AgentsManager
        initialAgents={allAgents.map((a) => ({
          ...a,
          createdAt: a.createdAt ? a.createdAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
