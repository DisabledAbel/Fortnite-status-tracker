import fs from "fs";

// Epic Games status API
const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";

const PUBLIC_DIR = "./public";
const STATUS_PATH = `${PUBLIC_DIR}/status.json`;
const BADGE_PATH = `${PUBLIC_DIR}/status-badge.json`;
const HISTORY_PATH = `${PUBLIC_DIR}/history.json`;

// ----------------- Helper -----------------
function normalizeStatus(indicator) {
  if (!indicator) return "UNKNOWN";
  const val = indicator.toLowerCase();
  if (val === "none" || val === "operational") return "OPERATIONAL";
  if (val === "minor") return "DEGRADED";
  if (val === "major" || val === "critical") return "OUTAGE";
  return "UNKNOWN";
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) {
    return { global: { status: null, lastChanged: null, downSince: null }, components: {} };
  }
  const h = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  h.global = h.global || { status: null, lastChanged: null, downSince: null };
  h.components = h.components || {};
  return h;
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

// ----------------- Main -----------------
async function fetchEpicStatus() {
  const res = await fetch(STATUS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Epic API error: ${res.status}`);
  return res.json();
}

async function main() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const now = new Date();
  const nowIso = now.toISOString();
  const history = loadHistory();

  try {
    const data = await fetchEpicStatus();

    // ----- Global Status -----
    const currentStatus = normalizeStatus(data.status?.indicator);
    const message = data.status?.description ?? "Unknown";

    if (history.global.status !== currentStatus) {
      history.global.lastChanged = nowIso;
      history.global.status = currentStatus;
    }

    let downtimeSeconds = 0;
    if (currentStatus !== "OPERATIONAL") {
      if (!history.global.downSince) history.global.downSince = nowIso;
      downtimeSeconds = Math.floor((now - new Date(history.global.downSince)) / 1000);
    } else {
      history.global.downSince = null;
    }

    // ----- Components -----
    const components = {};
    for (const c of data.components ?? []) {
      const status = normalizeStatus(c.status);
      if (!history.components[c.name]) history.components[c.name] = { status: null, lastChanged: null, downSince: null };

      // Track lastChanged
      if (history.components[c.name].status !== status) {
        history.components[c.name].lastChanged = nowIso;
        history.components[c.name].status = status;
      }

      // Track downtime
      let compDowntime = 0;
      if (status !== "OPERATIONAL") {
        if (!history.components[c.name].downSince) history.components[c.name].downSince = nowIso;
        compDowntime = Math.floor((now - new Date(history.components[c.name].downSince)) / 1000);
      } else {
        history.components[c.name].downSince = null;
      }

      components[c.name] = {
        status,
        rawStatus: c.status ?? "unknown",
        updatedAt: c.updated_at ?? null,
        lastChanged: history.components[c.name].lastChanged,
        downtimeSeconds: compDowntime
      };
    }

    // ----- Write status.json -----
    const statusJson = {
      status: currentStatus,
      message,
      lastChecked: nowIso,
      lastChanged: history.global.lastChanged,
      downtimeSeconds,
      components
    };

    fs.writeFileSync(STATUS_PATH, JSON.stringify(statusJson, null, 2));

    // ----- Write badge JSON -----
    const badgeJson = {
      schemaVersion: 1,
      label: "Fortnite Status",
      message: currentStatus,
      color:
        currentStatus === "OPERATIONAL" ? "brightgreen"
        : currentStatus === "DEGRADED" ? "yellow"
        : currentStatus === "OUTAGE" ? "red"
        : "lightgrey"
    };

    fs.writeFileSync(BADGE_PATH, JSON.stringify(badgeJson, null, 2));

    // Save history
    saveHistory(history);

    console.log("✅ Status and history updated successfully");

  } catch (err) {
    fs.writeFileSync(STATUS_PATH, JSON.stringify({
      status: "ERROR",
      message: "Unable to fetch Epic Games status",
      error: err.message,
      lastChecked: nowIso
    }, null, 2));

    console.error("❌ Update failed:", err.message);
    process.exitCode = 1;
  }
}

main();
