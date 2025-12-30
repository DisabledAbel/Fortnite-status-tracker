import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function FortniteStatusDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [history, setHistory] = useState([]);

  async function loadStatus() {
    try {
      setLoading(true);
      const res = await fetch("/status.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load status");
      const data = await res.json();
      setStatus(data);
      setHistory(prev => [...prev.slice(-29), { time: new Date().toLocaleTimeString(), up: Object.values(data.services || {}).filter(v => String(v).toLowerCase().includes("operational")).length }]);
      setLastUpdated(new Date().toLocaleString());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  function statusColor(value) {
    if (!value) return "secondary";
    const v = value.toLowerCase();
    if (v.includes("operational") || v.includes("up")) return "success";
    if (v.includes("degraded") || v.includes("partial")) return "warning";
    return "destructive";
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Fortnite Service Status</h1>
          <button
            onClick={loadStatus}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </header>

        {loading && <p className="opacity-70">Loading status…</p>}
        {error && <p className="text-red-500">{error}</p>}

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(status.services || {}).map(([name, value]) => (
              <Card key={name} className="bg-zinc-900 border-zinc-800 rounded-2xl">
                <CardContent className="p-5">
                  <h2 className="text-lg font-semibold mb-2 capitalize">
                    {name.replace(/_/g, " ")}
                  </h2>
                  <Badge variant={statusColor(String(value))}>
                    {String(value)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 h-64">
          <h2 className="text-xl font-semibold mb-2">Uptime Trend</h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <XAxis dataKey="time" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="up" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <footer className="mt-8 text-sm opacity-60">
          Last updated: {lastUpdated || "—"}
        </footer>
      </div>
    </div>
  );
}
