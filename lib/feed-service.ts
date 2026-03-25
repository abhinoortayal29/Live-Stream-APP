import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";

//get stream like des live then other if blocked chekc also if wihtout log in show all 

export const getStreams = async () => {
  let userId = null;

  try {
    const self = await getSelf();
    if (self) {
      //database id 
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
    // for user without log in 
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