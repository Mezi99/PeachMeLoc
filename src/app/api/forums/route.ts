import { NextResponse } from "next/server";
import { listForums, createForum, deleteForum, getDbPath, setDbPath } from "@/db";

export async function GET() {
  try {
    const forums = listForums();
    const currentPath = getDbPath();
    
    return NextResponse.json({
      forums,
      currentForum: forums.find(f => f.path === currentPath)?.name || 'peachme'
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
      
      setDbPath(`./data/${name}.db`);
      return NextResponse.json({ success: true });
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
