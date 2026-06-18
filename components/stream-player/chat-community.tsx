"use client";

import React, { useTransition } from "react";
import { toast } from "sonner";
import { MinusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useParticipants } from "@livekit/components-react";

import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { onBlock } from "@/actions/block";
import { cn, stringToColor } from "@/lib/utils";

// ─── CommunityItem ───────────────────────────────────────────────────────────

export function CommunityItem({
  hostName,
  viewerName,
  participantName,
  participantIdentity,
}: {
  hostName: string;
  viewerName: string;
  participantName?: string;
  participantIdentity: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const color = stringToColor(participantName || "");
  const isSelf = participantName === viewerName;
  const isHost = viewerName === hostName;

  const handleBlock = () => {
    if (!participantName || isSelf || !isHost) return;

    const userId = participantIdentity.startsWith("host-")
      ? participantIdentity.replace("host-", "")
      : participantIdentity;

    startTransition(() => {
      onBlock(userId)
        .then(() => {
          toast.success(`Blocked ${participantName}`);
          router.refresh();
        })
        .catch(() =>
          toast.error(`Failed to block ${participantName}, Something went wrong`)
        );
    });
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between w-full p-2 rounded-md text-sm hover:bg-white/5",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <p style={{ color: color }}>{participantName}</p>
      {isHost && !isSelf && (
        <Hint label="Block" asChild>
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={handleBlock}
            className="h-auto w-auto p-1 opacity-0 group-hover:opacity-100 transition"
          >
            <MinusCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </Hint>
      )}
    </div>
  );
}

// ─── ChatCommunity ────────────────────────────────────────────────────────────

export function ChatCommunity({
  hostName,
  viewerName,
  isHidden,
}: {
  hostName: string;
  viewerName: string;
  isHidden: boolean;
}) {
  const participants = useParticipants();

  if (isHidden) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Community is disabled</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-y-4 flex-1 overflow-y-auto">
      <p className="text-center text-sm text-muted-foreground">
        {participants.length} watching
      </p>
      <div className="flex flex-col gap-y-2">
        {participants.map((participant) => (
          <CommunityItem
            key={participant.identity}
            hostName={hostName}
            viewerName={viewerName}
            participantName={participant.name}
            participantIdentity={participant.identity}
          />
        ))}
      </div>
    </div>
  );
}