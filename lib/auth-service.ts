// lib/auth-service.ts

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const getSelf = async () => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  // ✅ Check DB first — avoids stale Clerk session cache after onboarding
  const user = await db.user.findUnique({
    where: { externalUserId: clerkUser.id },
    include: {
      stream: true,
      _count: { select: { followedBy: true } },
    },
  });

  if (!user || !user.username) {
    redirect("/onboarding");
  }

  // ✅ Keep imageUrl in sync with Clerk in case it changes
  if (user.imageUrl !== clerkUser.imageUrl) {
    return await db.user.update({
      where: { externalUserId: clerkUser.id },
      data: { imageUrl: clerkUser.imageUrl ?? "" },
      include: {
        stream: true,
        _count: { select: { followedBy: true } },
      },
    });
  }

  return user;
};

export const getSelfByUsername = async (username: string) => {
  const self = await getSelf();
  if (!self) return null;

  if (self.username !== username) {
    return null;
  }

  return self;
};