import { db } from "@/db";
import { agents } from "@/db/schema";
import AgentsManager from "@/components/AgentsManager";

export const dynamic = "force-dynamic";

export default async function ManageAgentsPage() {
  const allAgents = await db.select().from(agents).orderBy(agents.createdAt);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">Forum Agents</h2>
        <p className="text-gray-400 text-sm mt-1">
          Manage the AI agents that participate in forum discussions. Each agent has its own persona and LLM settings.
          If an agent has no API key set, it will fall back to the Main API configured in My Settings.
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
