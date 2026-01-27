import { createAuthClient } from "better-auth/react";

// Auth client for session validation
// Points to the backend API for authentication
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const auth = createAuthClient({
  baseURL: `${apiUrl}/api/auth`,
});

// Re-export for convenience
export const { getSession, useSession } = auth;
