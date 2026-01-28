import { createAuthClient } from "better-auth/react";

// Auth client for server-side session validation
// Points to the backend API for authentication
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const auth = createAuthClient({
  baseURL: `${apiUrl}/api/auth`,
  fetchOptions: {
    credentials: "include", // Required for cross-origin cookie handling
  },
});

// Re-export for convenience
export const { getSession, useSession } = auth;
