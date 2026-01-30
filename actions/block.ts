"use server";

import { blockUser, unblockUser } from "@/lib/block-service";
import { revalidatePath } from "next/cache";
import { getSelf } from "@/lib/auth-service";

type BlockResult = {
  blocked: {
    id: string;
    username: string;
  };
};

export const onBlock = async (
  id: string
): Promise<BlockResult | null> => {
  const self = await getSelf();
  if (!self) return null;

  const blockedUser = await blockUser(id);

  revalidatePath(`/u/${self.username}/community`);
  return blockedUser as BlockResult;
};

export const onUnblock = async (
  id: string
): Promise<BlockResult | null> => {
  const self = await getSelf();
  if (!self) return null;

  const unblockedUser = await unblockUser(id);

  revalidatePath(`/u/${self.username}/community`);
  return unblockedUser as BlockResult;
};
