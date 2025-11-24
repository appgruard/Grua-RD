import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, integer, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { users, conductores, servicios } from "../shared/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Schema extensions for identity verification and payment features
 * These tables are managed server-side and extend the core schema
 */

// Enums for payment features
export const stripeAccountStatusEnum = pgEnum("stripe_account_status", [
  "not_started",
  "pending",
  "active",
  "rejected",
  "disabled"
]);


// OTP Tokens Table - Stores one-time passwords for phone verification
export const otpTokens = pgTable("otp_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Verification Audit Table - Tracks all verification attempts for security
export const verificationAudit = pgTable("verification_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  verificationType: text("verification_type").notNull(),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conductor Stripe Accounts Table - Stores Stripe Connect account info for drivers
export const conductorStripeAccounts = pgTable("conductor_stripe_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conductorId: varchar("conductor_id").notNull().unique().references(() => conductores.id, { onDelete: "cascade" }),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  accountStatus: stripeAccountStatusEnum("account_status").default("pending").notNull(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  chargesEnabled: boolean("charges_enabled").default(false).notNull(),
  payoutsEnabled: boolean("payouts_enabled").default(false).notNull(),
  detailsSubmitted: boolean("details_submitted").default(false).notNull(),
  country: text("country").default("DO"),
  currency: text("currency").default("DOP"),
  lastWebhookAt: timestamp("last_webhook_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Methods Table - Stores saved payment methods for clients
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull().unique(),
  brand: text("brand").notNull(),
  last4: text("last4").notNull(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Service Receipts Table - Stores PDF receipt metadata for completed services
export const serviceReceipts = pgTable("service_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  servicioId: varchar("servicio_id").notNull().unique().references(() => servicios.id, { onDelete: "cascade" }),
  receiptUrl: text("receipt_url").notNull(),
  receiptNumber: text("receipt_number").notNull().unique(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  pdfSize: integer("pdf_size"),
});

// Type exports
export type OtpToken = typeof otpTokens.$inferSelect;
export type NewOtpToken = typeof otpTokens.$inferInsert;
export type VerificationAudit = typeof verificationAudit.$inferSelect;
export type NewVerificationAudit = typeof verificationAudit.$inferInsert;
export type ConductorStripeAccount = typeof conductorStripeAccounts.$inferSelect;
export type NewConductorStripeAccount = typeof conductorStripeAccounts.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
export type ServiceReceipt = typeof serviceReceipts.$inferSelect;
export type NewServiceReceipt = typeof serviceReceipts.$inferInsert;

// Zod schemas
export const insertConductorStripeAccountSchema = createInsertSchema(conductorStripeAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods, {
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(new Date().getFullYear()),
}).omit({
  id: true,
  createdAt: true,
});

export const insertServiceReceiptSchema = createInsertSchema(serviceReceipts).omit({
  id: true,
  generatedAt: true,
});
