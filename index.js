import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Resolve __dirname (ESM)
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Epic Games Status API
 */
const API_URL = "https://status.epicgames.com/api/v2/summary.json";

/**
 * Fortnite component IDs (LOCKED)
 * These are the only components that should affect Fortnite status.
 */
const FORTNITE_COMPONENT_IDS = new Set([
  "wgh5fg7c7dyj", // Fortnite
  "3ypsqsgg2zs3", // Fortnite Matchmaking
  "9p1hcl8z6zds", // Fortnite Login
  "h8l1m6p3f9gh", // Fortnite Parties / Social
  "m3r2d8f9k1qs"  // Fortnite Services
]);

/**
 * Output file
 */
const OUTPUT_PATH = path.join(__dirname, "public", "status.json");

async function updateStatus() {
  console.log("Fetching Fortnite status…");

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} – ${response.statusText}`);
  }

  const data = await response.json();

  /**
   * Filter to Fortnite-only components
   */
  const fortniteComponents = (data.components || []).filter(c =>
    FORTNITE_COMPONENT_IDS.has(c.id)
  );

  /**
   * Compute most recent update time
   */
  const lastChanged =
    fortniteComponents
      .map(c => c.updated_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  /**
   * Determine aggregate status
   */
  const hasIssues = fortniteComponents.some(
    c => c.status !== "operational"
  );

  const result = {
    status: hasIssues ? "ISSUES" : "OPERATIONAL",
    message: hasIssues
      ? "Issues Detected"
      : "All Systems Operational",
    components: fortniteComponents,
    lastChecked: new Date().toISOString(),
    lastChanged
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log("Fortnite status updated successfully");
}

updateStatus().catch(err => {
  console.error("Updater failed:");
  console.error(err);
  process.exit(1);
});
