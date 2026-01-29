export async function register() {
  // Only run on server (not during build or edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import to avoid issues during build
    const { initializeCronJobs } = await import("./lib/cron");
    
    // Initialize cron jobs
    initializeCronJobs();
  }
}
