// Re-export Prisma types
export type {
  User,
  Session,
  Account,
  Verification,
  Product,
  Client,
  ClientApiKey,
  ClientProductConfig,
  CreditLedger,
  KycSession,
  WebhookLog,
} from "../generated/prisma/client";

// API Key types
export interface GeneratedApiKey {
  key: string;
  hash: string;
  encrypted: string;
  prefix: string;
  suffix: string;
}

// KYC types
export type KycStatus = "pending" | "processing" | "completed" | "expired";
export type KycResult = "approved" | "rejected" | null;
export type DocumentType = "front_document" | "back_document" | "face_image" | "best_frame";

// Credit ledger types
export type CreditType = "topup" | "usage" | "adjustment" | "refund";

// User roles
export type UserRole = "super_admin" | "ops" | "finance";
