import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";

// List of users you follow + their streams 
export const getFollwedUser = async () => {
  try {
    const self = await getSelf();
    
    if (!self) {
      return [];
    }

    const followedUsers = await db.follow.findMany({
      where: {
        followerId: self.id,
        following: {
          blocking: {
            none: {
              blockedId: self.id,
            },
          },
        },
      },
      include: {
        following: {
          include: {
            stream: true,
          },
        },
      },
    });

    return followedUsers;
  } catch (error) {
    return [];
  }
};
// is i follow this given streamer 
export const isFollowingUser = async (id: string) => {
  try {
    const self = await getSelf();
    
    if (!self) {
      return false;
    }

    const otherUser = await db.user.findUnique({
      where: { id },
    });

    if (!otherUser) throw new Error("User not found");
    // for hiding button follow
    if (otherUser.id === self.id) return true;

    const existingFollow = await db.follow.findFirst({
      where: {
        followerId: self.id,
        followingId: otherUser.id,
      },
    });

    return !!existingFollow;
  } catch {
    return false;
  }
};
// follow ad ufoolow and luniquness for prevent race cosniont

export const followUser = async (id: string) => {
  const self = await getSelf();
  
  if (!self) {
    throw new Error("Unauthorized");
  }

  const otherUser = await db.user.findUnique({
    where: { id },
  });

  if (!otherUser) throw new Error("User not found");

  if (otherUser.id === self.id) throw new Error("You can't follow yourself");

  const existingFollow = await db.follow.findFirst({
    where: {
      followerId: self.id,
      followingId: otherUser.id,
    },
  });

  if (existingFollow) throw new Error("You are already following this user");

  const follow = await db.follow.create({
    data: {
      followerId: self.id,
      followingId: otherUser.id,
    },
    include: {
      follower: true,
      following: true,
    },
  });

  return follow;
};

export const unfollowUser = async (id: string) => {
  const self = await getSelf();
  
  if (!self) {
    throw new Error("Unauthorized");
  }

  const otherUser = await db.user.findUnique({
    where: { id },
  });

  if (!otherUser) throw new Error("User not found");

  if (otherUser.id === self.id) throw new Error("You can't unfollow yourself");

  const existingFollow = await db.follow.findFirst({
    where: {
      followerId: self.id,
      followingId: otherUser.id,
    },
  });

  if (!existingFollow) throw new Error("You are not following this user");

  const follow = await db.follow.delete({
    where: {
      id: existingFollow.id,
    },
    include: {
      following: true,
    },
  });

  return follow;
};