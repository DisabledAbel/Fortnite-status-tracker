# Fortnite Status Tracker

This project automatically monitors the live operational status of **Fortnite** using a scheduled GitHub Action and publishes updated JSON files and status badges. It is designed to be lightweight, reliable, and fast, updating every 3 minutes with no skipped runs.

The tracker generates:
- `status.json` — Machine-readable Fortnite server status  
- `status-badge.json` — A badge-compatible status file  
- Automatic commits when the status changes  

You can also deploy the JSON output as a public API using **Vercel**.

---

## Features

- Runs **every 3 minutes** without any skipped or cancelled runs
- Fully automated using GitHub Actions
- Exports Fortnite status as JSON
- Can be deployed serverlessly on **Vercel**
- Works as a simple status API for apps, dashboards, bots, or embeds

---

## How It Works

1. A GitHub Action runs every 3 minutes.
2. It executes `index.js`, which fetches Fortnite’s current status.
3. If any changes are detected, the workflow commits updated files back to the repository.
4. If deployed to Vercel, the repository serves:
   - `/status.json`  
   - `/status-badge.json`  
   as publicly accessible API endpoints.

---

## How to Access the Status JSON

The primary output of this project is a **public JSON endpoint** that always reflects the current Fortnite service status.

### ✅ Status JSON Endpoint (Use This)

```bash
https://your-project.vercel.app/status.json
```


## One-Click Deploy to Vercel

Deploy this tracker instantly using the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/import?repository-name=Fortnite-status-tracker&s=https%3A%2F%2Fgithub.com%2FDisabledAbel%2FFortnite-status-tracker)

License
MIT License
You are free to use, modify, and distribute this tracker.
