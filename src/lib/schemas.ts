import { z } from "zod";

export const lineCategorySchema = z.enum([
  "ex_showroom", "registration", "insurance", "tcs", "accessories",
  "handling", "extended_warranty", "fastag", "other",
]);

export const lineItemSchema = z.object({
  category: lineCategorySchema,
  label: z.string().trim().min(1).max(120),
  kind: z.enum(["charge", "discount"]).default("charge"),
  amountPaise: z.number().int().min(0).max(5_000_000_000_000),
  mandatory: z.boolean().default(true),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(3).max(100),
  city: z.string().trim().min(2).max(80),
  vehicle: z.object({
    make: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(80),
    variant: z.string().trim().min(1).max(100),
    modelYear: z.number().int().min(2020).max(2035),
    fuel: z.enum(["petrol", "diesel", "cng", "electric", "hybrid"]),
    transmission: z.enum(["manual", "automatic"]),
  }),
  memberLimit: z.number().int().min(2).max(500).default(30),
  closesAt: z.string().date().optional(),
});

export const joinGroupSchema = z.object({
  alias: z.string().trim().min(2).max(40),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  purchaseWindow: z.enum(["under_1_month", "1_to_3_months", "3_to_6_months", "flexible"]),
});

export const createOfferSchema = z.object({
  dealerName: z.string().trim().min(2).max(120),
  dealerCity: z.string().trim().min(2).max(80),
  registrationCity: z.string().trim().min(2).max(80),
  vehicle: z.object({
    make: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(80),
    variant: z.string().trim().min(1).max(100),
    modelYear: z.number().int().min(2020).max(2035),
    fuel: z.enum(["petrol", "diesel", "cng", "electric", "hybrid"]),
    transmission: z.enum(["manual", "automatic"]),
  }),
  quoteReference: z.string().trim().max(80).optional(),
  quotedAt: z.string().datetime().optional(),
  validUntil: z.string().date().optional(),
  terms: z.string().trim().max(3000).optional(),
  lines: z.array(lineItemSchema).min(1).max(60),
});

export const createPassportSchema = z.object({
  offerId: z.string().uuid(),
  invoiceDate: z.string().date(),
  invoiceReference: z.string().trim().max(80).optional(),
  invoiceLines: z.array(lineItemSchema).min(1).max(60),
  benchmarkOptIn: z.boolean().default(false),
});

export const extractedOfferSchema = z.object({
  dealerName: z.string().nullable(),
  quoteReference: z.string().nullable(),
  quotedAt: z.string().nullable(),
  validUntil: z.string().nullable(),
  vehicle: z.object({
    make: z.string().nullable(),
    model: z.string().nullable(),
    variant: z.string().nullable(),
    modelYear: z.number().int().nullable(),
    fuel: z.enum(["petrol", "diesel", "cng", "electric", "hybrid"]).nullable(),
    transmission: z.enum(["manual", "automatic"]).nullable(),
  }),
  lines: z.array(z.object({
    category: lineCategorySchema,
    label: z.string(),
    kind: z.enum(["charge", "discount"]),
    amountRupees: z.string(),
    mandatory: z.boolean(),
  })),
  uncertainFields: z.array(z.string()),
  reviewNote: z.string(),
});

export type LineItem = z.infer<typeof lineItemSchema>;
export type LineCategory = z.infer<typeof lineCategorySchema>;
