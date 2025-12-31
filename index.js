import fs from "fs";

const API_URL = "https://status.epicgames.com/api/v2/components.json";

async function run() {
  const res = await fetch(API_URL, {
    headers: {
      "User-Agent": "Fortnite-Status-Tracker"
    }
  });

  if (!res.ok) {
    throw new Error(`API failed: ${res.status}`);
  }

  const data = await res.json();

  const fortnite = data.components.find(c =>
    c.name.toLowerCase().includes("fortnite")
  );

  const status = fortnite?.status || "unknown";

  const output = {
    service: "Fortnite",
    status,
    updated_at: new Date().toISOString()
  };

  const badge = {
    schemaVersion: 1,
    label: "Fortnite",
    message: status.replace("_", " "),
    color:
      status === "operational"
        ? "brightgreen"
        : status === "degraded_performance"
        ? "yellow"
        : "red"
  };

  fs.mkdirSync("public", { recursive: true });

  fs.writeFileSync("public/status.json", JSON.stringify(output, null, 2));
  fs.writeFileSync("public/status-badge.json", JSON.stringify(badge, null, 2));

  console.log("Status updated:", status);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
