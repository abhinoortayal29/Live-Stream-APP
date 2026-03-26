"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import {
  useChat,
  useConnectionState,
  useRemoteParticipant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

import { ChatVariant, useChatSidebar } from "@/store/use-chat-sidebar";

import { ChatHeader, ChatHeaderSkeleton } from "./chat-header";
import { ChatForm, ChatFormSkeleton } from "./chat-form";
import { ChatList, ChatListSkeleton } from "./chat-list";
import { ChatCommunity } from "./chat-community";

interface DbMessage {
  id: string;
  text: string;
  userName: string;
  streamId: string;
  createdAt: string;
}

export interface UnifiedMessage {
  id: string;
  message: string;
  senderName: string;
  timestamp: number;
  source: "db" | "livekit";
}

export function Chat({
  hostName,
  hostIdentity,
  viewerName,
  isFollowing,
  isChatEnabled,
  isChatDelayed,
  isChatFollowersOnly,
}: {
  hostName: string;
  hostIdentity: string;
  viewerName: string;
  isFollowing: boolean;
  isChatEnabled: boolean;
  isChatDelayed: boolean;
  isChatFollowersOnly: boolean;
}) {
  const matches = useMediaQuery("(max-width: 1024px)");
  const { variant, onExpand } = useChatSidebar((state) => state);
  const connectionState = useConnectionState();
  const participant = useRemoteParticipant(hostIdentity);

  const isOnline = participant && connectionState === ConnectionState.Connected;
  const isHidden = !isChatEnabled || !isOnline;

  const [value, setValue] = useState("");
  const [dbMessages, setDbMessages] = useState<DbMessage[]>([]);

  const { chatMessages: liveMessages, send } = useChat();

  useEffect(() => {
    if (matches) {
      onExpand();
    }
  }, [matches, onExpand]);

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`/api/chat?hostIdentity=${hostIdentity}`);
      const data = await res.json();
      setDbMessages(Array.isArray(data) ? data : []);
    };
    fetchMessages();
  }, [hostIdentity]);

  const reversedMessages = useMemo((): UnifiedMessage[] => {
    const normalizedDb: UnifiedMessage[] = dbMessages.map((m) => ({
      id: `db-${m.id}`,
      message: m.text,
      senderName: m.userName,
      timestamp: new Date(m.createdAt).getTime(),
      source: "db",
    }));

    const normalizedLive: UnifiedMessage[] = liveMessages.map((m) => ({
      id: `lk-${m.id}`,
      message: m.message,
      // ✅ FIX: m.from?.name is the username set in createViewerToken
      // m.from?.identity is the raw user ID — never use that for display
      senderName: m.from?.name ?? m.from?.identity ?? viewerName,
      timestamp: m.timestamp,
      source: "livekit",
    }));

    const deduped: UnifiedMessage[] = [...normalizedLive];
    for (const dbMsg of normalizedDb) {
      const isDuplicate = normalizedLive.some(
        (lkMsg) =>
          lkMsg.senderName === dbMsg.senderName &&
          lkMsg.message === dbMsg.message &&
          Math.abs(lkMsg.timestamp - dbMsg.timestamp) < 5000
      );
      if (!isDuplicate) {
        deduped.push(dbMsg);
      }
    }

    return deduped.sort((a, b) => b.timestamp - a.timestamp);
  }, [dbMessages, liveMessages, viewerName]);

  const onSubmit = async () => {
    if (!send || !value.trim()) return;

    const messageToSend = value.trim();
    setValue("");

    send(messageToSend);

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageToSend,
        userName: viewerName,
        streamId: hostIdentity,
      }),
    });
  };

  const onChange = (value: string) => {
    setValue(value);
  };

  return (
    <div className="flex flex-col bg-background border-l border-b pt-0 h-[calc(100vh-80px)]">
      <ChatHeader />
      {variant === ChatVariant.CHAT && (
        <>
          <ChatList messages={reversedMessages} isHidden={isHidden} />
          <ChatForm
            onSubmit={onSubmit}
            value={value}
            onChange={onChange}
            isHidden={isHidden}
            isFollowersOnly={isChatFollowersOnly}
            isDelayed={isChatDelayed}
            isFollowing={isFollowing}
          />
        </>
      )}
      {variant === ChatVariant.COMMUNITY && (
        <ChatCommunity
          hostName={hostName}
          viewerName={viewerName}
          isHidden={isHidden}
        />
      )}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col border-l border-b pt-0 h-[calc(100vh-80px)] border-2">
      <ChatHeaderSkeleton />
      <ChatListSkeleton />
      <ChatFormSkeleton />
    </div>
  );
}