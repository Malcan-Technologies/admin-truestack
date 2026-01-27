"use client";

import { createAuthClient } from "better-auth/react";

// Admin app uses the backend API for authentication
// The API_URL should point to the backend service
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const authClient = createAuthClient({
  baseURL: apiUrl ? `${apiUrl}/api/auth` : undefined,
});

export const { signIn, signOut, useSession } = authClient;
