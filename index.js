import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Resolve __dirname in ESM
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Epic Games Status API
 */
const API_URL = "https://status.epicgames.com/api/v2/summary.json";

/**
 * Output file
 */
const OUTPUT_PATH = path.join(__dirname, "public", "status.json");

async function updateStatus() {
  console.log("Fetching Fortnite status...");

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} – ${response.statusText}`);
  }

  const data = await response.json();

  const result = {
    status: data.status?.indicator ?? "NONE",
    message: data.status?.description ?? "Unknown",
    incidents: data.incidents ?? [],
    components: data.components ?? [],
    lastChecked: new Date().toISOString(),
    lastChanged:
      data.incidents?.[0]?.updated_at ??
      data.components?.[0]?.updated_at ??
      null
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log("Status updated successfully");
}

updateStatus().catch(err => {
  console.error("Updater failed:");
  console.error(err);
  process.exit(1);
});
