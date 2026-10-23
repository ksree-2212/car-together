import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/http";
import { getDb } from "@/lib/db";
import { offerMatchesGroup, readOfferLines, type StoredOffer, summarizeLines, comparisonRequiredCategories } from "@/lib/offers";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params, pool = await getDb();
    const groupResult = await pool.query("SELECT id, city, vehicle_json FROM buyer_groups WHERE id = $1", [groupId]);
    const group = groupResult.rows[0] as { id: string; city: string; vehicle_json: string } | undefined;
    if (!group) throw new ApiError(404, "group_not_found", "No group exists with that ID.");
    const offerResult = await pool.query("SELECT * FROM dealer_offers WHERE group_id = $1", [groupId]);
    const offers = offerResult.rows as StoredOffer[], today = new Date().toISOString().slice(0, 10);
    const result = await Promise.all(offers.map(async (offer) => {
      const summary = summarizeLines(await readOfferLines(pool, offer.id));
      const missingCategories = comparisonRequiredCategories.filter((category) => !summary.byCategory.has(category));
      const specMatch = offerMatchesGroup(offer, group), current = !offer.valid_until || offer.valid_until >= today;
      const comparable = specMatch && current && missingCategories.length === 0, reasons: string[] = [];
      if (!specMatch) reasons.push("Vehicle specification or registration city does not match the group.");
      if (!current) reasons.push("Quote validity date has passed.");
      if (missingCategories.length) reasons.push("Quote is missing required comparison items: " + missingCategories.join(", ") + ".");
      return {
        offerId: offer.id, dealerName: offer.dealer_name, dealerCity: offer.dealer_city,
        registrationCity: offer.registration_city, listedTotalPaise: summary.totalPaise,
        categoryTotalsPaise: Object.fromEntries(summary.byCategory), missingCategories,
        specMatch, current, comparable, reasons, validUntil: offer.valid_until,
      };
    }));
    const ranked = result.filter((row) => row.comparable).sort((a, b) => a.listedTotalPaise - b.listedTotalPaise)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const rankedIds = new Set(ranked.map((row) => row.offerId));
    return NextResponse.json({
      currency: "INR",
      totalBasis: "sum of submitted charges minus submitted discounts; this is not a guarantee that every on-road cost is included",
      requiredItemsForRanking: comparisonRequiredCategories,
      comparableOffers: ranked,
      otherOffers: result.filter((row) => !rankedIds.has(row.offerId)),
    });
  } catch (error) { return handleApiError(error); }
}
