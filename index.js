import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";

const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";
const OUTPUT_FILE = "public/status.json";

async function run() {
  try {
    const res = await fetch(STATUS_URL, {
      headers: { "User-Agent": "Fortnite-Status-Tracker" }
    });

    if (!res.ok) {
      throw new Error(`Epic API returned ${res.status}`);
    }

    const data = await res.json();

    const components = data.components.map(c => ({
      name: c.name,
      status: normalizeStatus(c.status),
      lastChanged: c.updated_at
        ? new Date(c.updated_at).toISOString()
        : "Unknown"
    }));

    const output = {
      status: normalizeStatus(data.status.description),
      message: data.status.description,
      lastChecked: new Date().toISOString(),
      lastChanged: data.page.updated_at
        ? new Date(data.page.updated_at).toISOString()
        : "Unknown",
      components
    };

    const newJson = JSON.stringify(output, null, 2);
    const newHash = hash(newJson);

    let oldHash = null;
    if (fs.existsSync(OUTPUT_FILE)) {
      const oldJson = fs.readFileSync(OUTPUT_FILE, "utf8");
      oldHash = hash(oldJson);
    }

    if (newHash === oldHash) {
      console.log("ℹ️ No status change detected — skipping commit");
      process.exit(0);
    }

    fs.mkdirSync("public", { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, newJson);

    console.log("✅ Status changed — file updated");
  } catch (err) {
    console.error("❌ Failed to update status:", err.message);
    process.exit(1);
  }
}

function normalizeStatus(value) {
  if (!value) return "UNKNOWN";
  return value.toString().toUpperCase();
}

function hash(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

run();
