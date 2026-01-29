import cron from "node-cron";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
// Use BETTER_AUTH_URL in production (set in ECS), fallback to NEXT_PUBLIC_API_URL or localhost
const BASE_URL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Initialize cron jobs for the backend.
 * 
 * Monthly invoice generation:
 * - Runs at 1:00 AM MYT on the 1st of each month
 * - Generates invoices for all active clients for the previous month
 */
export function initializeCronJobs() {
  if (!INTERNAL_API_KEY) {
    console.warn("[Cron] INTERNAL_API_KEY not set, skipping cron job initialization");
    return;
  }

  // Run at 1:00 AM MYT on 1st of each month
  // Cron format: minute hour day month dayOfWeek
  const task = cron.schedule(
    "0 1 1 * *",
    async () => {
      console.log("[Cron] Starting monthly invoice generation...");
      
      try {
        const response = await fetch(`${BASE_URL}/api/internal/cron/generate-invoices`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${INTERNAL_API_KEY}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("[Cron] Invoice generation failed:", error);
          return;
        }

        const result = await response.json();
        console.log("[Cron] Invoice generation completed:", result);
      } catch (error) {
        console.error("[Cron] Invoice generation error:", error);
      }
    },
    {
      timezone: "Asia/Kuala_Lumpur",
    }
  );

  console.log("[Cron] Monthly invoice generation scheduled (1st of each month at 1:00 AM MYT)");
  
  return task;
}

// Export for manual triggering in development
export async function triggerMonthlyInvoices() {
  if (!INTERNAL_API_KEY) {
    throw new Error("INTERNAL_API_KEY not configured");
  }

  const response = await fetch(`${BASE_URL}/api/internal/cron/generate-invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${INTERNAL_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
