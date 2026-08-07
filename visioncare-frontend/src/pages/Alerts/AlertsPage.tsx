import React, { useEffect, useMemo, useState } from "react";
import { detectionsApi } from "../../services/api";
import { PatientRequest } from "../../types";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Wifi,
  X,
} from "lucide-react";
import { NeedBadge, StatusBadge, GestureBadge, RiskBadge } from "../../components/UI/Badge";

function mapRaw(raw: any): PatientRequest {
  return {
    id:             raw.id,
    patientId:      raw.patient_id,
    patientName:    raw.patient_name,
    bedNumber:      raw.bed_number,
    need:           raw.need_type ?? raw.need,
    gestureType:    raw.gesture_type,
    confidence:     raw.confidence,
    timestamp:      new Date(raw.timestamp ?? raw.created_at),
    status:         raw.status ?? "pending",
    acknowledgedBy: raw.acknowledged_by,
    responseTimeMs: raw.response_time_ms,
  };
}

// ── Severity filter tabs ──────────────────────────────────────────────────────
const SEVERITY_TABS = [
  { key: "all",      label: "All"      },
  { key: "critical", label: "Critical" },
  { key: "warning",  label: "Warning"  },
  { key: "resolved", label: "Resolved" },
  { key: "pending",  label: "Pending"  },
];

// ── Row left border by risk ───────────────────────────────────────────────────
const RISK_ROW_BORDER: Record<string, string> = {
  critical: "border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-900/5",
  high:     "border-l-4 border-l-orange-400",
  medium:   "border-l-4 border-l-amber-400",
  low:      "border-l-4 border-l-slate-300 dark:border-l-slate-600",
};

export const AlertsPage: React.FC = () => {
  const [records,  setRecords]  = useState<PatientRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [severity, setSeverity] = useState("all");

  useEffect(() => {
    setLoading(true);
    detectionsApi
      .listRecent("", 100)
      .then((res) => { setRecords((res.data ?? []).map(mapRaw)); setError(null); })
      .catch(() => setError("Failed to load alerts. Check backend connection."))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(
    () => ({
      critical: records.filter((r) => (r.need === "emergency" || r.need === "pain") && r.status === "pending").length,
      warning:  records.filter((r) => r.status === "pending" && r.need !== "emergency" && r.need !== "pain").length,
      resolved: records.filter((r) => r.status === "completed").length,
      pending:  records.filter((r) => r.status === "pending").length,
    }),
    [records]
  );

  const getRisk = (r: PatientRequest): "critical" | "high" | "medium" | "low" => {
    if (r.need === "emergency" || r.need === "pain") return "critical";
    if (r.confidence > 0.85) return "high";
    if (r.confidence > 0.65) return "medium";
    return "low";
  };

  const filtered = records.filter((r) => {
    const matchSearch   = search === "" || r.patientName?.toLowerCase().includes(search.toLowerCase());
    const matchSeverity =
      severity === "all" ||
      (severity === "critical" && (r.need === "emergency" || r.need === "pain")) ||
      (severity === "warning"  && r.need !== "emergency" && r.need !== "pain") ||
      (severity === "resolved" && r.status === "completed") ||
      (severity === "pending"  && r.status === "pending");
    return matchSearch && matchSeverity;
  });

  // ── Summary stat cards ─────────────────────────────────────────────────────
  const summaryCards = [
    {
      key: "critical",
      label: "Critical",
      value: stats.critical,
      icon: <AlertTriangle size={22} />,
      gradient: "from-red-500 to-rose-600",
      light: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
      ring:  severity === "critical" ? "ring-2 ring-red-400 ring-offset-2 dark:ring-offset-slate-800" : "",
    },
    {
      key: "warning",
      label: "Warning",
      value: stats.warning,
      icon: <Bell size={22} />,
      gradient: "from-amber-400 to-orange-500",
      light: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      ring:  severity === "warning" ? "ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-800" : "",
    },
    {
      key: "resolved",
      label: "Resolved",
      value: stats.resolved,
      icon: <CheckCircle size={22} />,
      gradient: "from-emerald-400 to-teal-500",
      light: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
      ring:  severity === "resolved" ? "ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-800" : "",
    },
    {
      key: "pending",
      label: "Pending",
      value: stats.pending,
      icon: <Clock size={22} />,
      gradient: "from-slate-400 to-slate-500",
      light: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
      ring:  severity === "pending" ? "ring-2 ring-slate-400 ring-offset-2 dark:ring-offset-slate-800" : "",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-up">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Alerts</h1>
        <p className="page-subtitle">Alert management and response tracking</p>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <button
            key={c.key}
            onClick={() => setSeverity((prev) => prev === c.key ? "all" : c.key)}
            className={`card p-5 text-left transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer ${c.ring}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.light}`}>
              {c.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{c.value}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">
              {c.label} Alerts
            </p>
          </button>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-44">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            aria-label="Search alerts"
          />
        </div>

        {/* Severity pill tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SEVERITY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSeverity(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                severity === tab.key
                  ? "bg-primary-500 text-white shadow-orange"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {(search || severity !== "all") && (
            <button
              onClick={() => { setSearch(""); setSeverity("all"); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts table ────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full" aria-label="Alerts list">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/60">
                {["Patient", "Bed", "Alert Type", "Gesture", "Severity", "Confidence", "Time", "Source", "Status"].map(
                  (h) => <th key={h} className="table-header">{h}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <Bell size={24} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                          {search ? "No alerts match your search" : "No alerts found"}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                          {search ? "Try adjusting your search or filters" : "All systems are clear"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const risk = getRisk(r);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${RISK_ROW_BORDER[risk] ?? ""}`}
                    >
                      <td className="table-cell font-semibold text-slate-900 dark:text-slate-100">
                        {r.patientName}
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-secondary-50 dark:bg-secondary-900/20 text-secondary-700 dark:text-secondary-400 text-xs font-bold font-mono border border-secondary-200 dark:border-secondary-800">
                          {r.bedNumber}
                        </span>
                      </td>
                      <td className="table-cell">
                        {r.need && <NeedBadge need={r.need} size="sm" />}
                      </td>
                      <td className="table-cell">
                        {r.gestureType
                          ? <GestureBadge gesture={r.gestureType} />
                          : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        }
                      </td>
                      <td className="table-cell">
                        <RiskBadge risk={risk} />
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(r.confidence * 100)}%`,
                                background: "linear-gradient(90deg,#f97316,#14b8a6)",
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {Math.round(r.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {r.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1 text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                          <Wifi size={12} />
                          WebSocket
                        </span>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span>{" "}
              of {records.length} alerts
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
