"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Forum {
  name: string;
  path: string;
  size: number;
}

export default function SavedForumsPage() {
  const router = useRouter();
  const [forums, setForums] = useState<Forum[]>([]);
  const [currentForum, setCurrentForum] = useState<string>("peachme");
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForumName, setNewForumName] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchForums();
  }, []);

  const fetchForums = async () => {
    try {
      const res = await fetch("/api/forums");
      const data = await res.json();
      setForums(data.forums || []);
      setCurrentForum(data.currentForum || "peachme");
    } catch (err) {
      console.error("Failed to fetch forums:", err);
      setError("Failed to load forums");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForumName.trim()) return;
    
    setError("");
    setActionLoading("create");
    
    try {
      const res = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newForumName.trim() })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to create forum");
        return;
      }
      
      setShowNewModal(false);
      setNewForumName("");
      fetchForums();
    } catch (err) {
      setError("Failed to create forum");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwitch = async (name: string) => {
    setActionLoading(name);
    try {
      const res = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", name })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to switch forum");
        return;
      }
      
      // Force full page reload to ensure cookie is read and data refreshes
      window.location.reload();
    } catch (err) {
      setError("Failed to switch forum");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }
    
    setActionLoading(name);
    try {
      const res = await fetch("/api/forums", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to delete forum");
        return;
      }
      
      fetchForums();
    } catch (err) {
      setError("Failed to delete forum");
    } finally {
      setActionLoading(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">💾 Saved Forums</h1>
          <p className="text-gray-400 mt-1">Manage your forum instances</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>➕</span> New Forum
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : forums.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No saved forums yet</p>
          <p>Create a new forum to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forums.map((forum) => (
            <div
              key={forum.name}
              className={`p-4 rounded-lg border ${
                forum.name === currentForum
                  ? "bg-indigo-900/30 border-indigo-500"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍑</span>
                  <div>
                    <h3 className="font-semibold text-white">{forum.name}</h3>
                    <p className="text-sm text-gray-400">
                      {formatSize(forum.size)} • {forum.name === currentForum ? "Currently active" : "Saved"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {forum.name !== currentForum && (
                    <>
                      <button
                        onClick={() => handleSwitch(forum.name)}
                        disabled={actionLoading === forum.name}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === forum.name ? "Loading..." : "Load"}
                      </button>
                      <button
                        onClick={() => handleDelete(forum.name)}
                        disabled={actionLoading === forum.name}
                        className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-200 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {forum.name === currentForum && (
                    <span className="px-3 py-1.5 text-indigo-300 text-sm font-medium">
                      ✓ Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Forum Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create New Forum</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Forum Name
                </label>
                <input
                  type="text"
                  value={newForumName}
                  onChange={(e) => setNewForumName(e.target.value)}
                  placeholder="my-awesome-forum"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Only letters, numbers, hyphens, and underscores
                </p>
              </div>
              {error && (
                <p className="mb-4 text-sm text-red-400">{error}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    setNewForumName("");
                    setError("");
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "create" || !newForumName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading === "create" ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
