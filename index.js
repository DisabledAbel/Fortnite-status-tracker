import fs from "fs";

const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";

const PUBLIC_DIR = "./public";
const STATUS_PATH = `${PUBLIC_DIR}/status.json`;
const BADGE_PATH = `${PUBLIC_DIR}/status-badge.json`;
const HISTORY_PATH = `${PUBLIC_DIR}/history.json`;

function normalizeStatus(indicator) {
  switch (indicator) {
    case "none":
      return "OPERATIONAL";
    case "minor":
      return "DEGRADED";
    case "major":
    case "critical":
      return "OUTAGE";
    default:
      return "UNKNOWN";
  }
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

async function fetchEpicStatus() {
  const res = await fetch(STATUS_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Epic API error: ${res.status}`);
  }
  return res.json();
}

async function main() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const now = new Date();
  const nowIso = now.toISOString();
  const history = loadHistory();

  try {
    const data = await fetchEpicStatus();

    const globalStatus = normalizeStatus(data.status?.indicator);
    const message = data.status?.description ?? "Unknown";

    // ---- Downtime tracking (global) ----
    let downtimeSeconds = 0;

    if (globalStatus !== "OPERATIONAL") {
      if (!history.downSince) {
        history.downSince = nowIso;
      }
      downtimeSeconds = Math.floor(
        (now - new Date(history.downSince)) / 1000
      );
    } else {
      history.downSince = null;
    }

    // ---- Component tracking ----
    const components = {};

    for (const c of data.components ?? []) {
      const status = normalizeStatus(c.status);

      if (!history.components) history.components = {};
      if (!history.components[c.name]) {
        history.components[c.name] = { downSince: null };
      }

      let componentDowntime = 0;

      if (status !== "OPERATIONAL") {
        if (!history.components[c.name].downSince) {
          history.components[c.name].downSince = nowIso;
        }
        componentDowntime = Math.floor(
          (now - new Date(history.components[c.name].downSince)) / 1000
        );
      } else {
        history.components[c.name].downSince = null;
      }

      components[c.name] = {
        status,
        rawStatus: c.status,
        updatedAt: c.updated_at ?? null,
        downtimeSeconds: componentDowntime
      };
    }

    const statusJson = {
      status: globalStatus,
      message,
      lastChecked: nowIso,
      downtimeSeconds,
      components
    };

    const badgeJson = {
      schemaVersion: 1,
      label: "Fortnite Status",
      message: globalStatus,
      color:
        globalStatus === "OPERATIONAL"
          ? "brightgreen"
          : globalStatus === "DEGRADED"
          ? "yellow"
          : globalStatus === "OUTAGE"
          ? "red"
          : "lightgrey"
    };

    fs.writeFileSync(STATUS_PATH, JSON.stringify(statusJson, null, 2));
    fs.writeFileSync(BADGE_PATH, JSON.stringify(badgeJson, null, 2));
    saveHistory(history);

    console.log("✅ Status + downtime updated");
  } catch (err) {
    const errorJson = {
      status: "ERROR",
      message: "Unable to fetch Epic Games status",
      error: err.message,
      lastChecked: nowIso
    };

    fs.writeFileSync(STATUS_PATH, JSON.stringify(errorJson, null, 2));
    console.error("❌ Update failed:", err.message);
    process.exitCode = 1;
  }
}

main();
