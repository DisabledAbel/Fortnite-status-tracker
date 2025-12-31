import fs from "fs";

const API_URL = "https://status.epicgames.com/api/v2/summary.json";

function getFortniteComponents(components = []) {
  return components.filter(c =>
    c.name.toLowerCase().includes("fortnite")
  );
}

function getFortniteIncidents(incidents = []) {
  return incidents.filter(i =>
    i.name.toLowerCase().includes("fortnite")
  );
}

function computeStatus(components) {
  return components.some(c => c.status !== "operational")
    ? "ISSUE"
    : "NONE";
}

function getLastChanged(items = []) {
  const timestamps = items
    .map(i => new Date(i.updated_at).getTime())
    .filter(Boolean);

  return timestamps.length
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;
}

async function run() {
  const res = await fetch(API_URL, {
    headers: {
      "User-Agent": "Fortnite-Status-Tracker"
    }
  });

  if (!res.ok) {
    throw new Error(`Epic API error: ${res.status}`);
  }

  const data = await res.json();

  const fortniteComponents = getFortniteComponents(data.components);
  const fortniteIncidents = getFortniteIncidents(data.incidents);

  const status = computeStatus(fortniteComponents);

  const output = {
    /* ================= REQUIRED FIELDS ================= */

    status,
    incidents: fortniteIncidents.map(i => ({
      id: i.id,
      name: i.name,
      status: i.status,
      impact: i.impact,
      created_at: i.created_at,
      updated_at: i.updated_at,
      monitoring_at: i.monitoring_at,
      resolved_at: i.resolved_at,
      shortlink: i.shortlink,
      updates: i.incident_updates
    })),
    message:
      status === "NONE"
        ? "All Systems Operational"
        : "Service Disruption Detected",
    lastChecked: new Date().toISOString(),
    lastChanged: getLastChanged([
      ...fortniteComponents,
      ...fortniteIncidents
    ]),

    /* ================= EXTENDED DATA ================= */

    components: fortniteComponents.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      description: c.description,
      created_at: c.created_at,
      updated_at: c.updated_at,
      position: c.position,
      group_id: c.group_id,
      page_id: c.page_id
    })),

    epic: {
      page: data.page,
      scheduled_maintenances: data.scheduled_maintenances,
      status: data.status,
      updated_at: data.page?.updated_at
    },

    raw: {
      components: data.components,
      incidents: data.incidents,
      scheduled_maintenances: data.scheduled_maintenances
    }
  };

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/status.json",
    JSON.stringify(output, null, 2)
  );

  console.log(
    `[OK] Fortnite status updated → ${status}`
  );
}

run().catch(err => {
  console.error("[ERROR]", err);
  process.exit(1);
});
