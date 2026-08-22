import { NextRequest, NextResponse } from "next/server";
import { runFootballImport } from "@/lib/api-football";

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const result = await runFootballImport("cron");
    return NextResponse.json({
      ...result,
      legacyEndpoint: true,
      canonicalImporter: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 },
    );
  }
}
