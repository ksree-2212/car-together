import { NextResponse } from "next/server";
import type { z } from "zod";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
  }
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try { body = await request.json(); }
  catch { throw new ApiError(400, "invalid_json", "Request body must be valid JSON."); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, "validation_error", "Some request fields are missing or invalid.",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
  }
  return parsed.data;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  }
  console.error("Unhandled API error", error instanceof Error ? error.message : "unknown error");
  return NextResponse.json({ error: { code: "internal_error", message: "The request could not be completed." } }, { status: 500 });
}

export function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN");
}
