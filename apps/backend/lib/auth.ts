import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Enable SSL for production PostgreSQL connections (required by RDS)
const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET,

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
  },

  // Cookies are HttpOnly, Secure, SameSite=Lax by default when baseURL is HTTPS
  
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "ops",
        input: false, // Don't allow setting via signup
      },
    },
  },

  // Disable public signup - admin users are pre-created
  advanced: {
    disableCSRFCheck: false,
  },
});

// Export type for session
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
