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
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    if (!hostIdentity) {
      return NextResponse.json({ error: "Missing hostIdentity" }, { status: 400 });
    }

    const stream = await db.stream.findUnique({
      where: { userId: hostIdentity },
    });

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: { streamId: stream.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.log("CHAT_GET_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}