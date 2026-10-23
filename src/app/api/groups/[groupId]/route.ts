import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/http";
import { asIso, getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params, pool = await getDb();
    const result = await pool.query(
      "SELECT g.*, (SELECT COUNT(*)::int FROM group_members m WHERE m.group_id = g.id) AS member_count, " +
      "(SELECT COUNT(*)::int FROM dealer_offers o WHERE o.group_id = g.id) AS offer_count " +
      "FROM buyer_groups g WHERE g.id = $1",
      [groupId],
    );
    const row = result.rows[0];
    if (!row) throw new ApiError(404, "group_not_found", "No group exists with that ID.");
    return NextResponse.json({ group: {
      id: row.id, name: row.name, city: row.city, vehicle: JSON.parse(row.vehicle_json),
      memberLimit: row.member_limit, memberCount: row.member_count, offerCount: row.offer_count,
      closesAt: row.closes_at, status: row.status, createdAt: asIso(row.created_at),
    } });
  } catch (error) { return handleApiError(error); }
}
