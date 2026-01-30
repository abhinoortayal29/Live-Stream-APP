"use server";

import { Stream } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";

export const updateStream = async (values: Partial<Stream>) => {
  try {
    const self = await getSelf();
    if (!self) return null;

    const selfStream = await db.stream.findUnique({
      where: {
        userId: self.id,
      },
    });

    if (!selfStream) {
      throw new Error("No stream found");
    }

    const stream = await db.stream.update({
      where: {
        id: selfStream.id,
      },
      data: {
        ...(values.name !== undefined && { name: values.name }),
        ...(values.thumbnailUrl !== undefined && {
          thumbnailUrl: values.thumbnailUrl,
        }),
        ...(values.isChatEnabled !== undefined && {
          isChatEnabled: values.isChatEnabled,
        }),
        ...(values.isChatFollowersOnly !== undefined && {
          isChatFollowersOnly: values.isChatFollowersOnly,
        }),
        ...(values.isChatDelayed !== undefined && {
          isChatDelayed: values.isChatDelayed,
        }),
      },
    });

    revalidatePath(`/u/${self.username}/chat`);
    revalidatePath(`/u/${self.username}`);
    revalidatePath(`/${self.username}`);

    return stream;
  } catch (error) {
    console.error("updateStream", error);
    throw new Error("Internal server error");
  }
};
