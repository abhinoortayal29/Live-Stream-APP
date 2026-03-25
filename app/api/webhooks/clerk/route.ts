import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const signingSecret =
      process.env.CLERK_WEBHOOK_SIGNING_SECRET ??
      process.env.CLERK_WEBHOOK_SECRET;

    if (!signingSecret) {
      console.error("Missing webhook signing secret env var");
      return new Response("Server misconfiguration", { status: 500 });
    }

    const evt = await verifyWebhook(req, { signingSecret });

    const eventType = evt.type;
    const payload = evt.data as Record<string, any>;

    console.log(`Received webhook: type=${eventType}, id=${payload?.id}`);

    // Handle user.created
    if (eventType === "user.created") {
      await db.user.upsert({
        where: { externalUserId: payload.id },
        create: {
          externalUserId: payload.id,
          username: payload.username ?? "",
          imageUrl: payload.image_url ?? "",
          stream: {
            create: {
              name: `${payload.username ?? "User"}'s stream`,
            },
          },
        },
        update: {
          username: payload.username ?? undefined,
          imageUrl: payload.image_url ?? undefined,
        },
      });
    }
    // Handle user.updated
    else if (eventType === "user.updated") {
      const existing = await db.user.findUnique({
        where: { externalUserId: payload.id },
      });

      if (!existing) {
        await db.user.create({
          data: {
            externalUserId: payload.id,
            username: payload.username ?? "",
            imageUrl: payload.image_url ?? "",
          },
        });
      } else {
        await db.user.update({
          where: { externalUserId: payload.id },
          data: {
            username: payload.username ?? existing.username,
            imageUrl: payload.image_url ?? existing.imageUrl,
          },
        });
      }
    }
    // Handle user.deleted
    else if (eventType === "user.deleted") {
      console.log("Attempting to delete user with ID:", payload.id);

      const existingUser = await db.user.findUnique({
        where: { externalUserId: payload.id },
      });

      if (existingUser) {
        await db.user.delete({ where: { externalUserId: payload.id } });
      }
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}

export async function GET() {
  return new Response(
    "✅ Clerk webhook endpoint active. Use POST for events.",
    { status: 200 }
  );
}