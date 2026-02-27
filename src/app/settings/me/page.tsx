import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import MySettingsForm from "@/components/MySettingsForm";

export const dynamic = "force-dynamic";

export default async function MySettingsPage() {
  // Get or create the singleton settings row
  let rows = await db.select().from(userSettings).where(eq(userSettings.id, 1));
  if (rows.length === 0) {
    const [created] = await db
      .insert(userSettings)
      .values({ id: 1, nickname: "You", mainApiBaseUrl: "https://api.openai.com/v1", mainApiKey: "", mainApiModel: "gpt-4o-mini" })
      .returning();
    rows = [created];
  }
  const settings = rows[0];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">My Settings</h2>
        <p className="text-gray-400 text-sm mt-1">
          Personalise your forum experience and configure the default LLM connection.
        </p>
      </div>
      <MySettingsForm
        initialSettings={{
          id: settings.id,
          nickname: settings.nickname,
          mainApiBaseUrl: settings.mainApiBaseUrl,
          mainApiKey: settings.mainApiKey,
          mainApiModel: settings.mainApiModel,
        }}
      />
    </div>
  );
}
