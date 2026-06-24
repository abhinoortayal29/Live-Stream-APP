// app/api/chat/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userName, message, streamId: hostIdentity } = body;

    const messageToSend = message?.trim();

    if (!messageToSend) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    if (messageToSend.length > 200) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }
    if (!hostIdentity || !userName) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const stream = await db.stream.findUnique({
      where: { userId: hostIdentity },
    });

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    const newMessage = await db.message.create({
      data: {
        text: messageToSend,
        userName,
        streamId: stream.id,
      },
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.log("CHAT_POST_ERROR", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const hostIdentity = searchParams.get("hostIdentity");
    const cursorParam = searchParams.get("cursor"); // ISO timestamp or null
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));

    if (!hostIdentity) {
      return NextResponse.json({ error: "Missing hostIdentity" }, { status: 400 });
    }

    const stream = await db.stream.findUnique({
      where: { userId: hostIdentity },
    });

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // Fetch limit + 1 — the extra record tells us whether more pages exist
    // without a separate COUNT query
    const messages = await db.message.findMany({
      where: {
        streamId: stream.id,
        // If cursor provided, fetch only messages OLDER than that timestamp
        ...(cursorParam
          ? { createdAt: { lt: new Date(cursorParam) } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;

    // Trim the extra record — it was only used to detect hasMore
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;

    // nextCursor = createdAt of the OLDEST message in this batch
    // The next request will fetch everything older than this point
    const nextCursor =
      hasMore && pageMessages.length > 0
        ? pageMessages[pageMessages.length - 1].createdAt.toISOString()
        : null;

    return NextResponse.json({ messages: pageMessages, nextCursor });
  } catch (error) {
    console.log("CHAT_GET_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}