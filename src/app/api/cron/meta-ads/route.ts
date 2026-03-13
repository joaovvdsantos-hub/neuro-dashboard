import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // TODO: Implement Meta Ads data sync cron
  return NextResponse.json({ synced: true });
}
