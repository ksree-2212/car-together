import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, parseBody } from "@/lib/http";
import { asIso, getDb, runInTransaction } from "@/lib/db";
import { joinGroupSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params, pool = await getDb();
    const exists = await pool.query("SELECT id FROM buyer_groups WHERE id = $1", [groupId]);
    if (!exists.rowCount) throw new ApiError(404, "group_not_found", "No group exists with that ID.");
    const result = await pool.query(
      "SELECT id, alias, purchase_window, created_at FROM group_members WHERE group_id = $1 ORDER BY created_at", [groupId],
    );
    return NextResponse.json({ members: result.rows.map((row) => ({
      id: row.id, alias: row.alias, purchaseWindow: row.purchase_window, joinedAt: asIso(row.created_at),
    })) });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params, input = await parseBody(request, joinGroupSchema), pool = await getDb();
    const id = randomUUID(), now = new Date().toISOString();
    try {
      await runInTransaction(pool, async (client) => {
        const groupResult = await client.query("SELECT id, member_limit, status FROM buyer_groups WHERE id = $1 FOR UPDATE", [groupId]);
        const group = groupResult.rows[0] as { id: string; member_limit: number; status: string } | undefined;
        if (!group) throw new ApiError(404, "group_not_found", "No group exists with that ID.");
        if (group.status !== "open") throw new ApiError(409, "group_closed", "This group is closed to new members.");
        const countResult = await client.query("SELECT COUNT(*)::int AS count FROM group_members WHERE group_id = $1", [groupId]);
        if (countResult.rows[0].count >= group.member_limit) throw new ApiError(409, "group_full", "This group has reached its member limit.");
        await client.query(
          "INSERT INTO group_members (id, group_id, alias, pincode, purchase_window, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, groupId, input.alias, input.pincode ?? null, input.purchaseWindow, now],
        );
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        throw new ApiError(409, "alias_taken", "That alias is already in this group. Choose another one.");
      }
      throw error;
    }
    return NextResponse.json({ member: { id, groupId, alias: input.alias, purchaseWindow: input.purchaseWindow, joinedAt: now } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
