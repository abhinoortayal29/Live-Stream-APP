import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userName, message, streamId: hostIdentity } = body;

    if (!message || !hostIdentity || !userName) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const stream = await db.stream.findUnique({
      where: {
        userId: hostIdentity,
      },
    });

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    const newMessage = await db.message.create({
      data: {
        text: message,
        userName: userName,
        streamId: stream.id,
      },
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.log("CHAT_POST_ERROR", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hostIdentity = searchParams.get("hostIdentity");

    if (!hostIdentity) {
      return NextResponse.json(
        { error: "Missing hostIdentity" },
        { status: 400 }
      );
    }

    const stream = await db.stream.findUnique({
      where: {
        userId: hostIdentity,
      },
    });

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: {
        streamId: stream.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.log("CHAT_GET_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}