import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Malaysian timezone (GMT+8)
export const TIMEZONE = "Asia/Kuala_Lumpur";

/**
 * Parse a date string as UTC.
 * Database timestamps come without timezone suffix (e.g., "2026-01-28 10:00:00").
 * JavaScript's Date constructor interprets these as local time, which is incorrect.
 * This function ensures the timestamp is treated as UTC.
 */
function parseAsUTC(date: string | Date): Date {
  if (date instanceof Date) return date;
  
  // If already has timezone indicator, parse as-is
  if (date.endsWith("Z") || date.includes("+") || date.includes("-", 10)) {
    return new Date(date);
  }
  
  // Replace space with T and add Z suffix to treat as UTC
  const normalized = date.replace(" ", "T") + "Z";
  return new Date(normalized);
}

// Format date to Malaysian timezone
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = parseAsUTC(date);
  return d.toLocaleDateString("en-MY", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

// Format datetime to Malaysian timezone
export function formatDateTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = parseAsUTC(date);
  return d.toLocaleString("en-MY", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

// Format time only to Malaysian timezone
export function formatTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = parseAsUTC(date);
  return d.toLocaleTimeString("en-MY", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

// API client helper for making requests to the backend
// Default to localhost:3001 for local development
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${apiUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}
