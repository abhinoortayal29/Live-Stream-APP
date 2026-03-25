// app/u/[username]/page.tsx

import React from "react";
import { getSelfByUsername } from "@/lib/auth-service";
import { StreamPlayer } from "@/components/stream-player";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await getSelfByUsername(username);
  if(!user) return null;

  if (!user.stream) {
    throw new Error("Stream not found");
  }

  return (
    <div className="h-full">
      <StreamPlayer
        user={user}
        stream={user.stream}
        isFollowing={true}
      />
    </div>
  );
}