import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseBody } from "@/lib/http";
import { asIso, getDb } from "@/lib/db";
import { createGroupSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), city = url.searchParams.get("city"), status = url.searchParams.get("status") ?? "open";
    if (!["open", "closed", "all"].includes(status)) throw new ApiError(400, "invalid_status", "status must be open, closed, or all.");
    const clauses: string[] = [], params: string[] = [];
    if (status !== "all") { params.push(status); clauses.push("g.status = $" + params.length); }
    if (city) { params.push(city.trim()); clauses.push("lower(g.city) = lower($" + params.length + ")"); }
    const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
    const sql = "SELECT g.*, " +
      "(SELECT COUNT(*)::int FROM group_members m WHERE m.group_id = g.id) AS member_count, " +
      "(SELECT COUNT(*)::int FROM dealer_offers o WHERE o.group_id = g.id) AS offer_count " +
      "FROM buyer_groups g " + where + " ORDER BY g.created_at DESC LIMIT 100";
    const pool = await getDb(), result = await pool.query(sql, params);
    return NextResponse.json({ groups: result.rows.map((row) => ({
      id: row.id, name: row.name, city: row.city, vehicle: JSON.parse(row.vehicle_json),
      memberLimit: row.member_limit, memberCount: row.member_count, offerCount: row.offer_count,
      closesAt: row.closes_at, status: row.status, createdAt: asIso(row.created_at),
    })) });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, createGroupSchema), pool = await getDb();
    const id = randomUUID(), now = new Date().toISOString();
    await pool.query(
      "INSERT INTO buyer_groups (id, name, city, vehicle_json, member_limit, closes_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, input.name, input.city, JSON.stringify(input.vehicle), input.memberLimit, input.closesAt ?? null, now],
    );
    return NextResponse.json({ group: {
      id, name: input.name, city: input.city, vehicle: input.vehicle, memberLimit: input.memberLimit,
      memberCount: 0, offerCount: 0, closesAt: input.closesAt ?? null, status: "open", createdAt: now,
    } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
