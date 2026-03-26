"use server";

import { RoomServiceClient } from "livekit-server-sdk";
import { blockUser, unblockUser } from "@/lib/block-service";
import { revalidatePath } from "next/cache";
import { getSelf } from "@/lib/auth-service";

type BlockResult = {
  blocked: {
    id: string;
    username: string;
  };
};

const roomService = new RoomServiceClient(
  process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export const onBlock = async (id: string): Promise<BlockResult | null> => {
  const self = await getSelf();
  if (!self) return null;

  const blockedUser = await blockUser(id);

  // ✅ Kick blocked user from the LiveKit room immediately
  // Room name = host's user id (set in createIngress as roomName: self.id)
  // Participant identity = blocked user's id (set in createViewerToken)
  try {
    await roomService.removeParticipant(self.id, id);
    console.log(`[Block] Kicked participant ${id} from room ${self.id}`);
  } catch (err) {
    // Participant may not be in the room (offline) — that's fine, ignore
    console.log(`[Block] Could not kick participant (may be offline):`, err);
  }

  revalidatePath(`/u/${self.username}/community`);
  return blockedUser as BlockResult;
};

export const onUnblock = async (id: string): Promise<BlockResult | null> => {
  const self = await getSelf();
  if (!self) return null;

  const unblockedUser = await unblockUser(id);

  revalidatePath(`/u/${self.username}/community`);
  return unblockedUser as BlockResult;
};