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
    return {
      global: {
        status: null,
        lastChanged: null,
        downSince: null
      },
      components: {}
    };
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

    const currentStatus = normalizeStatus(data.status?.indicator);
    const message = data.status?.description ?? "Unknown";

    // ---------- GLOBAL STATUS TRACKING ----------
    let lastChanged = history.global.lastChanged;

    if (history.global.status !== currentStatus) {
      lastChanged = nowIso;
      history.global.status = currentStatus;
      history.global.lastChanged = nowIso;
    }

    let downtimeSeconds = 0;

    if (currentStatus !== "OPERATIONAL") {
      if (!history.global.downSince) {
        history.global.downSince = nowIso;
      }
      downtimeSeconds = Math.floor(
        (now - new Date(history.global.downSince)) / 1000
      );
    } else {
      history.global.downSince = null;
    }

    // ---------- COMPONENT TRACKING ----------
    const components = {};

    for (const c of data.components ?? []) {
      const status = normalizeStatus(c.status);

      if (!history.components[c.name]) {
        history.components[c.name] = {
          status: null,
          lastChanged: null,
          downSince: null
        };
      }

      let componentLastChanged = history.components[c.name].lastChanged;

      if (history.components[c.name].status !== status) {
        componentLastChanged = nowIso;
        history.components[c.name].status = status;
        history.components[c.name].lastChanged = nowIso;
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
        lastChanged: componentLastChanged,
        downtimeSeconds: componentDowntime
      };
    }

    const statusJson = {
      status: currentStatus,
      message,
      lastChecked: nowIso,
      lastChanged,
      downtimeSeconds,
      components
    };

    const badgeJson = {
      schemaVersion: 1,
      label: "Fortnite Status",
      message: currentStatus,
      color:
        currentStatus === "OPERATIONAL"
          ? "brightgreen"
          : currentStatus === "DEGRADED"
          ? "yellow"
          : currentStatus === "OUTAGE"
          ? "red"
          : "lightgrey"
    };

    fs.writeFileSync(STATUS_PATH, JSON.stringify(statusJson, null, 2));
    fs.writeFileSync(BADGE_PATH, JSON.stringify(badgeJson, null, 2));
    saveHistory(history);

    console.log("✅ Status, history, and downtime updated");
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
