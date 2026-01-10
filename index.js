import fs from "fs";
import fetch from "node-fetch";

const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";

const STATUS_PATH = "./public/status.json";
const HISTORY_PATH = "./public/history.json";
const COMPONENT_HISTORY_PATH = "./public/component-history.json";

const MAX_HISTORY_ENTRIES = 100;
const MAX_COMPONENT_ENTRIES = 50;

function readJSON(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

async function updateStatus() {
  const res = await fetch(STATUS_URL);
  if (!res.ok) throw new Error("Failed to fetch Epic status");

  const data = await res.json();
  const now = new Date().toISOString();

  const incidents = data.incidents || [];
  const components = data.components || [];

  const affectedComponents = components
    .filter(c => c.status !== "operational")
    .map(c => ({
      name: c.name,
      status: c.status
    }));

  const allOperational =
    affectedComponents.length === 0 && incidents.length === 0;

  const status = allOperational ? "OPERATIONAL" : "ISSUES";
  const message = allOperational
    ? "All Systems Operational"
    : "Issues Detected";

  let lastChanged = now;
  if (incidents.length > 0) {
    lastChanged = incidents
      .map(i => i.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) || now;
  }

  const currentStatus = {
    status,
    message,
    affectedComponents,
    incidents,
    lastChecked: now,
    lastChanged
  };

  fs.mkdirSync("./public", { recursive: true });

  // ---------------- GLOBAL HISTORY ----------------

  const history = readJSON(HISTORY_PATH, []);
  const previousStatus = readJSON(STATUS_PATH, null);

  const globalChanged =
    !previousStatus ||
    previousStatus.status !== status ||
    JSON.stringify(previousStatus.affectedComponents) !==
      JSON.stringify(affectedComponents);

  if (globalChanged) {
    history.unshift({
      timestamp: now,
      status,
      message,
      affectedComponents
    });
    history.splice(MAX_HISTORY_ENTRIES);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  }

  // ---------------- COMPONENT HISTORY ----------------

  const componentHistory = readJSON(COMPONENT_HISTORY_PATH, {});
  const previousComponents = previousStatus?.affectedComponents || [];

  for (const component of components) {
    const name = component.name;
    const currentState = component.status;

    if (!componentHistory[name]) {
      componentHistory[name] = [];
    }

    const timeline = componentHistory[name];
    const lastEntry = timeline[0];

    // Write only on state change
    if (!lastEntry || lastEntry.status !== currentState) {
      timeline.unshift({
        timestamp: now,
        status: currentState
      });

      timeline.splice(MAX_COMPONENT_ENTRIES);
    }
  }

  fs.writeFileSync(
    COMPONENT_HISTORY_PATH,
    JSON.stringify(componentHistory, null, 2)
  );

  fs.writeFileSync(STATUS_PATH, JSON.stringify(currentStatus, null, 2));

  console.log(
    globalChanged
      ? "Global + component history updated"
      : "Component history checked (no global change)"
  );
}

updateStatus().catch(err => {
  console.error(err);
  process.exit(1);
});
