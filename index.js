import fs from "fs";

const API_URL = "https://status.epicgames.com/api/v2/summary.json";

/* ---------- HELPERS ---------- */

function normalize(str) {
  return str.toLowerCase();
}

function isOperational(components) {
  return components.every(c => c.status === "operational");
}

function lastChanged(items = []) {
  const times = items
    .map(i => new Date(i.updated_at).getTime())
    .filter(Boolean);

  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

function mapMode(name, components) {
  const relevant = components.filter(c =>
    normalize(c.name).includes(name)
  );

  return {
    status: isOperational(relevant) ? "NONE" : "ISSUE",
    message: isOperational(relevant)
      ? "Operational"
      : "Issues Detected",
    lastChanged: lastChanged(relevant),
    components: relevant.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      updated_at: c.updated_at
    }))
  };
}

/* ---------- MAIN ---------- */

async function run() {
  const res = await fetch(API_URL, {
    headers: { "User-Agent": "Fortnite-Status-Tracker" }
  });

  if (!res.ok) throw new Error(`Epic API error ${res.status}`);

  const data = await res.json();

  const fortniteComponents = data.components.filter(c =>
    normalize(c.name).includes("fortnite")
  );

  const fortniteIncidents = data.incidents.filter(i =>
    normalize(i.name).includes("fortnite")
  );

  const globalStatus = isOperational(fortniteComponents)
    ? "NONE"
    : "ISSUE";

  const output = {
    /* ===== REQUIRED (UNCHANGED) ===== */

    status: globalStatus,
    incidents: fortniteIncidents,
    message:
      globalStatus === "NONE"
        ? "All Systems Operational"
        : "Service Disruption Detected",
    lastChecked: new Date().toISOString(),
    lastChanged: lastChanged([
      ...fortniteComponents,
      ...fortniteIncidents
    ]),

    /* ===== MODE BREAKDOWN ===== */

    modes: {
      battleRoyale: mapMode("battle royale", fortniteComponents),
      creative: mapMode("creative", fortniteComponents),
      matchmaking: mapMode("matchmaking", fortniteComponents),
      services: mapMode("service", fortniteComponents)
    },

    /* ===== FULL DATA ===== */

    components: fortniteComponents,
    epic: {
      page: data.page,
      status: data.status,
      updated_at: data.page?.updated_at
    },
    raw: data
  };

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/status.json",
    JSON.stringify(output, null, 2)
  );

  console.log("[OK] Fortnite modes updated");
}

run().catch(err => {
  console.error("[ERROR]", err);
  process.exit(1);
});
