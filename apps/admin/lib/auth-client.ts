"use client";

import { createAuthClient } from "better-auth/react";

// Admin app uses the backend API for authentication
// The API_URL should point to the backend service
// Default to localhost:3001 for local development
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: `${apiUrl}/api/auth`,
});

export const { signIn, signOut, useSession } = authClient;
