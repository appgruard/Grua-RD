import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "../shared/schema";

/**
 * Schema extensions for identity verification features
 * These tables are managed server-side and extend the core schema
 */

// OTP Tokens Table - Stores one-time passwords for phone verification
export const otpTokens = pgTable("otp_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(), // Phone number to verify
  codeHash: text("code_hash").notNull(), // Bcrypt hash of the OTP code
  expiresAt: timestamp("expires_at").notNull(), // OTP expiration timestamp
  attempts: integer("attempts").default(0).notNull(), // Number of verification attempts
  verified: boolean("verified").default(false).notNull(), // Whether OTP was successfully verified
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Verification Audit Table - Tracks all verification attempts for security
export const verificationAudit = pgTable("verification_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  verificationType: text("verification_type").notNull(), // 'cedula', 'phone_otp', 'email'
  success: boolean("success").notNull(), // Whether verification succeeded
  ipAddress: text("ip_address"), // IP address of the attempt
  userAgent: text("user_agent"), // User agent string
  errorMessage: text("error_message"), // Error details if failed
  metadata: text("metadata"), // Additional JSON metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OtpToken = typeof otpTokens.$inferSelect;
export type NewOtpToken = typeof otpTokens.$inferInsert;
export type VerificationAudit = typeof verificationAudit.$inferSelect;
export type NewVerificationAudit = typeof verificationAudit.$inferInsert;
