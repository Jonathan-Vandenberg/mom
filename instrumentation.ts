export async function register() {
  // Only run the cron in the Node.js server runtime (not edge, not build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { generateAndPublishArticle } = await import(
      "./lib/generate-article"
    );

    // Run every 12 hours
    cron.default.schedule("0 */12 * * *", async () => {
      console.log(`[cron] Scheduled run at ${new Date().toISOString()}`);
      try {
        const result = await generateAndPublishArticle();
        if (result.success) {
          console.log(`[cron] Success: ${result.title} (${result.slug})`);
        } else {
          console.error(`[cron] Failed: ${result.error}`);
        }
      } catch (err) {
        console.error("[cron] Unexpected error:", err);
      }
    });

    console.log("[cron] Article generation scheduled: every 12 hours");
  }
}
