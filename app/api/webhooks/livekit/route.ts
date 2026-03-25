import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";

// User starts stream (OBS / WHIP)
// LiveKit detects it
// LiveKit → sends webhook
// Your API receives it
// Verifies it's real
// Finds stream in DB

// Updates:

// isLive = true
// UI refreshes
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

  // ✅ FIX: await the event
  const event = await receiver.receive(body, authorization);
  

  if (event.event === "ingress_started") {
  //console.log(" INGRESS START EVENT");

  const incomingId = event.ingressInfo?.ingressId;
  //console.log("👉 EVENT ingressId:", incomingId);

  // check DB
  const stream = await db.stream.findUnique({
    where: {
      ingressId: incomingId,
    },
    include: { user: true },
  });

  console.log("👉 DB STREAM:", stream);

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
}






  return new Response("Success!", { status: 200 });
}
