import { NextResponse } from "next/server";
import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";

/**
 * DEBUG ENDPOINT - Check stream status
 * GET /api/debug/stream-status
 * Only works if user is authenticated
 */
export async function GET() {
  try {
    const self = await getSelf();
    if (!self) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stream = await db.stream.findUnique({
      where: { userId: self.id },
    });

    if (!stream) {
      return NextResponse.json({
        error: "No stream found",
        userId: self.id,
      }, { status: 404 });
    }

    const status = {
      userId: self.id,
      username: self.username,
      streamId: stream.id,
      streamName: stream.name,
      // Connection status
      hasIngressId: !!stream.ingressId,
      hasServerUrl: !!stream.serverUrl,
      hasStreamKey: !!stream.streamKey,
      isConnected: !!(stream.ingressId && stream.serverUrl && stream.streamKey),
      // Values (be careful with stream key!)
      ingressId: stream.ingressId,
      serverUrl: stream.serverUrl,
      streamKeyLength: stream.streamKey?.length || 0,
      streamKeyPreview: stream.streamKey ? stream.streamKey.substring(0, 8) + "..." : null,
      // Stream settings
      isLive: stream.isLive,
      isChatEnabled: stream.isChatEnabled,
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("[DEBUG API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
