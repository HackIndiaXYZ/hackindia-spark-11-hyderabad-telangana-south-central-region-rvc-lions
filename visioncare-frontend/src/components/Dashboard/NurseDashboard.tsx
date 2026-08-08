import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useWebSocket } from "../../hooks/useWebSocket";
import { detectionsApi, patientsApi } from "../../services/api";
import {
  NurseSocketMessage,
  PatientRequest,
  RequestStatus,
  WardStats,
} from "../../types";
import { PatientCard } from "../PatientCard/PatientCard";
import { NeedBadge } from "../NeedBadge/NeedBadge";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import {
  MOCK_ALERTS,
  MOCK_PATIENTS,
  getSortedAlerts,
  MockAlert,
  AlertPriority,
  PRIORITY_ORDER,
} from "../../data/mockData";
import {
  Users,
  Bell,
  CheckCircle,
  Clock,
  Camera,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  ExternalLink,
  UserMinus,
  Plus,
  X,
  ChevronRight,
} from "lucide-react";

interface NurseDashboardProps {
  wardId: string;
  nurseId: string;
  nurseName?: string;
}

const WS_BASE_URL = process.env.REACT_APP_WS_URL ?? "ws://127.0.0.1:8000";

function mapDetectionToRequest(raw: any): PatientRequest {
  return {
    id:             raw.id,
    patientId:      raw.patient_id,
    patientName:    raw.patient_name,
    bedNumber:      raw.bed_number,
    need:           raw.need_type ?? raw.need,
    gestureType:    raw.gesture_type,
    confidence:     raw.confidence,
    timestamp:      new Date(raw.timestamp ?? raw.created_at),
    status:         (raw.status ?? "pending") as RequestStatus,
    acknowledgedBy: raw.acknowledged_by,
    responseTimeMs: raw.response_time_ms,
  };
}

const PRIORITY_CONFIG: Record<
  AlertPriority,
  { label: string; color: string; bg: string; border: string; dot: string; ring: string }
> = {
  critical: { label: "CRITICAL", color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20",    border: "border-red-200 dark:border-red-800",    dot: "bg-red-500 animate-ping",   ring: "ring-2 ring-red-400/50"    },
  high:     { label: "HIGH",     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-400 animate-pulse", ring: "ring-2 ring-orange-400/50" },
  medium:   { label: "MEDIUM",   color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-200 dark:border-amber-800",  dot: "bg-amber-400",              ring: ""                          },
  low:      { label: "LOW",      color: "text-slate-500 dark:text-slate-400",  bg: "bg-slate-50 dark:bg-slate-800",     border: "border-slate-200 dark:border-slate-700",  dot: "bg-slate-400",              ring: ""                          },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: "orange" | "teal" | "emerald" | "violet";
}) {
  const accentMap = {
    orange:  { icon: "bg-primary-50 dark:bg-primary-900/20 text-primary-500",   bar: "from-primary-400 to-primary-600"    },
    teal:    { icon: "bg-secondary-50 dark:bg-secondary-900/20 text-secondary-500", bar: "from-secondary-400 to-secondary-600" },
    emerald: { icon: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500",    bar: "from-emerald-400 to-teal-500"       },
    violet:  { icon: "bg-violet-50 dark:bg-violet-900/20 text-violet-500",       bar: "from-violet-400 to-purple-500"      },
  }[accent];

  return (
    <div className="card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      {/* Top gradient bar */}
      <div className={`h-1 rounded-full mb-4 bg-gradient-to-r ${accentMap.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-none">
            {value}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentMap.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Camera Tile ───────────────────────────────────────────────────────────────
function CameraTile({
  patient,
  hasAlert,
  alertPriority,
  isSelected,
  onClick,
}: {
  patient: any;
  hasAlert: boolean;
  alertPriority?: AlertPriority;
  isSelected: boolean;
  onClick: () => void;
}) {
  const bedLabel = patient.bed_number ?? patient.bedNumber ?? "—";
  const cfg = alertPriority ? PRIORITY_CONFIG[alertPriority] : null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`Camera feed for patient ${patient.name}, bed ${bedLabel}`}
      className={`
        relative rounded-2xl overflow-hidden cursor-pointer aspect-video
        transition-all duration-200 border-2
        ${isSelected
          ? "border-primary-500 shadow-orange"
          : "border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700"
        }
        ${cfg ? cfg.ring : ""}
      `}
    >
      {/* Dark camera background */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 40%, #1e293b 0%, #0f172a 100%)" }}
      />

      {/* Camera icon placeholder */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
        <Camera size={28} className="text-slate-600" />
        <span className="text-slate-500 text-xs font-medium">Live Feed</span>
      </div>

      {/* Bed badge */}
      <div
        className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
          isSelected
            ? "bg-primary-500 text-white"
            : "bg-slate-900/80 text-secondary-400 border border-secondary-500/40"
        }`}
      >
        Bed {bedLabel}
      </div>

      {/* Alert indicator */}
      {hasAlert && cfg && (
        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
      )}

      {/* Patient info footer */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-xs font-semibold truncate">{patient.name}</p>
        <p className="text-slate-400 text-[10px] capitalize">{patient.condition}</p>
      </div>

      {/* Selected glow pulse */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-primary-400 rounded-2xl pointer-events-none animate-pulse opacity-60" />
      )}
    </div>
  );
}

// ── Alert Row ─────────────────────────────────────────────────────────────────
function AlertRow({
  alert,
  index,
  onSelect,
  isActive,
  onResolve,
}: {
  alert: MockAlert;
  index: number;
  onSelect: (pid: string) => void;
  isActive: boolean;
  onResolve: () => void;
}) {
  const cfg = PRIORITY_CONFIG[alert.priority];
  const minutesAgo = Math.floor((Date.now() - alert.timestamp.getTime()) / 60000);

  return (
    <div
      className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer
        ${cfg.bg} ${cfg.border} border
        ${isActive ? "ring-2 ring-primary-400/50" : "hover:shadow-card"}
      `}
      onClick={() => onSelect(alert.patientId)}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Priority dot */}
      <div className="shrink-0 flex flex-col items-center gap-0.5">
        <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        <span className={`text-[9px] font-black ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-slate-800 dark:text-slate-100 text-xs font-semibold truncate">
          {alert.message}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
          {alert.patientName} · Bed{" "}
          <span className="font-mono text-secondary-600 dark:text-secondary-400">{alert.bedNumber}</span>
        </p>
      </div>

      {/* Time */}
      <span className="shrink-0 text-slate-400 text-[10px] whitespace-nowrap">{minutesAgo}m ago</span>

      {/* Resolve button (hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); onResolve(); }}
        title="Resolve alert"
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-emerald-500 shadow-card"
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export const NurseDashboard: React.FC<NurseDashboardProps> = ({
  wardId,
  nurseId,
  nurseName = "Nurse",
}) => {
  const [requests,          setRequests]         = useState<PatientRequest[]>([]);
  const [soundEnabled,      setSoundEnabled]      = useState(true);
  const [loadError,         setLoadError]         = useState<string | null>(null);
  const [now,               setNow]               = useState(new Date());
  const [patients,          setPatients]          = useState<any[]>([]);
  const [showAddForm,       setShowAddForm]       = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [alerts,            setAlerts]            = useState<MockAlert[]>(getSortedAlerts(MOCK_ALERTS));
  const [newPatient, setNewPatient] = useState({
    name: "", age: "", bed_number: "", condition: "stroke", notes: "",
  });

  const displayPatients = patients.length > 0
    ? patients
    : MOCK_PATIENTS.filter((p) => p.wardId === wardId || patients.length === 0);

  const loadPatients = useCallback(async () => {
    try {
      const res = await patientsApi.list(wardId);
      setPatients(res.data || []);
    } catch {
      setPatients([]);
    }
  }, [wardId]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.age || !newPatient.bed_number) return;
    try {
      await patientsApi.create({
        name:        newPatient.name,
        age:         parseInt(newPatient.age, 10),
        bed_number:  newPatient.bed_number,
        ward_id:     wardId,
        hospital_id: "HOSP-1",
        condition:   newPatient.condition,
        notes:       newPatient.notes || "",
      });
      setNewPatient({ name: "", age: "", bed_number: "", condition: "stroke", notes: "" });
      setShowAddForm(false);
      loadPatients();
    } catch {
      setLoadError("Failed to add patient. Please check input values.");
    }
  };

  const handleDischargePatient = async (id: string) => {
    if (!window.confirm("Discharge this patient?")) return;
    try {
      await patientsApi.discharge(id);
      loadPatients();
    } catch {
      setLoadError("Failed to discharge patient.");
    }
  };

  const { lastMessage, connectionStatus } = useWebSocket(`${WS_BASE_URL}/ws/nurse/${wardId}`);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pendingRes, recentRes] = await Promise.all([
          detectionsApi.listActive(wardId),
          detectionsApi.listRecent(wardId, 20),
        ]);
        if (cancelled) return;
        const pending = (pendingRes.data ?? []).map(mapDetectionToRequest);
        const recent  = (recentRes.data ?? []).map(mapDetectionToRequest);
        const merged  = new Map<string, PatientRequest>();
        [...recent, ...pending].forEach((r: PatientRequest) => merged.set(r.id, r));
        setRequests(Array.from(merged.values()));
      } catch {
        if (!cancelled) setLoadError("Couldn't load requests. Using demo data.");
      }
    })();
    return () => { cancelled = true; };
  }, [wardId]);

  useEffect(() => {
    if (!lastMessage) return;
    let data: NurseSocketMessage;
    try { data = JSON.parse(lastMessage.data); } catch { return; }
    if (data.type === "new_request") {
      const incoming = mapDetectionToRequest(data);
      setRequests((prev) => prev.some((r) => r.id === incoming.id) ? prev : [incoming, ...prev]);
    }
    if (data.type === "request_updated") {
      const updated = mapDetectionToRequest(data);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    }
  }, [lastMessage]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const handleAcknowledge = async (requestId: string, status: RequestStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
    try { await detectionsApi.acknowledge(requestId, nurseId, status); }
    catch { setLoadError("Failed to save update."); }
  };

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests]
  );
  const historyRequests = useMemo(
    () =>
      requests
        .filter((r) => r.status !== "pending")
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20),
    [requests]
  );

  const stats: WardStats = useMemo(() => {
    const today = new Date();
    const completedToday = requests.filter(
      (r) => r.status === "completed" && r.timestamp.toDateString() === today.toDateString()
    );
    const responseTimes = completedToday
      .map((r) => r.responseTimeMs)
      .filter((v): v is number => typeof v === "number");
    const avgResponseMinutes = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 60000
      : 0;
    return {
      activePatients:    displayPatients.length,
      pendingRequests:   alerts.length,
      completedToday:    completedToday.length,
      avgResponseMinutes,
    };
  }, [requests, alerts.length, displayPatients.length]);

  const alertsByPatientId = useMemo(() => {
    const map: Record<string, MockAlert> = {};
    alerts.forEach((a) => {
      if (!map[a.patientId] || PRIORITY_ORDER[a.priority] < PRIORITY_ORDER[map[a.patientId].priority]) {
        map[a.patientId] = a;
      }
    });
    return map;
  }, [alerts]);

  // Connection badge
  const connBadge = {
    connected:    { icon: <Wifi size={13} />,    label: "Live",       cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" },
    connecting:   { icon: <Wifi size={13} />,    label: "Connecting", cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"         },
    disconnected: { icon: <WifiOff size={13} />, label: "Offline",    cls: "text-slate-500 bg-slate-100 dark:bg-slate-700"                               },
  }[connectionStatus] ?? { icon: <WifiOff size={13} />, label: "Offline", cls: "text-slate-500 bg-slate-100" };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-up">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            Ward{" "}
            <span className="text-gradient-orange">{wardId}</span>
          </h1>
          <p className="page-subtitle">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" · "}
            {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${connBadge.cls}`}>
            {connBadge.icon}
            {connBadge.label}
          </span>
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="btn-secondary btn-icon"
            title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
            aria-label={soundEnabled ? "Mute alerts" : "Unmute alerts"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {/* Management link */}
          <Link to="/management" className="btn-secondary text-xs hidden sm:flex">
            Management
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Load error ──────────────────────────────────────────────────── */}
      {loadError && (
        <div role="alert" className="p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monitored Patients" value={stats.activePatients}  icon={<Users  size={18} />} accent="teal"    />
        <StatCard label="Active Alerts"      value={stats.pendingRequests} icon={<Bell   size={18} />} accent="orange"  />
        <StatCard label="Completed Today"    value={stats.completedToday}  icon={<CheckCircle size={18} />} accent="emerald" />
        <StatCard
          label="Avg. Response"
          value={stats.avgResponseMinutes > 0 ? `${stats.avgResponseMinutes.toFixed(1)}m` : "—"}
          icon={<Clock size={18} />}
          accent="violet"
        />
      </div>

      {/* ── Main area: Camera Grid + Alert Sidebar ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        {/* Camera section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary-500 animate-pulse" />
              Multi-Camera Ward View
              <span className="text-xs font-normal text-slate-400 ml-1 font-mono">
                ({displayPatients.length} feeds)
              </span>
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={showAddForm ? "btn-ghost text-xs" : "btn-primary text-xs"}
            >
              {showAddForm ? (
                <><X size={13} /> Cancel</>
              ) : (
                <><Plus size={13} /> Add Patient</>
              )}
            </button>
          </div>

          {/* Add patient inline form */}
          {showAddForm && (
            <form
              onSubmit={handleAddPatient}
              className="mb-4 card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end animate-slide-in"
            >
              {[
                { label: "Patient Name", field: "name",       type: "text",   placeholder: "e.g. John Doe" },
                { label: "Age",          field: "age",        type: "number", placeholder: "e.g. 65"       },
                { label: "Bed No.",      field: "bed_number", type: "text",   placeholder: "e.g. 102A"     },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="label">{label}</label>
                  <input
                    type={type}
                    required
                    placeholder={placeholder}
                    value={(newPatient as any)[field]}
                    onChange={(e) => setNewPatient({ ...newPatient, [field]: e.target.value })}
                    className="input-field"
                  />
                </div>
              ))}
              <div>
                <label className="label">Condition</label>
                <select
                  value={newPatient.condition}
                  onChange={(e) => setNewPatient({ ...newPatient, condition: e.target.value })}
                  className="select-field"
                >
                  {["stroke", "als", "paralysis", "post_surgery", "elderly", "other"].map((c) => (
                    <option key={c} value={c}>{c.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">Save</button>
            </form>
          )}

          {/* Camera grid */}
          <div
            className={`grid gap-3 ${
              displayPatients.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
              displayPatients.length <= 4 ? "grid-cols-2" :
              "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {displayPatients.map((p) => {
              const pid   = p.id;
              const alert = alertsByPatientId[pid];
              return (
                <CameraTile
                  key={pid}
                  patient={p}
                  hasAlert={!!alert}
                  alertPriority={alert?.priority}
                  isSelected={selectedPatientId === pid}
                  onClick={() => setSelectedPatientId((prev) => (prev === pid ? null : pid))}
                />
              );
            })}
          </div>

          {/* Selected patient detail */}
          {selectedPatientId && (() => {
            const p     = displayPatients.find((x) => x.id === selectedPatientId);
            if (!p) return null;
            const alert = alertsByPatientId[selectedPatientId];
            return (
              <div className="mt-4 card p-4 flex flex-wrap items-center gap-4 animate-slide-in border-primary-200 dark:border-primary-800 border">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg,#f97316,#14b8a6)" }}
                  >
                    {p.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bed{" "}
                      <span className="font-mono text-secondary-600 dark:text-secondary-400">
                        {p.bed_number ?? p.bedNumber}
                      </span>{" "}
                      · {p.condition} · Age {p.age}
                    </p>
                  </div>
                </div>
                {alert && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${PRIORITY_CONFIG[alert.priority].bg} ${PRIORITY_CONFIG[alert.priority].border} ${PRIORITY_CONFIG[alert.priority].color}`}>
                    <span className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[alert.priority].dot}`} />
                    {alert.message}
                  </div>
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                  <Link
                    to={`/patients/${p.id}/monitor`}
                    target="_blank"
                    className="btn-teal text-xs flex items-center gap-1"
                  >
                    <ExternalLink size={13} />
                    Live Feed
                  </Link>
                  <Link
                    to={`/patients/${p.id}/phone-camera`}
                    target="_blank"
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    📱 Mobile Cam
                  </Link>
                  <Link
                    to={`/patients/${p.id}/calibration`}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    🎯 Calibrate
                  </Link>
                  <button
                    onClick={() => handleDischargePatient(p.id)}
                    className="btn-danger text-xs flex items-center gap-1"
                  >
                    <UserMinus size={13} />
                    Discharge
                  </button>
                </div>
              </div>
            );
          })()}
        </section>

        {/* ── Priority Alert Sidebar ──────────────────────────────────── */}
        <aside>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Priority Alerts
              {alerts.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800">
                  {alerts.length}
                </span>
              )}
            </h2>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5 no-scrollbar">
            {alerts.length === 0 ? (
              <div className="p-8 card text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={22} className="text-emerald-500" />
                </div>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">All Clear</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">No active alerts</p>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  index={i}
                  onSelect={(pid) => setSelectedPatientId(pid)}
                  isActive={selectedPatientId === alert.patientId}
                  onResolve={() => resolveAlert(alert.id)}
                />
              ))
            )}
          </div>

          {/* Gesture requests */}
          {pendingRequests.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                Gesture Requests
              </p>
              <div className="space-y-2">
                {pendingRequests.slice(0, 3).map((request) => (
                  <PatientCard
                    key={request.id}
                    request={request}
                    onAcknowledge={handleAcknowledge}
                    urgent={request.need === "pain" || request.need === "emergency"}
                  />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Recent Activity Table ────────────────────────────────────────── */}
      <section>
        <h2 className="section-title mb-3">Recent Activity</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full" aria-label="Recent activity">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/60">
                  {["Bed", "Patient", "Need", "Time", "Status"].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                {historyRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                      No activity yet today.
                    </td>
                  </tr>
                ) : (
                  historyRequests.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="table-cell">
                        <span className="font-mono text-xs font-bold text-secondary-600 dark:text-secondary-400">
                          {r.bedNumber}
                        </span>
                      </td>
                      <td className="table-cell font-medium text-slate-800 dark:text-slate-200">
                        {r.patientName}
                      </td>
                      <td className="table-cell">
                        <NeedBadge need={r.need} size="sm" />
                      </td>
                      <td className="table-cell text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {r.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NurseDashboard;
