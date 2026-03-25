"use client";

import React from "react";
import { LiveKitRoom, useMaybeRoomContext } from "@livekit/components-react";
import { useRouter } from "next/navigation";

import { useViewerToken } from "@/hooks/use-viewer-token";
import { useChatSidebar } from "@/store/use-chat-sidebar";
import { cn } from "@/lib/utils";

import { ChatToggle } from "./chat.toggle";
import { InfoCard } from "./info-card";
import { AboutCard } from "./about-card";
import { Video, VideoSkeleton } from "./video";
import { Chat, ChatSkeleton } from "./chat";
import { Header, HeaderSkeleton } from "./header";

type CustomStream = {
  id: string;
  isChatEnabled: boolean;
  isChatDelayed: boolean;
  isChatFollowersOnly: boolean;
  isLive: boolean;
  thumbnailUrl: string | null;
  name: string;
};

type CustomUser = {
  id: string;
  username: string;
  bio: string | null;
  stream: CustomStream | null;
  imageUrl: string;
  _count: {
    followedBy: number;
  };
};

/* ⭐ EXIT BUTTON */
function ExitStreamButton() {
  const room = useMaybeRoomContext();
  const router = useRouter();

  const handleExitStream = React.useCallback(async () => {
    try {
      window.dispatchEvent(new CustomEvent("exit-stream"));
    } catch {}

    /* stop local tracks */
    try {
      const local = (room as any)?.localParticipant;
      if (local?.tracks) {
        local.tracks.forEach((pub: any) => {
          const t = pub.track as any;
          t?.stop?.();
          t?.mediaStreamTrack?.stop?.();
        });
      }
    } catch {}

    /* disconnect */
    try {
      await room?.disconnect();
    } catch {}

    /* clear storage */
    try {
      Object.keys(localStorage || {}).forEach((k) => {
        const lk = String(k).toLowerCase();
        if (lk.includes("stream") || lk.includes("livekit") || lk.includes("lk")) {
          localStorage.removeItem(k);
        }
      });
    } catch {}

    router.push("/");
  }, [room, router]);

  return (
    <button
      onClick={handleExitStream}
      className="
      absolute top-4 right-4 z-[9999]
      bg-black/70 backdrop-blur
      hover:bg-red-600
      text-white text-sm
      px-4 py-2 rounded-full
      shadow-lg transition
      "
    >
      Exit Stream
    </button>
  );
}

export function StreamPlayer({
  user,
  stream,
  isFollowing,
}: {
  user: CustomUser;
  stream: CustomStream;
  isFollowing: boolean;
}) {
  const { identity, name, token } = useViewerToken(user.id);
  const { collapsed } = useChatSidebar((state) => state);

  if (!token || !identity || !name) {
    return <StreamPlayerSkeleton />;
  }

  return (
    <>
      {collapsed && (
        <div className="hidden lg:block fixed top-[100px] right-2 z-50">
          <ChatToggle />
        </div>
      )}

      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
        className={cn(
          "grid grid-cols-1 lg:gap-y-0 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 h-full",
          collapsed && "lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2"
        )}
      >
        {/* ⭐ VIDEO WITH EXIT BUTTON */}
        <div className="space-y-4 col-span-1 lg:col-span-2 xl:col-span-2 2xl:col-span-5 lg:overflow-y-auto hidden-scrollbar pb-10">
          <div className="relative">
            <Video hostName={user.username} hostIdentity={user.id} />
            <ExitStreamButton />
          </div>

          <Header
            imageUrl={user.imageUrl}
            hostName={user.username}
            hostIdentity={user.id}
            isFollowing={isFollowing}
            name={stream.name}
            viewerIdentity={identity}
          />

          <InfoCard
            hostIdentity={user.id}
            viewerIdentity={identity}
            name={stream.name}
            thumbnailUrl={stream.thumbnailUrl}
          />

          <AboutCard
            hostName={user.username}
            hostIdentity={user.id}
            viewerIdentity={identity}
            bio={user.bio}
            followedByCount={user._count.followedBy}
          />
        </div>

        <div className={cn("col-span-1", collapsed && "hidden")}>
          <Chat
            viewerName={name}
            hostName={user.username}
            hostIdentity={user.id}
            isFollowing={isFollowing}
            isChatEnabled={stream.isChatEnabled}
            isChatDelayed={stream.isChatDelayed}
            isChatFollowersOnly={stream.isChatFollowersOnly}
          />
        </div>
      </LiveKitRoom>
    </>
  );
}

export function StreamPlayerSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:gap-y-0 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 h-full">
      <div className="space-y-4 col-span-1 lg:col-span-2 xl:col-span-2 2xl:col-span-5 lg:overflow-y-auto hidden-scrollbar pb-10">
        <VideoSkeleton />
        <HeaderSkeleton />
      </div>
      <div className="col-span-1 bg-background">
        <ChatSkeleton />
      </div>
    </div>
  );
}