import type { Pool } from "pg";
import { normalizeText } from "@/lib/http";
import { asIso } from "@/lib/db";
import type { LineCategory, LineItem } from "@/lib/schemas";

export type StoredOffer = {
  id: string; group_id: string; dealer_name: string; dealer_city: string; registration_city: string;
  vehicle_json: string; quote_reference: string | null; quoted_at: string | Date; valid_until: string | null;
  terms: string | null; source: string; created_at: string | Date;
};

export const comparisonRequiredCategories: LineCategory[] = ["ex_showroom", "registration", "insurance"];

export async function readOfferLines(pool: Pool, offerId: string): Promise<LineItem[]> {
  const result = await pool.query(
    "SELECT category, label, kind, amount_paise, mandatory FROM offer_lines WHERE offer_id = $1", [offerId],
  );
  return result.rows.map((row) => ({
    category: row.category as LineCategory,
    label: String(row.label),
    kind: row.kind as "charge" | "discount",
    amountPaise: Number(row.amount_paise),
    mandatory: Boolean(row.mandatory),
  }));
}

export function summarizeLines(lines: LineItem[]) {
  const byCategory = new Map<LineCategory, number>();
  let totalPaise = 0;
  for (const line of lines) {
    const net = line.kind === "discount" ? -line.amountPaise : line.amountPaise;
    totalPaise += net;
    byCategory.set(line.category, (byCategory.get(line.category) ?? 0) + net);
  }
  return { totalPaise, byCategory };
}

export function offerMatchesGroup(offer: StoredOffer, group: { city: string; vehicle_json: string }) {
  const offerVehicle = JSON.parse(offer.vehicle_json) as Record<string, unknown>;
  const groupVehicle = JSON.parse(group.vehicle_json) as Record<string, unknown>;
  const sameVehicle = ["make", "model", "variant", "modelYear", "fuel", "transmission"].every((key) => {
    const left = offerVehicle[key], right = groupVehicle[key];
    return typeof left === "string" && typeof right === "string"
      ? normalizeText(left) === normalizeText(right) : left === right;
  });
  return sameVehicle && normalizeText(offer.registration_city) === normalizeText(group.city);
}

export function publicOffer(offer: StoredOffer, lines: LineItem[]) {
  const { totalPaise } = summarizeLines(lines);
  return {
    id: offer.id, dealerName: offer.dealer_name, dealerCity: offer.dealer_city,
    registrationCity: offer.registration_city, vehicle: JSON.parse(offer.vehicle_json),
    quoteReference: offer.quote_reference, quotedAt: asIso(offer.quoted_at),
    validUntil: offer.valid_until, terms: offer.terms, source: offer.source,
    createdAt: asIso(offer.created_at), lines, listedTotalPaise: totalPaise,
  };
}
