import fs from "fs";

const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";

const STATUS_PATH = "./public/status.json";
const HISTORY_PATH = "./public/history.json";
const COMPONENT_HISTORY_PATH = "./public/component-history.json";

const MAX_HISTORY_ENTRIES = 100;
const MAX_COMPONENT_ENTRIES = 50;

// ---------------- Helper Functions ----------------

function readJSON(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function normalizeStatus(raw) {
  switch (raw) {
    case "operational":
      return "OPERATIONAL";
    case "degraded_performance":
      return "DEGRADED";
    case "partial_outage":
      return "PARTIAL_OUTAGE";
    case "major_outage":
      return "MAJOR_OUTAGE";
    case "under_maintenance":
      return "MAINTENANCE";
    default:
      return "UNKNOWN";
  }
}

function isOutage(status) {
  return status !== "OPERATIONAL";
}

// ---------------- Main Update Function ----------------

async function updateStatus() {
  const res = await fetch(STATUS_URL);
  if (!res.ok) throw new Error("Failed to fetch Epic status");

  const data = await res.json();
  const now = new Date().toISOString();

  const incidents = data.incidents || [];
  const components = data.components || [];

  // Normalize component statuses
  const affectedComponents = components
    .filter(c => normalizeStatus(c.status) !== "OPERATIONAL")
    .map(c => ({
      name: c.name,
      status: normalizeStatus(c.status)
    }));

  const allOperational = affectedComponents.length === 0 && incidents.length === 0;

  const status = allOperational ? "OPERATIONAL" : "ISSUES";
  const message = allOperational ? "All Systems Operational" : "Issues Detected";

  // ---------------- Load Previous State ----------------

  const previousStatus = readJSON(STATUS_PATH, null);
  const history = readJSON(HISTORY_PATH, []);
  const componentHistory = readJSON(COMPONENT_HISTORY_PATH, {});

  // ---------------- Compute lastChanged ----------------

  const lastChanged =
    incidents
      .map(i => i.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1)
    ?? previousStatus?.lastChanged
    ?? now;

  // ---------------- Global History & Downtime Duration ----------------

  let globalChanged =
    !previousStatus ||
    previousStatus.status !== status ||
    JSON.stringify(previousStatus.affectedComponents) !==
      JSON.stringify(affectedComponents);

  if (history.length > 0) {
    const lastGlobal = history[0];
    // Close previous global outage if status changed
    if (lastGlobal.endedAt === null && lastGlobal.status !== status) {
      lastGlobal.endedAt = now;
      lastGlobal.durationSeconds =
        (new Date(lastGlobal.endedAt) - new Date(lastGlobal.startedAt)) / 1000;
    }
  }

  if (globalChanged) {
    history.unshift({
      status,
      message,
      affectedComponents,
      startedAt: now,
      endedAt: null,
      durationSeconds: null
    });
    history.splice(MAX_HISTORY_ENTRIES);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  }

  // ---------------- Component History & Outage Duration ----------------

  for (const component of components) {
    const name = component.name;
    const currentState = normalizeStatus(component.status);

    if (!componentHistory[name]) {
      componentHistory[name] = [];
    }

    const timeline = componentHistory[name];
    const lastEntry = timeline[0];

    // Close previous outage if state changed
    if (lastEntry && lastEntry.endedAt === null && lastEntry.status !== currentState) {
      lastEntry.endedAt = now;
      lastEntry.durationSeconds =
        (new Date(lastEntry.endedAt) - new Date(lastEntry.startedAt)) / 1000;
    }

    // Record new entry if changed
    if (!lastEntry || lastEntry.status !== currentState) {
      timeline.unshift({
        status: currentState,
        startedAt: now,
        endedAt: null,
        durationSeconds: null
      });

      timeline.splice(MAX_COMPONENT_ENTRIES);
    }
  }

  fs.writeFileSync(COMPONENT_HISTORY_PATH, JSON.stringify(componentHistory, null, 2));

  // ---------------- Write Current Status ----------------

  const currentStatus = {
    status,
    message,
    affectedComponents,
    incidents,
    lastChecked: now,
    lastChanged,
    normalized: true
  };

  fs.mkdirSync("./public", { recursive: true });
  fs.writeFileSync(STATUS_PATH, JSON.stringify(currentStatus, null, 2));

  console.log(
    globalChanged
      ? "Global + component history updated"
      : "Component history checked (no global change)"
  );
}

// ---------------- Run ----------------

updateStatus().catch(err => {
  console.error(err);
  process.exit(1);
});
