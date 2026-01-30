// lib/auth-service.ts
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const getSelf = async () => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const user = await db.user.upsert({
    where: { externalUserId: clerkUser.id },
    update: {},
    create: {
      externalUserId: clerkUser.id,
      username:
        clerkUser.username ??
        clerkUser.firstName ??
        `user_${clerkUser.id.slice(0, 6)}`,
      imageUrl: clerkUser.imageUrl ?? "",
      bio: "",
      stream: {
        create: {
          name: `${clerkUser.username ?? clerkUser.firstName ?? "User"}'s stream`,
          thumbnailUrl: null,
          ingressId: null,
          serverUrl: null,
          streamKey: null,
          isLive: false,
          isChatEnabled: true,
          isChatDelayed: false,
          isChatFollowersOnly: false,
        },
      },
    },
    include: {
      stream: true,
    },
  });

  return user;
};

export const getSelfByUsername = async (username: string) => {
  const self = await currentUser();
  if (!self) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { username },
    include: { stream: true },
  });

  if (!user) throw new Error("User not found");

  if (user.externalUserId !== self.id) {
    throw new Error("Unauthorized");
  }

  return user;
};