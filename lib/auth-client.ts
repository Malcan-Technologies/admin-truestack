"use client";

import { createAuthClient } from "better-auth/react";

// Use relative URL for same-origin requests - this works in all environments
// The browser will automatically resolve "/api/auth" relative to the current origin
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export const { signIn, signOut, useSession } = authClient;
