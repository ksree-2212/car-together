import { Pool, type PoolClient } from "pg";

declare global {
  var __carTogetherPool: Pool | undefined;
  var __carTogetherSchemaReady: Promise<void> | undefined;
}

const schema = `
CREATE TABLE IF NOT EXISTS buyer_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  vehicle_json TEXT NOT NULL,
  member_limit INTEGER NOT NULL CHECK (member_limit BETWEEN 2 AND 500),
  closes_at DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES buyer_groups(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  pincode CHAR(6),
  purchase_window TEXT NOT NULL CHECK (purchase_window IN ('under_1_month', '1_to_3_months', '3_to_6_months', 'flexible')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_alias_lower ON group_members(group_id, lower(alias));
CREATE INDEX IF NOT EXISTS idx_members_group ON group_members(group_id);

CREATE TABLE IF NOT EXISTS dealer_offers (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES buyer_groups(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  dealer_city TEXT NOT NULL,
  registration_city TEXT NOT NULL,
  vehicle_json TEXT NOT NULL,
  quote_reference TEXT,
  quoted_at TIMESTAMPTZ NOT NULL,
  valid_until DATE,
  terms TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offers_group ON dealer_offers(group_id);

CREATE TABLE IF NOT EXISTS offer_lines (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES dealer_offers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('ex_showroom', 'registration', 'insurance', 'tcs', 'accessories', 'handling', 'extended_warranty', 'fastag', 'other')),
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('charge', 'discount')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  mandatory BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS deal_passports (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES dealer_offers(id),
  access_key_hash TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_reference TEXT,
  invoice_lines_json TEXT NOT NULL,
  benchmark_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'self_reported' CHECK (verification_status IN ('self_reported', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_passports_offer ON deal_passports(offer_id);
CREATE INDEX IF NOT EXISTS idx_groups_status_city ON buyer_groups(status, lower(city));
`;

export async function getDb(): Promise<Pool> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required. Set it in the app environment and start Docker Compose.");
  const pool = globalThis.__carTogetherPool ?? new Pool({ connectionString, max: 10 });
  globalThis.__carTogetherPool = pool;

  if (!globalThis.__carTogetherSchemaReady) {
    globalThis.__carTogetherSchemaReady = pool.query(schema).then(() => undefined).catch((error) => {
      globalThis.__carTogetherSchemaReady = undefined;
      throw error;
    });
  }
  await globalThis.__carTogetherSchemaReady;
  return pool;
}

export async function runInTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function asIso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}
