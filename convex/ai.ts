import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Get AI chat history for user
export const getChatHistory = query({
  args: {
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("aiChats")
      .withIndex("by_user_and_group", (q) => 
        q.eq("userId", userId).eq("groupId", args.groupId)
      )
      .first();
  },
});

// Chat with AI assistant
export const chatWithAI = action({
  args: {
    message: v.string(),
    groupId: v.optional(v.id("groups")),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ message: string; timestamp: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get existing chat or create new one
    const chatSession = await ctx.runQuery(api.ai.getChatHistory, {
      groupId: args.groupId,
    });

    const userMessage = {
      role: "user" as const,
      content: args.message,
      timestamp: Date.now(),
    };

    const messages = chatSession?.messages || [];
    messages.push(userMessage);

    // Prepare context for AI
    let systemPrompt = `You are a friendly and empathetic AI assistant helping users with their journal writing in a Japanese-style exchange diary app called DayShare. Your role is to:

1. Encourage thoughtful reflection and writing
2. Ask gentle, open-ended questions to help users explore their thoughts and feelings
3. Provide writing prompts when users feel stuck
4. Show empathy and understanding
5. Keep responses warm, supportive, and conversational
6. Help users overcome writer's block or anxiety about writing

Be encouraging, never judgmental, and help create a safe space for personal expression. Keep responses concise but meaningful.`;

    if (args.context) {
      systemPrompt += `\n\nContext about the user's current writing: ${args.context}`;
    }

    try {
      // Use the bundled OpenAI API
      const response: Response = await fetch(`${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-10), // Keep last 10 messages for context
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const aiResponse: string = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      const assistantMessage = {
        role: "assistant" as const,
        content: aiResponse,
        timestamp: Date.now(),
      };

      messages.push(assistantMessage);

      // Save updated chat session
      await ctx.runMutation(internal.ai.saveChatSession, {
        userId,
        groupId: args.groupId,
        messages,
        context: args.context,
      });

      return {
        message: aiResponse,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("AI chat error:", error);
      
      // Fallback responses
      const fallbackResponses = [
        "I'm here to listen. What's on your mind today?",
        "Sometimes the best entries come from the simplest moments. What made you smile recently?",
        "Writing can be a wonderful way to process your thoughts. What's been occupying your mind lately?",
        "Every day has its own story. What would you like to remember about today?",
        "I'd love to hear about something that caught your attention today, no matter how small.",
      ];
      
      const fallbackMessage = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      const assistantMessage = {
        role: "assistant" as const,
        content: fallbackMessage,
        timestamp: Date.now(),
      };

      messages.push(assistantMessage);

      await ctx.runMutation(internal.ai.saveChatSession, {
        userId,
        groupId: args.groupId,
        messages,
        context: args.context,
      });

      return {
        message: fallbackMessage,
        timestamp: Date.now(),
      };
    }
  },
});

// Internal mutation to save chat session
export const saveChatSession = internalMutation({
  args: {
    userId: v.id("users"),
    groupId: v.optional(v.id("groups")),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingChat = await ctx.db
      .query("aiChats")
      .withIndex("by_user_and_group", (q) => 
        q.eq("userId", args.userId).eq("groupId", args.groupId)
      )
      .first();

    if (existingChat) {
      await ctx.db.patch(existingChat._id, {
        messages: args.messages,
        context: args.context,
      });
    } else {
      await ctx.db.insert("aiChats", {
        userId: args.userId,
        groupId: args.groupId,
        messages: args.messages,
        context: args.context,
      });
    }
  },
});

// Clear chat history
export const clearChatHistory = mutation({
  args: {
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const chatSession = await ctx.db
      .query("aiChats")
      .withIndex("by_user_and_group", (q) => 
        q.eq("userId", userId).eq("groupId", args.groupId)
      )
      .first();

    if (chatSession) {
      await ctx.db.delete(chatSession._id);
    }
  },
});
