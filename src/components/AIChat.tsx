import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface AIChatProps {
  groupId?: Id<"groups"> | null;
  context?: string;
  onBack: () => void;
}

export function AIChat({ groupId, context, onBack }: AIChatProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatHistory = useQuery(api.ai.getChatHistory, { groupId: groupId || undefined });
  const chatWithAI = useAction(api.ai.chatWithAI);
  const clearHistory = useMutation(api.ai.clearChatHistory);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      await chatWithAI({
        message: userMessage,
        groupId: groupId || undefined,
        context,
      });
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory({ groupId: groupId || undefined });
      toast.success("Chat history cleared");
    } catch (error) {
      toast.error("Failed to clear history");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const messages = chatHistory?.messages || [];

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
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AI Writing Assistant</h2>
            <p className="text-gray-600">Get help with your journal writing</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
        {/* Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Hello! I'm your writing assistant
              </h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                I'm here to help you with your journal writing. Ask me for writing prompts, 
                help organizing your thoughts, or just chat about what's on your mind!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-orange-400 to-pink-400 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      msg.role === "user" ? "text-orange-100" : "text-gray-500"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask me anything about writing..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setMessage("I'm feeling stuck. Can you give me a writing prompt?")}
          className="p-4 bg-white/50 border border-orange-200 rounded-lg hover:bg-white/70 transition-colors text-left"
        >
          <div className="font-medium text-gray-800 mb-1">Need inspiration?</div>
          <div className="text-sm text-gray-600">Get a writing prompt to get started</div>
        </button>
        
        <button
          onClick={() => setMessage("Help me organize my thoughts about today.")}
          className="p-4 bg-white/50 border border-orange-200 rounded-lg hover:bg-white/70 transition-colors text-left"
        >
          <div className="font-medium text-gray-800 mb-1">Organize thoughts</div>
          <div className="text-sm text-gray-600">Get help structuring your entry</div>
        </button>
      </div>
    </div>
  );
}
