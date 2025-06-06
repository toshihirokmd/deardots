import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get entries for a group
export const getGroupEntries = query({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const group = await ctx.db.get(args.groupId);
    if (!group || !group.members.includes(userId)) {
      throw new Error("Not authorized to view this group");
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(args.limit || 50);

    return Promise.all(
      entries.map(async (entry) => {
        const author = await ctx.db.get(entry.authorId);
        const photoUrls = entry.photos
          ? await Promise.all(
              entry.photos.map(async (photoId) => {
                const url = await ctx.storage.getUrl(photoId);
                return { id: photoId, url };
              })
            )
          : [];

        return {
          ...entry,
          author: author ? { _id: author._id, name: author.name } : null,
          photos: photoUrls,
        };
      })
    );
  },
});

// Get entries for calendar view
export const getEntriesForCalendar = query({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const group = await ctx.db.get(args.groupId);
    if (!group || !group.members.includes(userId)) {
      throw new Error("Not authorized to view this group");
    }

    const startOfMonth = new Date(args.year, args.month - 1, 1).getTime();
    const endOfMonth = new Date(args.year, args.month, 0, 23, 59, 59).getTime();

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .filter((q) => 
        q.and(
          q.gte(q.field("entryDate"), startOfMonth),
          q.lte(q.field("entryDate"), endOfMonth)
        )
      )
      .collect();

    return Promise.all(
      entries.map(async (entry) => {
        const author = await ctx.db.get(entry.authorId);
        return {
          ...entry,
          author: author ? { _id: author._id, name: author.name } : null,
        };
      })
    );
  },
});

// Create a new entry
export const createEntry = mutation({
  args: {
    groupId: v.id("groups"),
    title: v.optional(v.string()),
    content: v.string(),
    photos: v.optional(v.array(v.id("_storage"))),
    isQuickReflection: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group || !group.members.includes(userId)) {
      throw new Error("Not authorized to write in this group");
    }

    if (group.turnOrder[group.currentTurnIndex] !== userId) {
      throw new Error("Not your turn to write");
    }

    const entryId = await ctx.db.insert("entries", {
      groupId: args.groupId,
      authorId: userId,
      title: args.title,
      content: args.content,
      photos: args.photos,
      entryDate: Date.now(),
      turnIndex: group.currentTurnIndex,
      isQuickReflection: args.isQuickReflection,
      tags: args.tags,
    });

    // Move to next turn
    const nextTurnIndex = (group.currentTurnIndex + 1) % group.turnOrder.length;
    const nextUserId = group.turnOrder[nextTurnIndex];

    await ctx.db.patch(args.groupId, {
      currentTurnIndex: nextTurnIndex,
    });

    // Create notification for next user
    const currentUser = await ctx.db.get(userId);
    await ctx.db.insert("notifications", {
      userId: nextUserId,
      type: "your_turn",
      title: "Your Turn to Write",
      message: `${currentUser?.name || "Someone"} wrote in ${group.name} and passed it to you`,
      groupId: group._id,
      isRead: false,
      createdAt: Date.now(),
    });

    // Notify other members about the new entry
    for (const memberId of group.members) {
      if (memberId !== userId && memberId !== nextUserId) {
        await ctx.db.insert("notifications", {
          userId: memberId,
          type: "journal_passed",
          title: "New Entry Added",
          message: `${currentUser?.name || "Someone"} wrote in ${group.name}`,
          groupId: group._id,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return entryId;
  },
});

// Save draft
export const saveDraft = mutation({
  args: {
    groupId: v.id("groups"),
    title: v.optional(v.string()),
    content: v.string(),
    photos: v.optional(v.array(v.id("_storage"))),
    isQuickReflection: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group || !group.members.includes(userId)) {
      throw new Error("Not authorized to save draft in this group");
    }

    // Check if draft already exists
    const existingDraft = await ctx.db
      .query("drafts")
      .withIndex("by_group_and_author", (q) => 
        q.eq("groupId", args.groupId).eq("authorId", userId)
      )
      .first();

    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        title: args.title,
        content: args.content,
        photos: args.photos,
        isQuickReflection: args.isQuickReflection,
      });
      return existingDraft._id;
    } else {
      return await ctx.db.insert("drafts", {
        groupId: args.groupId,
        authorId: userId,
        title: args.title,
        content: args.content,
        photos: args.photos,
        isQuickReflection: args.isQuickReflection,
      });
    }
  },
});

// Get user's draft for a group
export const getDraft = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("drafts")
      .withIndex("by_group_and_author", (q) => 
        q.eq("groupId", args.groupId).eq("authorId", userId)
      )
      .first();
  },
});

// Generate upload URL for photos
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});
