import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // TODO: Implement Vturb data sync cron
  return NextResponse.json({ synced: true });
}
