import fetch from "node-fetch";
import fs from "fs";

const STATUS_URL = "https://status.epicgames.com/api/v2/summary.json";

export async function getFortniteStatus() {
  const res = await fetch(STATUS_URL);
  const data = await res.json();

  const status = {
    overall_status: data.status.description,
    services: {},
    last_checked: new Date().toISOString(),
    source: STATUS_URL
  };

  data.components.forEach(c => status.services[c.name] = c.status);
  return status;
}

export async function saveStatusToFile(filename = "status.json") {
  const status = await getFortniteStatus();
  fs.writeFileSync(filename, JSON.stringify(status, null, 2));
  return status;
}

export async function saveBadgeJson(filename = "status-badge.json") {
  const status = await getFortniteStatus();
  let color = "lightgrey";
  let message = status.overall_status.toUpperCase();

  if (status.overall_status.includes("Operational")) {
    color = "brightgreen"; message = "ONLINE";
  } else if (status.overall_status.includes("Degraded")) {
    color = "yellow"; message = "DEGRADED";
  } else {
    color = "red"; message = "OFFLINE";
  }

  const badge = { schemaVersion: 1, label: "Fortnite", message, color };
  fs.writeFileSync(filename, JSON.stringify(badge, null, 2));
  return badge;
}

// Direct run
if (process.argv[1] === new URL(import.meta.url).pathname) {
  (async () => {
    await saveStatusToFile();
    await saveBadgeJson();
    console.log("Status and badge JSON saved");
  })();
}
