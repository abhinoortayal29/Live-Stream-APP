import React from "react";
import { notFound } from "next/navigation";

import { getUserByUsername } from "@/lib/user-service";
import { isFollowingUser } from "@/lib/follow-service";
import { isBlockedByUser } from "@/lib/block-service";
import { StreamPlayer } from "@/components/stream-player/index";
interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps) {
  const { username } = await params;
  return {
  title: `${username} Live Stream | StreamApp`,
  description: `Watch ${username}'s live stream and chat in real time.`,
};
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params;
  const user = await getUserByUsername(username);

  // sometimes it had deleted it account

  if (!user || !user.stream) notFound();

  
  const isFollowing = await isFollowingUser(user.id);
  const isBlocked = await isBlockedByUser(user.id);

  if (isBlocked) notFound();

  return (
    <StreamPlayer user={user} isFollowing={isFollowing} stream={user.stream} />
  );
}