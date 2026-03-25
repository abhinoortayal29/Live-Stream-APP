"use client";

import React from "react";
import { User } from "@prisma/client";

import { useSidebar } from "@/store/use-sidebar";

import { UserItem, UserItemSkelton } from "./user-item";

export function Recommended({
  data,
}: {
  data: (User & { stream: { isLive: boolean } | null })[];
}) {
  const { collapsed } = useSidebar((state) => state);

  // 🔥 DEBUG: check component + data
  console.log("Recommended rendered");
  console.log("DATA:", data);

  const showLabel = !collapsed && data.length > 0;

  return (
    <div>
      {showLabel && (
        <div className="pl-6 mb-4">
          <p className="text-xs text-muted-foreground">Recommended</p>
        </div>
      )}

      <ul className="space-y-2 px-2">
        {data.map((user) => {
          // 🔥 DEBUG: each user
          console.log("USER:", user.username, user.stream);

          return (
            <UserItem
              key={user.id}
              imageUrl={user.imageUrl}
              username={user.username}
              isLive={user.stream?.isLive ?? false}
            />
          );
        })}
      </ul>
    </div>
  );
}

export function RecommendedSkelton() {
  return (
    <ul className="px-2">
      {[...Array(3)].map((_, i) => (
        <UserItemSkelton key={i} />
      ))}
    </ul>
  );
}