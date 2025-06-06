import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all groups for the current user
export const getUserGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const groups = await ctx.db
      .query("groups")
      .collect();

    const userGroups = groups.filter(group => group.members.includes(userId));

    return Promise.all(
      userGroups.map(async (group) => {
        const currentTurnUser = await ctx.db.get(group.turnOrder[group.currentTurnIndex]);
        const isMyTurn = group.turnOrder[group.currentTurnIndex] === userId;
        
        // Get member details
        const members = await Promise.all(
          group.members.map(async (memberId) => {
            const member = await ctx.db.get(memberId);
            return member ? { _id: member._id, name: member.name, email: member.email } : null;
          })
        );

        // Get latest entry
        const latestEntry = await ctx.db
          .query("entries")
          .withIndex("by_group_and_date", (q) => q.eq("groupId", group._id))
          .order("desc")
          .first();

        return {
          ...group,
          currentTurnUser: currentTurnUser ? { _id: currentTurnUser._id, name: currentTurnUser.name } : null,
          isMyTurn,
          members: members.filter(Boolean),
          latestEntry,
        };
      })
    );
  },
});

// Create a new group
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      members: [userId],
      turnOrder: [userId],
      currentTurnIndex: 0,
      isActive: true,
    });

    return groupId;
  },
});

// Generate invitation code
export const generateInviteCode = mutation({
  args: {
    groupId: v.id("groups"),
    invitedEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group || group.createdBy !== userId) {
      throw new Error("Not authorized to invite to this group");
    }

    const inviteCode = Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("invitations", {
      groupId: args.groupId,
      invitedBy: userId,
      invitedEmail: args.invitedEmail,
      inviteCode,
      status: "pending",
      expiresAt,
    });

    return { inviteCode };
  },
});

// Join group with invite code
export const joinGroupWithCode = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!invitation || invitation.status !== "pending" || invitation.expiresAt < Date.now()) {
      throw new Error("Invalid or expired invitation code");
    }

    const group = await ctx.db.get(invitation.groupId);
    if (!group) throw new Error("Group not found");

    if (group.members.includes(userId)) {
      throw new Error("Already a member of this group");
    }

    // Add user to group
    await ctx.db.patch(invitation.groupId, {
      members: [...group.members, userId],
      turnOrder: [...group.turnOrder, userId],
    });

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
    });

    // Create notification for existing members
    for (const memberId of group.members) {
      const user = await ctx.db.get(userId);
      await ctx.db.insert("notifications", {
        userId: memberId,
        type: "new_member",
        title: "New Member Joined",
        message: `${user?.name || "Someone"} joined ${group.name}`,
        groupId: group._id,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Pass turn to next person
export const passTurn = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    if (group.turnOrder[group.currentTurnIndex] !== userId) {
      throw new Error("Not your turn");
    }

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
      message: `${currentUser?.name || "Someone"} passed the journal to you in ${group.name}`,
      groupId: group._id,
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
