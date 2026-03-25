"use server";
// Checks user (auth)
// Prevents duplicate requests
// Reuses existing stream if already created
// Otherwise:
// Deletes old streams
// Creates a new stream connection via LiveKit
// Saves:
// serverUrl
// streamKey
// ingressId in DB
// Returns connection details to frontend
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

// ✅ ENV CHECK
if (!process.env.LIVEKIT_API_URL) {
  throw new Error("LIVEKIT_API_URL is not defined");
}

// ✅ CLIENTS
const roomService = new RoomServiceClient(
  process.env.LIVEKIT_API_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

const ingressClient = new IngressClient(process.env.LIVEKIT_API_URL);

// ✅ MEDIA OPTIONS
const videoOptions = new IngressVideoOptions({
  source: TrackSource.CAMERA,
});

const audioOptions = new IngressAudioOptions({
  source: TrackSource.MICROPHONE,
});

// ✅ SAFETY LOCK (prevents duplicate parallel calls)
let isCreatingIngress = false;

// ✅ SAFE RESET (fallback only)
export const resetIngresses = async (hostId: string) => {
  try {
    const ingresses = await ingressClient.listIngress({});

    for (const ingress of ingresses) {
      if (ingress.roomName === hostId && ingress.ingressId) {
        await ingressClient.deleteIngress(ingress.ingressId);
      }
    }
    // sometimes url key cacel  bu romm may not deleete room 
    const rooms = await roomService.listRooms([hostId]);
    for (const room of rooms) {
      await roomService.deleteRoom(room.name);
    }
  } catch (err) {
    console.log("Reset error:", err);
  }
};

// ✅ MAIN FUNCTION
export const createIngress = async (ingressType: IngressInput) => {
  const self = await getSelf();
  if (!self) throw new Error("Unauthorized");

  // 🔥 Prevent duplicate parallel calls
  if (isCreatingIngress) {
    throw new Error("Ingress already being created");
  }

  isCreatingIngress = true;

  try {
    // ✅ STEP 1: CHECK EXISTING (REUSE)
    const existing = await db.stream.findUnique({
      where: { userId: self.id },
    });

    if (
      existing?.ingressId &&
      existing?.serverUrl &&
      existing?.streamKey
    ) {
      return {
        ingressId: existing.ingressId,
        url: existing.serverUrl,
        streamKey: existing.streamKey,
      };
    }

    // ✅ STEP 2: CLEANUP (only if needed)
    await resetIngresses(self.id);

    // ✅ STEP 3: CREATE OPTIONS
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

    // ✅ STEP 4: CREATE INGRESS
    const ingress = await ingressClient.createIngress(
      ingressType,
      options
    );

    if (!ingress?.url || !ingress?.streamKey) {
      throw new Error("Failed to create ingress");
    }

    // ✅ STEP 5: SAVE IN DB
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