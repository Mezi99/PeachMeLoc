import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listForums, createForum, deleteForum, getDbPath, setDbPath } from "@/db";

// Cookie name for persisting current forum
const FORUM_COOKIE_NAME = "peachme_forum";

async function getForumFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(FORUM_COOKIE_NAME)?.value || null;
}

export async function GET() {
  try {
    // Sync database path with cookie
    const forumName = await getForumFromCookie();
    if (forumName) {
      setDbPath(`./data/${forumName}.db`);
    }
    
    const forums = listForums();
    
    // Use the cookie value directly as current forum name
    const currentForum = forumName || 'peachme';
    
    return NextResponse.json({
      forums,
      currentForum
    });
  } catch (error) {
    console.error("Error listing forums:", error);
    return NextResponse.json(
      { error: "Failed to list forums" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, action } = body;
    
    if (action === "create") {
      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { error: "Forum name is required" },
          { status: 400 }
        );
      }
      
      // Validate name (alphanumeric, hyphens, underscores only)
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return NextResponse.json(
          { error: "Name can only contain letters, numbers, hyphens, and underscores" },
          { status: 400 }
        );
      }
      
      const dbPath = createForum(name);
      return NextResponse.json({ success: true, path: dbPath });
    }
    
    if (action === "switch") {
      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { error: "Forum name is required" },
          { status: 400 }
        );
      }
      
      const newPath = `./data/${name}.db`;
      setDbPath(newPath);
      
      // Set cookie to persist the forum selection
      const response = NextResponse.json({ success: true });
      response.cookies.set(FORUM_COOKIE_NAME, name, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false, // Allow client JS to read
      });
      return response;
    }
    
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error managing forum:", error);
    return NextResponse.json(
      { error: error.message || "Failed to manage forum" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Forum name is required" },
        { status: 400 }
      );
    }
    
    deleteForum(name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting forum:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete forum" },
      { status: 500 }
    );
  }
}
