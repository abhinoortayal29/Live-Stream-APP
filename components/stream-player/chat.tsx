
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbMessage {
  id: string;
  text: string;
  userName: string;
  streamId: string;
  createdAt: string;
}

// NEW: shape returned by the cursor-paginated API
interface ChatApiResponse {
  messages: DbMessage[];
  nextCursor: string | null; // ISO timestamp of oldest message, or null if no more
}

export interface UnifiedMessage {
  id: string;
  message: string;
  senderName: string;
  timestamp: number;
  source: "db" | "livekit";
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  // ── CURSOR PAGINATION STATE (replaces `page`) ──────────────────────────────
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  // ──────────────────────────────────────────────────────────────────────────

  const { chatMessages: liveMessages, send } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matches) onExpand();
  }, [matches, onExpand]);

  // ── fetchMessages: cursor-based ──────────────────────────────────────────
  // `cursor` = ISO timestamp to fetch messages OLDER than this point.
  // Pass `null` for the first/fresh fetch (no cursor = get latest messages).
  const fetchMessages = useCallback(
    async (cursor: string | null) => {
      if (!isOnline || isFetching || !hasMore) return;

      setIsFetching(true);

      try {
        // Build URL — omit cursor param entirely on first fetch
        const url = cursor
          ? `/api/chat?hostIdentity=${hostIdentity}&cursor=${encodeURIComponent(cursor)}&limit=50`
          : `/api/chat?hostIdentity=${hostIdentity}&limit=50`;

        const res = await fetch(url);

        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType?.includes("application/json")) {
          console.error("FETCH_MESSAGES: non-JSON response", res.status, await res.text());
          setHasMore(false);
          return;
        }

        const data: ChatApiResponse = await res.json();

        if (!Array.isArray(data.messages) || data.messages.length === 0) {
          setHasMore(false);
          setNextCursor(null);
          return;
        }

        // Preserve scroll position before appending older messages
        const el = scrollRef.current;
        const prevScrollHeight = el?.scrollHeight ?? 0;
        const prevScrollTop = el?.scrollTop ?? 0;

        setDbMessages((prev) =>
          // null cursor = fresh load, replace all; otherwise append older messages
          cursor === null ? data.messages : [...prev, ...data.messages]
        );

        // Restore scroll position after DOM updates (only when loading more)
        if (cursor !== null && el) {
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight;
            el.scrollTop = prevScrollTop - (newScrollHeight - prevScrollHeight);
          });
        }

        // Update cursor state for next load
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      } catch (err) {
        console.error("FETCH_MESSAGES_ERROR", err);
      } finally {
        setIsFetching(false);
      }
    },
    [hostIdentity, isOnline, isFetching, hasMore]
  );

  // Initial fetch when stream comes online — reset all cursor state
  useEffect(() => {
    if (!isOnline) return;

    setDbMessages([]);
    setNextCursor(null);
    setHasMore(true);
    fetchMessages(null); // null = first page, no cursor

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, hostIdentity]);

  // loadMore: pass the current nextCursor to fetch the next older page
  const loadMore = useCallback(() => {
    if (isFetching || !hasMore || nextCursor === null) return;
    fetchMessages(nextCursor);
  }, [isFetching, hasMore, nextCursor, fetchMessages]);

  // ── Message normalization + deduplication (unchanged) ─────────────────────
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

    return deduped.sort((a, b) => b.timestamp - a.timestamp);
  }, [dbMessages, liveMessages, viewerName]);

  // ── Submit (unchanged) ────────────────────────────────────────────────────
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

  // ── Render (unchanged) ────────────────────────────────────────────────────
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