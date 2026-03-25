// lib/auth-service.ts

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

/**
 * Core authentication.
 * - Must be logged in
 * - Must have username (onboarding complete)
 * - Ensures DB user exists
 * - Ensures stream exists
 */
export const getSelf = async () => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  if (!clerkUser.username) {
    redirect("/onboarding");
  }

  const user = await db.user.upsert({
    where: { externalUserId: clerkUser.id },

    update: {
      username: clerkUser.username,
      imageUrl: clerkUser.imageUrl ?? "",
    },

    create: {
      externalUserId: clerkUser.id,
      username: clerkUser.username!,
      imageUrl: clerkUser.imageUrl ?? "",
      bio: "",
      stream: {
        create: {
          name: `${clerkUser.username}'s stream`,
          isLive: false,
          isChatEnabled: true,
          isChatDelayed: false,
          isChatFollowersOnly: false,
        },
      },
    },

    include: {
      stream: true,
      _count: { select: { followedBy: true } },
    },
  });

  return user;
};

/**
 * Used for username-based private dashboard routes.
 * Auth is based on Clerk ID.
 */
export const getSelfByUsername = async (username: string) => {
  const self = await getSelf(); // reuse core auth
   if (!self) return null;


  if (self.username !== username) {
   return null;
  }

  return self;
};