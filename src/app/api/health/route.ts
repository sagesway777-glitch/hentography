import { NextResponse } from "next/server";

export async function GET() {
  const status = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  };
  return NextResponse.json(status);
}
