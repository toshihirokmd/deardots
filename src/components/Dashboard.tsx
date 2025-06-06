import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { GroupList } from "./GroupList";
import { JournalView } from "./JournalView";
import { CreateGroup } from "./CreateGroup";
import { AIChat } from "./AIChat";
import { NotificationBell } from "./NotificationBell";
import { Id } from "../../convex/_generated/dataModel";

type View = "groups" | "journal" | "create-group" | "ai-chat";

export function Dashboard() {
  const [currentView, setCurrentView] = useState<View>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState<Id<"groups"> | null>(null);
  const user = useQuery(api.auth.loggedInUser);

  const handleGroupSelect = (groupId: Id<"groups">) => {
    setSelectedGroupId(groupId);
    setCurrentView("journal");
  };

  const handleBackToGroups = () => {
    setCurrentView("groups");
    setSelectedGroupId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-orange-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToGroups}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📖</span>
              </div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                DayShare
              </h1>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={() => setCurrentView("ai-chat")}
              className={`p-2 rounded-lg transition-colors ${
                currentView === "ai-chat"
                  ? "bg-purple-100 text-purple-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="AI Writing Assistant"
            >
              <span className="text-lg">🤖</span>
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Hello, {user?.name || user?.email || "friend"}!</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        {currentView === "groups" && (
          <GroupList
            onGroupSelect={handleGroupSelect}
            onCreateGroup={() => setCurrentView("create-group")}
          />
        )}

        {currentView === "journal" && selectedGroupId && (
          <JournalView
            groupId={selectedGroupId}
            onBack={handleBackToGroups}
          />
        )}

        {currentView === "create-group" && (
          <CreateGroup
            onBack={handleBackToGroups}
            onSuccess={handleBackToGroups}
          />
        )}

        {currentView === "ai-chat" && (
          <AIChat
            groupId={selectedGroupId}
            onBack={() => setCurrentView(selectedGroupId ? "journal" : "groups")}
          />
        )}
      </main>
    </div>
  );
}
