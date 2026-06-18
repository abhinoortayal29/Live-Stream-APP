"use client";

import React, { useEffect, useRef, RefObject } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { UnifiedMessage } from "./chat";

interface ChatListProps {
  messages: UnifiedMessage[];
  isHidden: boolean;
  onLoadMore: () => void;
  isFetching: boolean;
  hasMore: boolean;
   scrollRef: RefObject<HTMLDivElement | null>; 
}

export function ChatList({
  isHidden,
  messages,
  onLoadMore,
  isFetching,
  hasMore,
  scrollRef,
}: ChatListProps) {
  const prevMessageCountRef = useRef(messages.length);
  const isUserScrolledUpRef = useRef(false);

  // Track whether the user has scrolled up (away from latest messages)
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    // In flex-col-reverse: scrollTop=0 means AT the bottom (latest messages).
    // Scrolling UP means scrollTop becomes more negative (or in some browsers, scrollTop
    // can be positive when the overflow goes upward — normalize to absolute value).
    const distanceFromBottom = Math.abs(el.scrollTop);
    isUserScrolledUpRef.current = distanceFromBottom > 80;

    // Load more when user scrolls near the TOP (oldest messages visually)
    // In flex-col-reverse, the "top" of visible content is actually the end of the DOM list.
    // scrollTop + clientHeight >= scrollHeight means we're at the DOM bottom = visual top.
    const nearTop =
      el.scrollHeight + el.scrollTop - el.clientHeight < 100;

    if (nearTop && !isFetching && hasMore) {
      onLoadMore();
    }
  };

  // Auto-scroll to bottom (scrollTop=0 in flex-col-reverse) when new messages arrive
  // ONLY if the user hasn't scrolled up
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    if (newCount > prevCount && !isUserScrolledUpRef.current) {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = 0; // 0 = bottom in flex-col-reverse
      }
    }

    prevMessageCountRef.current = newCount;
  }, [messages.length, scrollRef]);

  if (isHidden || !messages || messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {isHidden ? "Chat is disabled" : "Welcome to the chat!"}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col-reverse overflow-y-auto p-3 h-full"
    >
      {/* Messages — newest first in DOM, flex-col-reverse flips them visually */}
      {messages.map((message) => (
        <ChatMessage key={message.id} data={message} />
      ))}

      {/* This renders at the DOM bottom = visual TOP of the list */}
      <div className="flex justify-center py-2 min-h-[32px]">
        {isFetching && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!hasMore && messages.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Beginning of chat history
          </p>
        )}
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <Skeleton className="w-1/2 h-6" />
    </div>
  );
}