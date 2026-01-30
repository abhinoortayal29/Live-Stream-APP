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

if (!process.env.LIVEKIT_API_URL) {
  throw new Error("LIVEKIT_API_URL is not defined");
}

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_API_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

const ingressClient = new IngressClient(process.env.LIVEKIT_API_URL);

const videoOptions = new IngressVideoOptions({
  source: TrackSource.CAMERA,
});

const audioOptions = new IngressAudioOptions({
  source: TrackSource.MICROPHONE,
});

export const resetIngresses = async (hostId: string) => {
  const ingresses = await ingressClient.listIngress({ roomName: hostId });
  const rooms = await roomService.listRooms([hostId]);

  for (const room of rooms) {
    await roomService.deleteRoom(room.name);
  }

  for (const ingress of ingresses) {
    if (ingress.ingressId) {
      await ingressClient.deleteIngress(ingress.ingressId);
    }
  }
};

export const createIngress = async (ingressType: IngressInput) => {
  const self = await getSelf();
  if (!self) return null;

  await resetIngresses(self.id);

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

  const ingress = await ingressClient.createIngress(ingressType, options);

  if (!ingress?.url || !ingress?.streamKey) {
    throw new Error("Failed to create ingress");
  }

  await db.stream.update({
    where: { userId: self.id },
    data: {
      ingressId: ingress.ingressId,
      serverUrl: ingress.url,
      streamKey: ingress.streamKey,
    },
  });

  revalidatePath(`/u/${self.username}/keys`);

  // ✅ return ONLY plain object
  return {
    ingressId: ingress.ingressId,
    url: ingress.url,
    streamKey: ingress.streamKey,
  };
};
