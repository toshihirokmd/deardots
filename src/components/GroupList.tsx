import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface GroupListProps {
  onGroupSelect: (groupId: Id<"groups">) => void;
  onCreateGroup: () => void;
}

export function GroupList({ onGroupSelect, onCreateGroup }: GroupListProps) {
  const groups = useQuery(api.groups.getUserGroups) || [];
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const joinGroup = useMutation(api.groups.joinGroupWithCode);

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;

    try {
      await joinGroup({ inviteCode: inviteCode.trim() });
      toast.success("Successfully joined the group!");
      setShowInviteModal(false);
      setInviteCode("");
    } catch (error) {
      toast.error("Failed to join group. Please check the invite code.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Your Journals</h2>
          <p className="text-gray-600">Share your daily moments with friends</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
          >
            Join Group
          </button>
          <button
            onClick={onCreateGroup}
            className="px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors shadow-sm"
          >
            Create New Journal
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📖</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No journals yet</h3>
          <p className="text-gray-500 mb-6">Create your first exchange diary or join an existing one</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-6 py-3 bg-white border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Join with Code
            </button>
            <button
              onClick={onCreateGroup}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors"
            >
              Create Journal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group._id}
              onClick={() => onGroupSelect(group._id)}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Group Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                  )}
                </div>
                {group.isMyTurn && (
                  <div className="bg-gradient-to-r from-orange-400 to-pink-400 text-white text-xs px-2 py-1 rounded-full">
                    Your Turn
                  </div>
                )}
              </div>

              {/* Current Turn Info */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full flex items-center justify-center">
                  <span className="text-sm">✍️</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Current writer: </span>
                  <span className="font-medium text-gray-700">
                    {group.currentTurnUser?.name || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Members */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">Members:</span>
                <div className="flex -space-x-1">
                  {group.members.slice(0, 4).map((member, index) => 
                    member ? (
                      <div
                        key={member._id}
                        className="w-6 h-6 bg-gradient-to-br from-orange-300 to-pink-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium"
                        title={member.name || member.email}
                      >
                        {(member.name || member.email || "?")[0].toUpperCase()}
                      </div>
                    ) : null
                  )}
                  {group.members.length > 4 && (
                    <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-600">
                      +{group.members.length - 4}
                    </div>
                  )}
                </div>
              </div>

              {/* Latest Entry */}
              {group.latestEntry && (
                <div className="text-sm text-gray-500">
                  <span>Last entry: </span>
                  <span>{formatDate(group.latestEntry.entryDate)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Join Group Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Join a Journal</h3>
            <p className="text-gray-600 mb-4">
              Enter the invite code shared by your friend to join their journal.
            </p>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteCode("");
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinGroup}
                disabled={!inviteCode.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
