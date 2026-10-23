import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseBody } from "@/lib/http";
import { getDb } from "@/lib/db";
import { createPassportSchema } from "@/lib/schemas";
import { readOfferLines } from "@/lib/offers";
import { reconcile } from "@/lib/passports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, createPassportSchema), pool = await getDb();
    const offerResult = await pool.query("SELECT id FROM dealer_offers WHERE id = $1", [input.offerId]);
    if (!offerResult.rowCount) throw new ApiError(404, "offer_not_found", "No offer exists with that ID.");

    const id = randomUUID(), accessKey = randomBytes(32).toString("base64url");
    const accessKeyHash = createHash("sha256").update(accessKey).digest("hex"), now = new Date().toISOString();
    await pool.query(
      "INSERT INTO deal_passports (id, offer_id, access_key_hash, invoice_date, invoice_reference, invoice_lines_json, benchmark_opt_in, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [id, input.offerId, accessKeyHash, input.invoiceDate, input.invoiceReference ?? null,
        JSON.stringify(input.invoiceLines), input.benchmarkOptIn, now],
    );
    const quoteLines = await readOfferLines(pool, input.offerId);
    return NextResponse.json({
      passport: { id, invoiceDate: input.invoiceDate, status: "self_reported", benchmarkOptIn: input.benchmarkOptIn, createdAt: now },
      accessKey,
      reconciliation: reconcile(quoteLines, input.invoiceLines),
      privacy: "Save the access key now. It is shown once and is required to reopen this private passport.",
    }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
