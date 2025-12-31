const STATUS_URL = "/status.json";

const globalEl = document.getElementById("global");
const modesEl = document.getElementById("modes");

function badge(status) {
  return status === "NONE"
    ? `<span class="ok">Operational</span>`
    : `<span class="issue">Issues Detected</span>`;
}

function formatDate(value) {
  if (!value) return "Unknown";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
}

async function loadStatus() {
  try {
    const res = await fetch(STATUS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Bad response");

    const data = await res.json();

    /* ---------- GLOBAL ---------- */

    globalEl.innerHTML = `
      <h2>${badge(data.status)}</h2>
      <div>${data.message || "Status unavailable"}</div>
      <div class="muted">
        Last Checked: ${formatDate(data.lastChecked)}<br />
        Last Changed: ${formatDate(data.lastChanged)}
      </div>
    `;

    /* ---------- MODES ---------- */

    modesEl.innerHTML = "";

    const modes = data.modes || {};
    for (const [key, mode] of Object.entries(modes)) {
      const title =
        key.charAt(0).toUpperCase() + key.slice(1);

      modesEl.innerHTML += `
        <div class="card">
          <h2>${title}: ${badge(mode.status)}</h2>
          <div>${mode.message || "Unknown"}</div>
          <div class="muted">
            Last Changed: ${formatDate(mode.lastChanged)}
          </div>
        </div>
      `;
    }
  } catch (err) {
    /* ---------- FALLBACK ---------- */

    globalEl.innerHTML = `
      <h2 class="issue">Status Unavailable</h2>
      <div>Unable to fetch server status.</div>
      <div class="muted">
        This may be a temporary network or API issue.
      </div>
    `;
  }
}

loadStatus();
setInterval(loadStatus, 60_000);
