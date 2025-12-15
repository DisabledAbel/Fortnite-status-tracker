import fs from "fs";
import path from "path";
import crypto from "crypto";

const STATUS_FILE = "public/status.json";
const STATUS_DIR = path.dirname(STATUS_FILE);

function hash(obj) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("hex");
}

// Ensure directory exists
if (!fs.existsSync(STATUS_DIR)) {
  fs.mkdirSync(STATUS_DIR, { recursive: true });
}

async function run() {
  const now = new Date().toISOString();

  const response = await fetch("https://status.epicgames.com/api/v2/summary.json");
  const data = await response.json();

  const newStatusCore = {
    status: data.status.indicator.toUpperCase(),
    incidents: data.incidents ?? [],
    message: data.status.description
  };

  let existing = null;

  if (fs.existsSync(STATUS_FILE)) {
    existing = JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
  }

  const oldHash = existing
    ? hash({
        status: existing.status,
        incidents: existing.incidents,
        message: existing.message
      })
    : null;

  const newHash = hash(newStatusCore);

  if (oldHash === newHash && existing) {
    existing.lastChecked = now;
    fs.writeFileSync(STATUS_FILE, JSON.stringify(existing, null, 2));
    console.log("No status change detected");
    return;
  }

  const output = {
    ...newStatusCore,
    lastChecked: now,
    lastChanged: now
  };

  fs.writeFileSync(STATUS_FILE, JSON.stringify(output, null, 2));
  console.log("Status change detected and saved");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
