"use server";

import { v4 } from "uuid";
//  AccessToken is used to generate that permission pass.
import { AccessToken } from "livekit-server-sdk";

import { getSelf } from "@/lib/auth-service";
import { getUserById } from "@/lib/user-service";

import { isBlockedByUser } from "@/lib/block-service";

export const createViewerToken = async (hostIdentity: string) => {
  let self;

  try {
    self = await getSelf();
    if (!self) {
      throw new Error("Viewer identity missing");
    }
  } catch (error) {
    const id = v4();
    const username = `guest#${Math.floor(Math.random() * 1000)}`;
    self = { id, username };
  }

  const host = await getUserById(hostIdentity);

  if (!host) {
    throw new Error("User not found");
  }

  const isBlocked = await isBlockedByUser(host.id);

  if (isBlocked) {
    throw new Error("User is blocked");
  }

  const isHost = self.id === host.id;

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: isHost ? `host-${self.id}` : self.id,
      name: self.username,
    }
  );

  token.addGrant({
    room: host.id,
    roomJoin: true,
    canPublish: false,
    //canPublishData  Can send chat/messages ✅
    canPublishData: true,
  });

    //This converts the pass into a string:
  return await Promise.resolve(token.toJwt());
};