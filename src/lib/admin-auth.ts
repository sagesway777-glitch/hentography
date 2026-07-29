import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

// Typed error for clean 401 detection in catch blocks
class UnauthorizedAdminError extends Error {
  constructor() {
    super("UNAUTHORIZED_ADMIN");
    this.name = "UnauthorizedAdminError";
  }
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AdminUser;

    if (decoded.role !== "ADMIN" && decoded.role !== "MODERATOR") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    throw new UnauthorizedAdminError();
  }
  return admin;
}

/**
 * Call this in the catch block of admin route handlers.
 * Returns a 401 response for unauthorized errors, or null for other errors.
 */
export function handleAdminError(error: unknown): NextResponse | null {
  if (error instanceof UnauthorizedAdminError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

