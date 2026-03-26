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

// ─── ENV GUARD ────────────────────────────────────────────────────────────────
if (!process.env.NEXT_PUBLIC_LIVEKIT_WS_URL) {
  throw new Error("NEXT_PUBLIC_LIVEKIT_WS_URL is not defined");
}
if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
  throw new Error("LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not defined");
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
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

// ─── MEDIA OPTIONS ────────────────────────────────────────────────────────────
const videoOptions = new IngressVideoOptions({
  source: TrackSource.CAMERA,
});

const audioOptions = new IngressAudioOptions({
  source: TrackSource.MICROPHONE,
});

// ─── DUPLICATE CALL GUARD ─────────────────────────────────────────────────────
let isCreatingIngress = false;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Checks whether a given ingressId actually exists and is active in LiveKit.
 * This is the KEY check that was missing before — DB values mean nothing
 * if LiveKit deleted or never had that ingress (e.g. after a schema wipe).
 */
async function verifyIngressExists(ingressId: string): Promise<boolean> {
  try {
    const ingresses = await ingressClient.listIngress({});
    const found = ingresses.find((i) => i.ingressId === ingressId);
    console.log(
      `[Ingress Verify] ingressId=${ingressId} found=${!!found} status=${found?.state?.status}`
    );
    return !!found;
  } catch (err) {
    console.error("[Ingress Verify] Failed to list ingresses:", err);
    // If we can't verify, assume invalid — force recreation
    return false;
  }
}

/**
 * Deletes all LiveKit ingresses for a room (hostId) and the room itself.
 * Safe to call even if nothing exists.
 */
export const resetIngresses = async (hostId: string) => {
  try {
    console.log(`[Reset] Listing all ingresses to find ones for room=${hostId}`);
    const ingresses = await ingressClient.listIngress({});

    for (const ingress of ingresses) {
      if (ingress.roomName === hostId && ingress.ingressId) {
        console.log(`[Reset] Deleting ingress ingressId=${ingress.ingressId}`);
        await ingressClient.deleteIngress(ingress.ingressId);
      }
    }

    const rooms = await roomService.listRooms([hostId]);
    for (const room of rooms) {
      console.log(`[Reset] Deleting room name=${room.name}`);
      await roomService.deleteRoom(room.name);
    }

    console.log(`[Reset] Done for hostId=${hostId}`);
  } catch (err) {
    console.error("[Reset] Error during reset:", err);
  }
};

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────────

export const createIngress = async (ingressType: IngressInput) => {
  const self = await getSelf();
  if (!self) throw new Error("Unauthorized");

  if (isCreatingIngress) {
    throw new Error("Ingress creation already in progress. Please wait.");
  }

  isCreatingIngress = true;

  try {
    // ── STEP 1: Load DB record ────────────────────────────────────────────────
    const existing = await db.stream.findUnique({
      where: { userId: self.id },
    });

    console.log("[createIngress] DB record:", {
      ingressId: existing?.ingressId ?? "NULL",
      serverUrl: existing?.serverUrl ?? "NULL",
      streamKey: existing?.streamKey
        ? `${existing.streamKey.slice(0, 8)}...`
        : "NULL",
    });

    // ── STEP 2: Try to reuse — but VERIFY with LiveKit first ─────────────────
    if (existing?.ingressId && existing?.serverUrl && existing?.streamKey) {
      const stillValid = await verifyIngressExists(existing.ingressId);

      if (stillValid) {
        console.log(
          "[createIngress] Reusing valid existing ingress from DB + LiveKit."
        );
        return {
          ingressId: existing.ingressId,
          url: existing.serverUrl,
          streamKey: existing.streamKey,
        };
      }

      console.warn(
        "[createIngress] DB has ingressId but LiveKit does NOT. " +
          "This is likely caused by a Prisma schema migration wiping the DB " +
          "or the ingress expiring. Will recreate."
      );
    } else {
      console.log(
        "[createIngress] DB has no ingress fields — first time or wiped by migration."
      );
    }

    // ── STEP 3: Clean up stale LiveKit state ─────────────────────────────────
    await resetIngresses(self.id);

    // ── STEP 4: Build creation options ───────────────────────────────────────
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

    // ── STEP 5: Create new ingress in LiveKit ─────────────────────────────────
    console.log("[createIngress] Creating new ingress in LiveKit...");
    const ingress = await ingressClient.createIngress(ingressType, options);

    if (!ingress?.url || !ingress?.streamKey || !ingress?.ingressId) {
      throw new Error(
        "LiveKit returned an incomplete ingress object. Check API keys and server URL."
      );
    }

    console.log("[createIngress] New ingress created:", {
      ingressId: ingress.ingressId,
      url: ingress.url,
      streamKey: `${ingress.streamKey.slice(0, 8)}...`,
    });

    // ── STEP 6: Persist to DB ─────────────────────────────────────────────────
    await db.stream.update({
      where: { userId: self.id },
      data: {
        ingressId: ingress.ingressId,
        serverUrl: ingress.url,
        streamKey: ingress.streamKey,
      },
    });

    console.log("[createIngress] DB updated successfully.");

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