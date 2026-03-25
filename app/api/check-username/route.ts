import { db } from "@/lib/db";
export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.toLowerCase();

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false });
  }

  const existing = await db.user.findUnique({
    where: { username },
  });

  return NextResponse.json({ available: !existing });
}