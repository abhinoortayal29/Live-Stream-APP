// app/api/webhooks/clerk/route.ts
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    
    const signingSecret =
      process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? process.env.CLERK_WEBHOOK_SECRET;

    if (!signingSecret) {
      console.error("Missing webhook signing secret env var");
      return new Response("Server misconfiguration", { status: 500 });
    }

    
    const evt = await verifyWebhook(req, { signingSecret });

   
    const eventType = evt.type;
    const payload: any = evt.data; // payload shape depends on Clerk event

    console.log(`Received webhook: type=${eventType}, id=${payload?.id}`);

    // Handle user.created
    if (eventType === "user.created") {
      // Use upsert to avoid race conditions if user already exists
      await db.user.upsert({
        where: { externalUserId: payload.id },
        create: {
          externalUserId: payload.id,
          username: payload.username ?? "",
          imageUrl: payload.image_url ?? "",
        },
        update: {
          username: payload.username ?? undefined,
          imageUrl: payload.image_url ?? undefined,
        },
      });

    // Handle user.updated
    } else if (eventType === "user.updated") {
      const existing = await db.user.findUnique({
        where: { externalUserId: payload.id },
      });

      if (!existing) {
        // If user not found, create it (or return 404 — choose one)
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
            stream:{
              create:{
                name:`${payload.data.usernae} 's stream`,
              }
            }
          },
        });
      }

    
    }  if (eventType === "user.deleted") {
      console.log("Attempting to delete user with ID:", payload.id);
    
      const existingUser = await db.user.findUnique({
        where: { externalUserId: payload.id },
      });
      console.log("Found user:", existingUser);
    
      if (existingUser) {
        await db.user.delete({ where: { externalUserId: payload.id } });
       
      } else {
       
      }
    }


    return new Response("Webhook processed", { status: 200 });
  } catch (err) {
   
    return new Response("Error verifying webhook", { status: 400 });
  }
}
export async function GET() {
      return new Response("✅ Clerk webhook endpoint active. Use POST for events.", {
        status: 200,
      });
    }