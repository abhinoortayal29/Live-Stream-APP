import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getUserByUsername } from "@/lib/user-service";
import { StreamPlayer } from "@/components/stream-player";
import { db } from "@/lib/db";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const externalUser = await currentUser();
  
  if (!externalUser) {
    redirect("/");
  }

  let user = await getUserByUsername(username);

  // Check if user exists
  if (!user) {
    throw new Error("User not found");
  }

  // Check if this is the user's own page
  if (user.externalUserId !== externalUser.id) {
    throw new Error("Unauthorized");
  }

  // Create stream if it doesn't exist
  if (!user.stream) {
    await db.stream.create({
      data: {
        userId: user.id,
        name: `${user.username}'s stream`,
        thumbnailUrl: null,
        ingressId: null,
        serverUrl: null,
        streamKey: null,
        isLive: false,
        isChatEnabled: true,
        isChatDelayed: false,
        isChatFollowersOnly: false,
      },
    });

    // Refetch user with stream
    user = await getUserByUsername(username);
    if (!user) {
      throw new Error("User not found");
    }
  }

  // At this point, user.stream should exist
  if (!user.stream) {
    throw new Error("Failed to create stream");
  }

  return (
    <div className="h-full">
      <StreamPlayer user={user} stream={user.stream} isFollowing={true} />
    </div>
  );
}