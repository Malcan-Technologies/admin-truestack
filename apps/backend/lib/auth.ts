import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

// Enable SSL for production PostgreSQL connections (required by RDS)
const isProduction = process.env.NODE_ENV === "production";

// Allowed origins for CORS (admin app)
const allowedOrigins = [
  "http://localhost:3002", // Admin app local dev
  "https://admin.truestack.my", // Admin app in production
  "https://core.truestack.my", // Core app in production
  process.env.ADMIN_APP_URL, // Additional admin app URL if configured
].filter(Boolean) as string[];

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET,

  // Plugins
  plugins: [
    admin({
      defaultRole: "ops",
    }),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Admin-only, pre-created users
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24, // Refresh session daily on activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minute cache
    },
    // Map session fields to snake_case columns
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  // Map user fields to snake_case columns
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "ops",
        input: false, // Don't allow setting via signup
      },
    },
  },

  // Map account fields to snake_case columns
  account: {
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      idToken: "id_token",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  // Disable public signup - admin users are pre-created
  advanced: {
    disableCSRFCheck: false,
    // Enable cross-subdomain cookies for admin.truestack.my <-> api.truestack.my
    crossSubDomainCookies: isProduction
      ? {
          enabled: true,
          domain: ".truestack.my", // Leading dot for all subdomains
        }
      : undefined,
  },

  // CORS configuration for cross-origin requests from admin app
  trustedOrigins: allowedOrigins,
});

// Export type for session
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
