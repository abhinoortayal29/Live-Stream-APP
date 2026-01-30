"use client";

import React, { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { onFollow, onUnfollow } from "@/actions/follow";
import { onBlock, onUnblock } from "@/actions/block";

export function Actions({
  isFollowing,
  userId,
}: {
  isFollowing: boolean;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleFollow = () => {
    startTransition(() => {
      onFollow(userId)
        .then((data) => {
          if (!data) {
            toast.error("You must be logged in");
            return;
          }

          toast.success(
            `You are now following ${data.following.username}`
          );
        })
        .catch(() =>
          toast.error("Something went wrong, failed to follow")
        );
    });
  };

  const handleUnfollow = () => {
    startTransition(() => {
      onUnfollow(userId)
        .then((data) => {
          if (!data) {
            toast.error("You must be logged in");
            return;
          }

          toast.success(
            `You have unfollowed ${data.following.username}`
          );
        })
        .catch(() =>
          toast.error("Something went wrong, failed to unfollow")
        );
    });
  };

  const handleBlock = () => {
    startTransition(() => {
      onBlock(userId)
        .then((data) => {
          if (!data) {
            toast.success("Blocked guest");
            return;
          }

          toast.success(
            `You have blocked ${data.blocked.username}`
          );
        })
        .catch(() =>
          toast.error("Something went wrong, failed to block")
        );
    });
  };

  const handleUnblock = () => {
    startTransition(() => {
      onUnblock(userId)
        .then((data) => {
          if (!data) {
            toast.error("You must be logged in");
            return;
          }

          toast.success(
            `You have unblocked ${data.blocked.username}`
          );
        })
        .catch(() =>
          toast.error("Something went wrong, failed to unblock")
        );
    });
  };

  return (
    <>
      <Button
        variant="primary"
        disabled={isPending}
        onClick={isFollowing ? handleUnfollow : handleFollow}
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </Button>

      <Button onClick={handleBlock} disabled={isPending}>
        Block
      </Button>

      <Button onClick={handleUnblock} disabled={isPending}>
        UnBlock
      </Button>
    </>
  );
}
