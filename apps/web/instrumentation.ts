export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { hydrateFromPostgres } = await import("./lib/store");
      console.log("[Instrumentation] Hydrating data store from PostgreSQL...");
      await hydrateFromPostgres();
      console.log("[Instrumentation] PostgreSQL hydration complete.");
    } catch (err) {
      console.error("[Instrumentation] PostgreSQL hydration error:", err);
    }
  }
}
