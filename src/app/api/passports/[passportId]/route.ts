import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/http";
import { asIso, getDb } from "@/lib/db";
import { readOfferLines } from "@/lib/offers";
import { reconcile } from "@/lib/passports";
import type { LineItem } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ passportId: string }> }) {
  try {
    const { passportId } = await params, accessKey = request.headers.get("x-passport-key");
    if (!accessKey) throw new ApiError(401, "access_key_required", "Provide the x-passport-key header.");
    const pool = await getDb(), result = await pool.query("SELECT * FROM deal_passports WHERE id = $1", [passportId]);
    const row = result.rows[0] as {
      id: string; offer_id: string; access_key_hash: string; invoice_date: string; invoice_reference: string | null;
      invoice_lines_json: string; benchmark_opt_in: boolean; verification_status: string; created_at: string | Date;
    } | undefined;
    if (!row) throw new ApiError(404, "passport_not_found", "No Deal Passport exists with that ID.");
    const providedHash = Buffer.from(createHash("sha256").update(accessKey).digest("hex"), "hex");
    const storedHash = Buffer.from(row.access_key_hash, "hex");
    if (providedHash.length !== storedHash.length || !timingSafeEqual(providedHash, storedHash)) {
      throw new ApiError(403, "invalid_access_key", "The access key is not valid for this passport.");
    }

    const invoiceLines = JSON.parse(row.invoice_lines_json) as LineItem[], quoteLines = await readOfferLines(pool, row.offer_id);
    return NextResponse.json({
      passport: {
        id: row.id, offerId: row.offer_id, invoiceDate: row.invoice_date,
        invoiceReference: row.invoice_reference, status: row.verification_status,
        benchmarkOptIn: row.benchmark_opt_in, createdAt: asIso(row.created_at),
      },
      quoteLines, invoiceLines, reconciliation: reconcile(quoteLines, invoiceLines),
    });
  } catch (error) { return handleApiError(error); }
}
