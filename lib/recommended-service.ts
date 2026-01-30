import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";

export const getRecommended = async () => {
  const self = await getSelf();

  // 🔓 Logged-out users
  if (!self) {
    return db.user.findMany({
      include: {
        stream: {
          select: {
            isLive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // 🔐 Logged-in users
  return db.user.findMany({
    where: {
      AND: [
        {
          NOT: {
            id: self.id,
          },
        },
        {
          NOT: {
            followedBy: {
              some: {
                followerId: self.id,
              },
            },
          },
        },
        {
          NOT: {
            blocking: {
              some: {
                blockedId: self.id,
              },
            },
          },
        },
      ],
    },
    include: {
      stream: {
        select: {
          isLive: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};
