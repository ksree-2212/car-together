import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pool = await getDb();
    await pool.query("SELECT 1");
    return NextResponse.json({
      status: "ok",
      database: "ready",
      quoteExtraction: Boolean(process.env.AI_GATEWAY_API_KEY && process.env.CAR_AGENT_MODEL),
    });
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
