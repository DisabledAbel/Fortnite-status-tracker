import fs from "fs";

const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";

const PUBLIC_DIR = "./public";
const STATUS_PATH = `${PUBLIC_DIR}/status.json`;
const BADGE_PATH = `${PUBLIC_DIR}/status-badge.json`;
const HISTORY_PATH = `${PUBLIC_DIR}/history.json`;

function normalizeStatus(indicator) {
  switch (indicator) {
    case "none": return "OPERATIONAL";
    case "minor": return "DEGRADED";
    case "major":
    case "critical": return "OUTAGE";
    default: return "UNKNOWN";
  }
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
    const currentStatus = normalizeStatus(data.status?.indicator);
    const message = data.status?.description ?? "Unknown";

    // ----- Global status -----
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

      if (history.components[c.name].status !== status) {
        history.components[c.name].lastChanged = nowIso;
        history.components[c.name].status = status;
      }

      let compDowntime = 0;
      if (status !== "OPERATIONAL") {
        if (!history.components[c.name].downSince) history.components[c.name].downSince = nowIso;
        compDowntime = Math.floor((now - new Date(history.components[c.name].downSince)) / 1000);
      } else {
        history.components[c.name].downSince = null;
      }

      components[c.name] = {
        status,
        rawStatus: c.status,
        updatedAt: c.updated_at ?? null,
        lastChanged: history.components[c.name].lastChanged,
        downtimeSeconds: compDowntime
      };
    }

    // ----- Write JSON files -----
    const statusJson = {
      status: currentStatus,
      message,
      lastChecked: nowIso,
      lastChanged: history.global.lastChanged,
      downtimeSeconds,
      components
    };

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

    fs.writeFileSync(STATUS_PATH, JSON.stringify(statusJson, null, 2));
    fs.writeFileSync(BADGE_PATH, JSON.stringify(badgeJson, null, 2));
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
