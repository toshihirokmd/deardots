import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CreateGroupProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateGroup({ onBack, onSuccess }: CreateGroupProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createGroup = useMutation(api.groups.createGroup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter a journal name");
      return;
    }

    setIsLoading(true);
    try {
      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Journal created successfully!");
      onSuccess();
    } catch (error) {
      toast.error("Failed to create journal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Create New Journal</h2>
          <p className="text-gray-600">Start a new exchange diary with friends</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-orange-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Journal Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Journal Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Our Daily Adventures, College Friends Journal..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this journal about? Who's it for?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">How it works:</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• You'll be the first writer in this journal</li>
              <li>• Invite friends using invite codes</li>
              <li>• Take turns writing entries</li>
              <li>• Share daily moments and thoughts</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Journal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
