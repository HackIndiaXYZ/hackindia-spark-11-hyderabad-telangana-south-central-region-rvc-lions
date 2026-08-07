import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { patientsApi } from "../../services/api";
import { Patient } from "../../types";
import {
  Users,
  Search,
  Video,
  Settings,
  TrendingUp,
  Trash2,
  RefreshCw,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { ConditionBadge } from "../../components/UI/Badge";

// ── Patient row avatar ────────────────────────────────────────────────────────
function PatientAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "from-orange-400 to-pink-500",
    "from-teal-400 to-cyan-500",
    "from-violet-400 to-purple-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-indigo-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;

  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-br ${colors[idx]}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, j) => (
        <td key={j} className="table-cell">
          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientsApi.list();
      setPatients(res.data ?? []);
      setError(null);
    } catch {
      setError("Failed to load patients. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDischarge = async (id: string) => {
    if (!window.confirm("Discharge this patient? This cannot be undone.")) return;
    try {
      await patientsApi.discharge(id);
      load();
    } catch {
      setError("Failed to discharge patient.");
    }
  };

  const filtered = patients.filter(
    (p) =>
      search === "" ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.bed_number ?? p.bedNumber)?.toLowerCase().includes(search.toLowerCase()) ||
      (p.ward_id ?? p.wardId)?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-up">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">
            {patients.length} total registered patients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="btn-secondary btn-icon"
            aria-label="Refresh patient list"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <Link to="/add-patient" className="btn-primary">
            <UserPlus size={15} />
            Add Patient
          </Link>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm"
        >
          {error}
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by name, bed, or ward…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            aria-label="Search patients"
          />
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full" aria-label="Patients list">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/60">
                {["Patient", "Age", "Bed / Room", "Ward", "Condition", "Status", "Actions"].map(
                  (h) => (
                    <th key={h} className="table-header">{h}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Users size={24} className="text-slate-400 dark:text-slate-500" />
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                          {search ? "No patients match your search" : "No patients registered yet"}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                          {search
                            ? "Try adjusting your search terms"
                            : "Get started by adding your first patient"}
                        </p>
                      </div>
                      {!search && (
                        <Link to="/add-patient" className="btn-primary mt-1">
                          <UserPlus size={14} />
                          Register First Patient
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group"
                  >
                    {/* Patient name + avatar */}
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <PatientAvatar name={p.name ?? "P"} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                            {p.name}
                          </p>
                          <p className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">
                            {p.id?.substring(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Age */}
                    <td className="table-cell font-medium text-slate-700 dark:text-slate-300">
                      {p.age}
                    </td>

                    {/* Bed */}
                    <td className="table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary-50 dark:bg-secondary-900/20 text-secondary-700 dark:text-secondary-400 text-xs font-bold font-mono border border-secondary-200 dark:border-secondary-800">
                        {p.bed_number ?? p.bedNumber ?? "—"}
                      </span>
                    </td>

                    {/* Ward */}
                    <td className="table-cell text-slate-500 dark:text-slate-400 font-medium">
                      {p.ward_id ?? p.wardId}
                    </td>

                    {/* Condition */}
                    <td className="table-cell">
                      <ConditionBadge condition={p.condition} />
                    </td>

                    {/* Status */}
                    <td className="table-cell">
                      {(p.is_active ?? p.isActive) ? (
                        <span className="badge bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="table-cell">
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/patients/${p.id}/monitor`}
                          target="_blank"
                          title="Open live camera feed"
                          className="btn-icon bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                        >
                          <Video size={13} />
                        </Link>
                        <Link
                          to={`/patients/${p.id}/calibration`}
                          title="Calibrate patient"
                          className="btn-icon bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-900/40"
                        >
                          <Settings size={13} />
                        </Link>
                        <Link
                          to={`/patients/${p.id}/setup-mappings`}
                          title="Gesture mappings"
                          className="btn-icon bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                        >
                          <TrendingUp size={13} />
                        </Link>
                        <button
                          onClick={() => handleDischarge(p.id)}
                          title="Discharge patient"
                          className="btn-icon bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {filtered.length}
              </span>{" "}
              of {patients.length} patients
            </span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-primary-500 hover:underline font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsPage;
