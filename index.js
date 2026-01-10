import fs from "fs";
import fetch from "node-fetch";

const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";
const OUTPUT_PATH = "./public/status.json";

async function updateStatus() {
  const res = await fetch(STATUS_URL);
  if (!res.ok) throw new Error("Failed to fetch Epic status");

  const data = await res.json();

  const now = new Date().toISOString();

  const incidents = data.incidents || [];
  const components = data.components || [];

  const affected = components.filter(
    c => c.status !== "operational"
  );

  const allOperational = affected.length === 0 && incidents.length === 0;

  // ✅ FIX: Always compute lastChanged
  let lastChanged;

  if (incidents.length > 0) {
    lastChanged = incidents
      .map(i => i.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1);
  }

  // Fallback when no incidents exist
  if (!lastChanged) {
    lastChanged = now;
  }

  const output = {
    status: allOperational ? "OPERATIONAL" : "ISSUES",
    message: allOperational
      ? "All Systems Operational"
      : "Issues Detected",
    affectedComponents: affected.map(c => ({
      name: c.name,
      status: c.status
    })),
    incidents,
    lastChecked: now,
    lastChanged
  };

  fs.mkdirSync("./public", { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log("Status updated successfully");
}

updateStatus().catch(err => {
  console.error(err);
  process.exit(1);
});
