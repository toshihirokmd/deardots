import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { AIChat } from "./AIChat";

interface WriteEntryProps {
  groupId: Id<"groups">;
  onBack: () => void;
  onSuccess: () => void;
}

export function WriteEntry({ groupId, onBack, onSuccess }: WriteEntryProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isQuickReflection, setIsQuickReflection] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [photos, setPhotos] = useState<Id<"_storage">[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draft = useQuery(api.entries.getDraft, { groupId });
  const createEntry = useMutation(api.entries.createEntry);
  const saveDraft = useMutation(api.entries.saveDraft);
  const generateUploadUrl = useMutation(api.entries.generateUploadUrl);

  // Load draft on component mount
  useEffect(() => {
    if (draft) {
      setTitle(draft.title || "");
      setContent(draft.content || "");
      setIsQuickReflection(draft.isQuickReflection || false);
      setPhotos(draft.photos || []);
    }
  }, [draft]);

  const handleSaveDraft = async () => {
    try {
      await saveDraft({
        groupId,
        title: title.trim() || undefined,
        content,
        photos: photos.length > 0 ? photos : undefined,
        isQuickReflection,
      });
      toast.success("Draft saved!");
    } catch (error) {
      toast.error("Failed to save draft");
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please write something before submitting");
      return;
    }

    try {
      await createEntry({
        groupId,
        title: title.trim() || undefined,
        content: content.trim(),
        photos: photos.length > 0 ? photos : undefined,
        isQuickReflection,
        tags: tags.length > 0 ? tags : undefined,
      });
      onSuccess();
    } catch (error) {
      toast.error("Failed to create entry");
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        if (!result.ok) {
          throw new Error("Upload failed");
        }
        
        const { storageId } = await result.json();
        return storageId;
      });

      const newPhotoIds = await Promise.all(uploadPromises);
      setPhotos([...photos, ...newPhotoIds]);
      toast.success("Photos uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = (photoId: Id<"_storage">) => {
    setPhotos(photos.filter(id => id !== photoId));
  };

  if (showAIChat) {
    return (
      <AIChat
        groupId={groupId}
        context={`Writing entry with title: "${title}" and content: "${content.slice(0, 200)}..."`}
        onBack={() => setShowAIChat(false)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Write Entry</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIChat(true)}
            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
            title="Get writing help from AI"
          >
            🤖 AI Help
          </button>
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* Writing Form */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-200 shadow-sm">
        {/* Quick Reflection Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isQuickReflection}
              onChange={(e) => setIsQuickReflection(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Quick Reflection</span>
          </label>
          <span className="text-xs text-gray-500">
            (For shorter, spontaneous thoughts)
          </span>
        </div>

        {/* Title Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind today?"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
          />
        </div>

        {/* Content Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your thoughts *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your day, thoughts, or experiences..."
            rows={isQuickReflection ? 4 : 8}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Photo Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos (optional)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Add Photos"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          
          {/* Photo Preview */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {photos.map((photoId) => (
                <div key={photoId} className="relative">
                  <div className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">📷</span>
                  </div>
                  <button
                    onClick={() => handleRemovePhoto(photoId)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (optional)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Add a tag..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
            >
              Add
            </button>
          </div>
          
          {/* Tag Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-orange-100 text-orange-600 text-sm px-3 py-1 rounded-full flex items-center gap-2"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-orange-400 hover:text-orange-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg hover:from-orange-500 hover:to-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publish Entry
          </button>
        </div>
      </div>
    </div>
  );
}
