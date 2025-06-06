import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Groups (Exchange Diary Groups)
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    members: v.array(v.id("users")),
    turnOrder: v.array(v.id("users")),
    currentTurnIndex: v.number(),
    isActive: v.boolean(),
  })
    .index("by_creator", ["createdBy"]),

  // Journal Entries
  entries: defineTable({
    groupId: v.id("groups"),
    authorId: v.id("users"),
    title: v.optional(v.string()),
    content: v.string(),
    photos: v.optional(v.array(v.id("_storage"))),
    entryDate: v.number(),
    turnIndex: v.number(),
    isQuickReflection: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_group", ["groupId"])
    .index("by_author", ["authorId"])
    .index("by_group_and_date", ["groupId", "entryDate"])
    .index("by_group_and_turn", ["groupId", "turnIndex"]),

  // Drafts
  drafts: defineTable({
    groupId: v.id("groups"),
    authorId: v.id("users"),
    title: v.optional(v.string()),
    content: v.string(),
    photos: v.optional(v.array(v.id("_storage"))),
    isQuickReflection: v.optional(v.boolean()),
  })
    .index("by_group_and_author", ["groupId", "authorId"]),

  // Group Invitations
  invitations: defineTable({
    groupId: v.id("groups"),
    invitedBy: v.id("users"),
    invitedEmail: v.string(),
    inviteCode: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    expiresAt: v.number(),
  })
    .index("by_code", ["inviteCode"])
    .index("by_email", ["invitedEmail"])
    .index("by_group", ["groupId"]),

  // AI Chat Sessions
  aiChats: defineTable({
    userId: v.id("users"),
    groupId: v.optional(v.id("groups")),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })),
    context: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_group", ["userId", "groupId"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("your_turn"),
      v.literal("journal_passed"),
      v.literal("new_member"),
      v.literal("invitation_received")
    ),
    title: v.string(),
    message: v.string(),
    groupId: v.optional(v.id("groups")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
