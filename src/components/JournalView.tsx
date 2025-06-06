import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { WriteEntry } from "./WriteEntry";
import { CalendarView } from "./CalendarView";

interface JournalViewProps {
  groupId: Id<"groups">;
  onBack: () => void;
}

type ViewMode = "timeline" | "calendar" | "write";

export function JournalView({ groupId, onBack }: JournalViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const groups = useQuery(api.groups.getUserGroups);
  const entries = useQuery(api.entries.getGroupEntries, { groupId });
  const generateInvite = useMutation(api.groups.generateInviteCode);
  const passTurn = useMutation(api.groups.passTurn);

  const group = groups?.find(g => g._id === groupId);

  const handleGenerateInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      const result = await generateInvite({
        groupId,
        invitedEmail: inviteEmail.trim(),
      });
      setGeneratedCode(result.inviteCode);
      toast.success("Invite code generated!");
    } catch (error) {
      toast.error("Failed to generate invite code");
    }
  };

  const handlePassTurn = async () => {
    try {
      await passTurn({ groupId });
      toast.success("Journal passed to next person");
    } catch (error) {
      toast.error("Failed to pass journal");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Group not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Back to Groups
        </button>
      </div>
    );
  }

  if (viewMode === "write") {
    return (
      <WriteEntry
        groupId={groupId}
        onBack={() => setViewMode("timeline")}
        onSuccess={() => {
          setViewMode("timeline");
          toast.success("Entry saved successfully!");
        }}
      />
    );
  }

  if (viewMode === "calendar") {
    return (
      <CalendarView
        groupId={groupId}
        onBack={() => setViewMode("timeline")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{group.name}</h2>
            {group.description && (
              <p className="text-gray-600">{group.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("calendar")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Calendar View"
          >
            📅
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          >
            Invite
          </button>
          {group.isMyTurn && (
            <>
              <button
                onClick={() => setViewMode("write")}
                className="px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors"
              >
                Write Entry
              </button>
              <button
                onClick={handlePassTurn}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Pass Turn
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current Turn Status */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full flex items-center justify-center">
              <span>✍️</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {group.isMyTurn ? "It's your turn to write!" : `${group.currentTurnUser?.name || "Someone"} is writing`}
              </p>
              <p className="text-sm text-gray-500">
                {group.members.length} members in this journal
              </p>
            </div>
          </div>
          
          <div className="flex -space-x-2">
            {group.members.map((member, index) => 
              member ? (
                <div
                  key={member._id}
                  className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm font-medium ${
                    group.currentTurnUser?._id === member._id
                      ? "bg-gradient-to-br from-orange-400 to-pink-400 text-white"
                      : "bg-gradient-to-br from-orange-200 to-pink-200 text-gray-700"
                  }`}
                  title={member.name || member.email}
                >
                  {(member.name || member.email || "?")[0].toUpperCase()}
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>

      {/* Entries Timeline */}
      <div className="space-y-4">
        {entries && entries.length > 0 ? (
          entries.map((entry) => (
            <div
              key={entry._id}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-sm"
            >
              {/* Entry Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-300 to-pink-300 rounded-full flex items-center justify-center text-white font-medium">
                    {(entry.author?.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{entry.author?.name || "Unknown"}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(entry.entryDate)} at {formatTime(entry.entryDate)}
                    </p>
                  </div>
                </div>
                {entry.isQuickReflection && (
                  <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
                    Quick Reflection
                  </span>
                )}
              </div>

              {/* Entry Title */}
              {entry.title && (
                <h3 className="text-lg font-semibold text-gray-800 mb-3">{entry.title}</h3>
              )}

              {/* Entry Content */}
              <div className="prose prose-sm max-w-none mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
              </div>

              {/* Entry Photos */}
              {entry.photos && entry.photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {entry.photos.map((photo) => (
                    photo.url && (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt="Entry photo"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )
                  ))}
                </div>
              )}

              {/* Entry Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📝</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No entries yet</h3>
            <p className="text-gray-500 mb-6">Be the first to write in this journal!</p>
            {group.isMyTurn && (
              <button
                onClick={() => setViewMode("write")}
                className="px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors"
              >
                Write First Entry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Invite to Journal</h3>
            
            {!generatedCode ? (
              <>
                <p className="text-gray-600 mb-4">
                  Enter the email address of the person you want to invite.
                </p>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail("");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateInvite}
                    disabled={!inviteEmail.trim()}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Code
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Share this invite code with your friend:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <code className="text-lg font-mono text-center block">{generatedCode}</code>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  This code will expire in 7 days.
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    toast.success("Code copied to clipboard!");
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors mb-3"
                >
                  Copy Code
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail("");
                    setGeneratedCode("");
                  }}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
