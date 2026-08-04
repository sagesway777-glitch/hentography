import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/**
 * Get the Prisma User record for the currently authenticated Clerk user.
 * Returns null if unauthenticated or user not found in DB.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}



/**
 * Require authentication — returns userId string or throws.
 * Use in API routes: const userId = await requireAuth();
 */
export async function requireAuth(): Promise<{ clerkId: string; dbUserId: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return { clerkId, dbUserId: user.id };
}

/**
 * Sync a Clerk user to the Prisma database.
 * Called from the Clerk webhook handler.
 */
export async function syncClerkUser(clerkUser: {
  id: string;
  emailAddresses: { emailAddress: string }[];
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
}) {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  return prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      name,
      email,
      username: clerkUser.username || undefined,
      image: clerkUser.imageUrl,
    },
    create: {
      clerkId: clerkUser.id,
      email,
      name,
      username: clerkUser.username || undefined,
      image: clerkUser.imageUrl,
    },
  });
}
