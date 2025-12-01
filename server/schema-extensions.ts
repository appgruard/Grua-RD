import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, integer, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { users, conductores, servicios } from "../shared/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Schema extensions for identity verification and payment features
 * These tables are managed server-side and extend the core schema
 */

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
export type ServiceReceipt = typeof serviceReceipts.$inferSelect;
export type NewServiceReceipt = typeof serviceReceipts.$inferInsert;

// Zod schemas
export const insertServiceReceiptSchema = createInsertSchema(serviceReceipts).omit({
  id: true,
  generatedAt: true,
});
