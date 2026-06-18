"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { chatMessages: liveMessages, send } = useChat();

  // Ref to the scroll container — passed down to ChatList
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matches) onExpand();
  }, [matches, onExpand]);

 // In fetchMessages inside chat.tsx
const fetchMessages = useCallback(
  async (pageNum: number) => {
    if (!isOnline || isFetching || !hasMore) return;

    setIsFetching(true);

    try {
      const res = await fetch(
        `/api/chat?hostIdentity=${hostIdentity}&page=${pageNum}&limit=50`
      );

      // ✅ Check content-type before parsing
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType?.includes("application/json")) {
        console.error("FETCH_MESSAGES: non-JSON response", res.status, await res.text());
        setHasMore(false);
        return;
      }

      const data: DbMessage[] = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setHasMore(false);
        return;
      }

      if (data.length < 50) setHasMore(false);

      const el = scrollRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;
      const prevScrollTop = el?.scrollTop ?? 0;

      setDbMessages((prev) =>
        pageNum === 1 ? data : [...prev, ...data]
      );

      if (pageNum > 1 && el) {
        requestAnimationFrame(() => {
          const newScrollHeight = el.scrollHeight;
          el.scrollTop = prevScrollTop - (newScrollHeight - prevScrollHeight);
        });
      }
    } catch (err) {
      console.error("FETCH_MESSAGES_ERROR", err);
    } finally {
      setIsFetching(false);
    }
  },
  [hostIdentity, isOnline, isFetching, hasMore]
);

  // Initial fetch when stream comes online
  useEffect(() => {
    if (!isOnline) return;
    setPage(1);
    setHasMore(true);
    setDbMessages([]);
    fetchMessages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, hostIdentity]);

  const loadMore = useCallback(() => {
    if (isFetching || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage);
  }, [isFetching, hasMore, page, fetchMessages]);

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
      senderName: m.from?.name ?? m.from?.identity ?? viewerName,
      timestamp: m.timestamp,
      source: "livekit",
    }));

    // Deduplicate: LiveKit is source of truth for recent messages
    const deduped: UnifiedMessage[] = [...normalizedLive];
    for (const dbMsg of normalizedDb) {
      const isDuplicate = normalizedLive.some(
        (lkMsg) =>
          lkMsg.senderName === dbMsg.senderName &&
          lkMsg.message === dbMsg.message &&
          Math.abs(lkMsg.timestamp - dbMsg.timestamp) < 5000
      );
      if (!isDuplicate) deduped.push(dbMsg);
    }

    // Newest first (flex-col-reverse will flip this visually to newest at bottom)
    return deduped.sort((a, b) => b.timestamp - a.timestamp);
  }, [dbMessages, liveMessages, viewerName]);

  const onSubmit = async () => {
    if (!send || !value.trim()) return;

    const messageToSend = value.trim();
    if (messageToSend.length === 0) return;
    if (messageToSend.length > 200) {
      alert("Message must be under 200 characters");
      return;
    }

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

  const onChange = (value: string) => setValue(value);

  return (
    <div className="flex flex-col bg-background border-l border-b pt-0 h-[calc(100vh-80px)]">
      <ChatHeader />
      {variant === ChatVariant.CHAT && (
        <>
          <ChatList
            messages={reversedMessages}
            isHidden={isHidden}
            onLoadMore={loadMore}
            isFetching={isFetching}
            hasMore={hasMore}
            scrollRef={scrollRef}
          />
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