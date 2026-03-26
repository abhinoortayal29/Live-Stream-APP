import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();
  const authorization = headerPayload.get("Authorization");

  if (!authorization) {
    return new Response("Error occurred -- no authorization headers", {
      status: 400,
    });
  }

  const event = await receiver.receive(body, authorization);

  // ── STREAM STARTED ────────────────────────────────────────────────────────
  if (event.event === "ingress_started") {
    const incomingId = event.ingressInfo?.ingressId;

    const stream = await db.stream.findUnique({
      where: { ingressId: incomingId },
      include: { user: true },
    });

    if (!stream) {
      console.log("❌ NO STREAM FOUND FOR THIS INGRESS ID");
      return new Response("Not found", { status: 404 });
    }

    try {
      await db.stream.update({
        where: { ingressId: incomingId },
        data: { isLive: true },
      });
      console.log("✅ STREAM SET TO LIVE");
    } catch (err) {
      console.log("❌ UPDATE FAILED:", err);
    }

    revalidatePath("/");
    revalidatePath(`/${stream.user.username}`);
  }

  // ── STREAM ENDED ──────────────────────────────────────────────────────────
  if (event.event === "ingress_ended") {
    const incomingId = event.ingressInfo?.ingressId;

    const stream = await db.stream.findUnique({
      where: { ingressId: incomingId },
      include: { user: true },
    });

    if (!stream) {
      console.log("❌ NO STREAM FOUND FOR ingress_ended");
      return new Response("Not found", { status: 404 });
    }

    try {
      // ✅ Mark stream as offline
      await db.stream.update({
        where: { ingressId: incomingId },
        data: { isLive: false },
      });
      console.log("✅ STREAM SET TO OFFLINE");

      // ✅ Delete all chat messages for this stream session
      // so when streamer comes back, chat starts fresh
      await db.message.deleteMany({
        where: { streamId: stream.id },
      });
      console.log("✅ CHAT MESSAGES CLEARED FOR STREAM:", stream.id);
    } catch (err) {
      console.log("❌ ingress_ended UPDATE FAILED:", err);
    }

    revalidatePath("/");
    revalidatePath(`/${stream.user.username}`);
  }

  return new Response("Success!", { status: 200 });
}