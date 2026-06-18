"use server";

import {
  IngressInput,
  IngressClient,
  RoomServiceClient,
  type CreateIngressOptions,
  IngressAudioOptions,
  IngressVideoOptions,
  TrackSource,
} from "livekit-server-sdk";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";

if (!process.env.NEXT_PUBLIC_LIVEKIT_WS_URL) {
  throw new Error("NEXT_PUBLIC_LIVEKIT_WS_URL is not defined");
}
if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
  throw new Error("LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not defined");
}

const roomService = new RoomServiceClient(
  process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

const ingressClient = new IngressClient(
  process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

const videoOptions = new IngressVideoOptions({
  source: TrackSource.CAMERA,
});

const audioOptions = new IngressAudioOptions({
  source: TrackSource.MICROPHONE,
});

let isCreatingIngress = false;

function sanitizeField(value: string | null | undefined): string | null {
  if (!value || value === "NULL") return null;
  return value;
}

// Deletes ALL ingresses in your LiveKit project — no roomName filter
export const resetIngresses = async (hostId: string) => {
  try {
    const allIngresses = await ingressClient.listIngress({});

    // Delete every single ingress (your free/dev LiveKit project is shared,
    // there's only one account, so all ingresses belong to you)
    for (const ingress of allIngresses) {
      if (!ingress.ingressId) continue;
      try {
        await ingressClient.deleteIngress(ingress.ingressId);
      } catch (err: any) {
        // Already gone — ignore
      }
    }

    // Also delete the room
    try {
      const rooms = await roomService.listRooms([hostId]);
      for (const room of rooms) {
        await roomService.deleteRoom(room.name);
      }
    } catch {
      // Room may not exist — ignore
    }
  } catch (err) {
    console.error("[Reset] Fatal error:", err);
    throw err; // re-throw so createIngress knows reset failed
  }
};

export const createIngress = async (ingressType: IngressInput) => {
  const self = await getSelf();
  if (!self) throw new Error("Unauthorized");

  if (isCreatingIngress) {
    throw new Error("Ingress creation already in progress. Please wait.");
  }

  isCreatingIngress = true;

  try {
    // STEP 1: Load and sanitize DB record
    const existing = await db.stream.findUnique({
      where: { userId: self.id },
    });

    const existingIngressId = sanitizeField(existing?.ingressId);
    const existingServerUrl = sanitizeField(existing?.serverUrl);
    const existingStreamKey = sanitizeField(existing?.streamKey);

    // Fix "NULL" strings in DB
    if (
      existing &&
      (existing.ingressId === "NULL" ||
        existing.serverUrl === "NULL" ||
        existing.streamKey === "NULL")
    ) {
      await db.stream.update({
        where: { userId: self.id },
        data: {
          ingressId: existingIngressId,
          serverUrl: existingServerUrl,
          streamKey: existingStreamKey,
        },
      });
    }

    // STEP 2: Always wipe ALL LiveKit ingresses first — no reuse logic
    // (Reuse was hiding stale state; just always recreate cleanly)
    await resetIngresses(self.id);

    // STEP 3: Build options
    const options: CreateIngressOptions = {
      name: self.username,
      roomName: self.id,
      participantName: self.username,
      participantIdentity: self.id,
    };

    if (ingressType === IngressInput.WHIP_INPUT) {
      options.bypassTranscoding = true;
    } else {
      options.video = videoOptions;
      options.audio = audioOptions;
    }

    // STEP 4: Create fresh ingress
    const ingress = await ingressClient.createIngress(ingressType, options);

    if (!ingress?.url || !ingress?.streamKey || !ingress?.ingressId) {
      throw new Error(
        "LiveKit returned an incomplete ingress object. Check API keys and server URL."
      );
    }

    // STEP 5: Save to DB
    await db.stream.update({
      where: { userId: self.id },
      data: {
        ingressId: ingress.ingressId,
        serverUrl: ingress.url,
        streamKey: ingress.streamKey,
      },
    });

    revalidatePath(`/u/${self.username}/keys`);

    return {
      ingressId: ingress.ingressId,
      url: ingress.url,
      streamKey: ingress.streamKey,
    };
  } finally {
    isCreatingIngress = false;
  }
};