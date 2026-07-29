import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";
import { syncClerkUser } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    image_url: string;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify webhook signature
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    logger.error("Clerk webhook verification failed", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { type, data } = event;

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        await syncClerkUser({
          id: data.id,
          emailAddresses: data.email_addresses.map((e) => ({ emailAddress: e.email_address })),
          firstName: data.first_name,
          lastName: data.last_name,
          username: data.username,
          imageUrl: data.image_url,
        });
        logger.info(`Synced Clerk user ${data.id} (${type})`);
        break;
      }

      case "user.deleted": {
        // Soft delete — mark as BANNED to preserve referential integrity
        await prisma.user.updateMany({
          where: { clerkId: data.id },
          data: { status: "BANNED" },
        });
        logger.info(`Marked Clerk user ${data.id} as deleted`);
        break;
      }

      default:
        logger.info(`Unhandled Clerk webhook type: ${type}`);
    }
  } catch (err) {
    logger.error(`Failed to process Clerk webhook ${type}`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
