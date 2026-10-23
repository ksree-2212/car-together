import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseBody } from "@/lib/http";
import { asIso, getDb, runInTransaction } from "@/lib/db";
import { createOfferSchema } from "@/lib/schemas";
import { publicOffer, readOfferLines, type StoredOffer } from "@/lib/offers";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params, pool = await getDb();
    const exists = await pool.query("SELECT id FROM buyer_groups WHERE id = $1", [groupId]);
    if (!exists.rowCount) throw new ApiError(404, "group_not_found", "No group exists with that ID.");
    const result = await pool.query("SELECT * FROM dealer_offers WHERE group_id = $1 ORDER BY created_at DESC", [groupId]);
    const offers = await Promise.all((result.rows as StoredOffer[]).map(async (row) =>
      publicOffer(row, await readOfferLines(pool, row.id))));
    return NextResponse.json({ offers });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params, input = await parseBody(request, createOfferSchema), pool = await getDb();
    const groupResult = await pool.query("SELECT id, status FROM buyer_groups WHERE id = $1", [groupId]);
    const group = groupResult.rows[0] as { id: string; status: string } | undefined;
    if (!group) throw new ApiError(404, "group_not_found", "No group exists with that ID.");
    if (group.status !== "open") throw new ApiError(409, "group_closed", "Offers cannot be added to a closed group.");

    const id = randomUUID(), now = new Date().toISOString(), quotedAt = input.quotedAt ?? now;
    await runInTransaction(pool, async (client) => {
      await client.query(
        "INSERT INTO dealer_offers (id, group_id, dealer_name, dealer_city, registration_city, vehicle_json, quote_reference, quoted_at, valid_until, terms, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [id, groupId, input.dealerName, input.dealerCity, input.registrationCity, JSON.stringify(input.vehicle),
          input.quoteReference ?? null, quotedAt, input.validUntil ?? null, input.terms ?? null, now],
      );
      for (const line of input.lines) {
        await client.query(
          "INSERT INTO offer_lines (id, offer_id, category, label, kind, amount_paise, mandatory) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [randomUUID(), id, line.category, line.label, line.kind, line.amountPaise, line.mandatory],
        );
      }
    });
    const stored = await pool.query("SELECT * FROM dealer_offers WHERE id = $1", [id]);
    const offer = publicOffer(stored.rows[0] as StoredOffer, input.lines);
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
