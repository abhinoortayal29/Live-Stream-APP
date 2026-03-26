"use client";

import React from "react";
import { format } from "date-fns";
import { stringToColor } from "@/lib/utils";
import { UnifiedMessage } from "./chat"; // ← import our unified type

export function ChatMessage({ data }: { data: UnifiedMessage }) {
  const color = stringToColor(data.senderName); // ← was data.from?.name

  return (
    <div className="flex gap-2 p-2 rounded-md hover:bg-white/5">
      <p className="text-sm text-white/40">
        {format(data.timestamp, "HH:mm")} {/* ← was HH:MM (wrong — MM is months!) */}
      </p>
      <div className="flex flex-wrap items-baseline gap-1 grow">
        <p className="text-sm font-semibold whitespace-nowrap">
          <span className="truncate" style={{ color }}>
            {data.senderName} {/* ← was data.from?.name (undefined on UnifiedMessage) */}
          </span>
          :
        </p>
        <p className="text-sm break-all">{data.message}</p>
      </div>
    </div>
  );
}