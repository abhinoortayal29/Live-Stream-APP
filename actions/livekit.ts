'use server'

import { AccessToken } from 'livekit-server-sdk'

export async function createToken(identity: string, roomName: string) {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity,
    }
  )

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })

  return await at.toJwt()
}