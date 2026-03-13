import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // TODO: Implement Hotmart webhook handler
  return NextResponse.json({ received: true });
}
