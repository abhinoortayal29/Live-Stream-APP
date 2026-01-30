import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";

export const getStreams = async () => {
  let userId = null;

  try {
    const self = await getSelf();
    if (self) {
      userId = self.id;
    }
  } catch {
    userId = null;
  }

  let streams = [];

  if (userId) {
    streams = await db.stream.findMany({
      where: {
        user: {
          NOT: {
            blocking: {
              some: {
                blockedId: userId,
              },
            },
          },
        },
      },
      select: {
        thumbnailUrl: true,
        name: true,
        isLive: true,
        user: true,
        id: true,
      },
      orderBy: [{ isLive: "desc" }, { updatedAt: "desc" }],
    });
  } else {
    streams = await db.stream.findMany({
      select: {
        thumbnailUrl: true,
        name: true,
        isLive: true,
        user: true,
        id: true,
      },
      orderBy: [{ isLive: "desc" }, { updatedAt: "desc" }],
    });
  }

  return streams;
};