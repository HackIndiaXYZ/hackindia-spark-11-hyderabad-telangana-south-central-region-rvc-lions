import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MOCK_PATIENTS,
  MOCK_DOCTORS,
  getDoctorById,
  MockPatientRecord,
  MockDoctor,
} from "../../data/mockData";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysSince(s: string) {
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
}

// ── Billing badge ─────────────────────────────────────────────────────────────
function BillingBadge({ status }: { status: MockPatientRecord["billingStatus"] }) {
  const cfg = {
    Paid:    { bg: "bg-emerald-900/40", border: "border-emerald-500/40", text: "text-emerald-300", dot: "bg-emerald-400" },
    Partial: { bg: "bg-yellow-900/30",  border: "border-yellow-500/40",  text: "text-yellow-300",  dot: "bg-yellow-400" },
    Pending: { bg: "bg-red-900/30",     border: "border-red-500/40",     text: "text-red-300",     dot: "bg-red-400 animate-pulse" },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ── Doctor chip ───────────────────────────────────────────────────────────────
function DoctorChip({ doctor }: { doctor: MockDoctor }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-violet-900/60 border border-violet-500/40 flex items-center justify-center text-violet-300 text-xs font-bold">
        {doctor.avatarInitials}
      </div>
      <div>
        <p className="text-xs font-semibold text-white leading-tight">{doctor.name}</p>
        <p className="text-[10px] text-slate-400">{doctor.specialty}</p>
      </div>
    </div>
  );
}

// ── Patient Detail Modal ──────────────────────────────────────────────────────
function PatientDetailModal({
  patient,
  doctor,
  onClose,
}: {
  patient: MockPatientRecord;
  doctor?: MockDoctor;
  onClose: () => void;
}) {
  const balance = patient.billingTotal - patient.billingPaid;
  const pct = patient.billingTotal > 0 ? (patient.billingPaid / patient.billingTotal) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,10,15,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 bg-gradient-to-r from-ink-950 to-ink-900 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-signal-teal/20 border border-signal-teal/40 text-signal-teal">
                {patient.id}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded border ${patient.isActive ? "bg-emerald-900/30 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-600 text-slate-400"}`}>
                {patient.isActive ? "Active" : "Discharged"}
              </span>
            </div>
            <h2 className="text-xl font-display font-bold text-white">{patient.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {patient.gender} · {patient.age} yrs · Bed{" "}
              <span className="font-mono text-signal-teal">{patient.bedNumber}</span>
              {" "}· Ward {patient.wardId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admission info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Admission Details</h3>
            <div className="space-y-3">
              <InfoRow label="Condition" value={patient.condition} />
              <div>
                <p className="text-xs text-slate-500 mb-1">Admission Reason</p>
                <p className="text-sm text-slate-200 leading-relaxed">{patient.admissionReason}</p>
              </div>
              <InfoRow label="Admitted On" value={`${formatDate(patient.admittedOn)} (${daysSince(patient.admittedOn)} days)`} />
              {patient.insuranceProvider && (
                <InfoRow label="Insurance" value={patient.insuranceProvider} />
              )}
            </div>
          </div>

          {/* Billing info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Billing Details</h3>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Total Bill</span>
                <span className="font-mono font-bold text-white">{formatCurrency(patient.billingTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Paid</span>
                <span className="font-mono font-semibold text-emerald-400">{formatCurrency(patient.billingPaid)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Balance Due</span>
                <span className={`font-mono font-bold ${balance > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {formatCurrency(balance)}
                </span>
              </div>
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Payment progress</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
              <div className="pt-1 border-t border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-400">Status</span>
                <BillingBadge status={patient.billingStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* Doctor info */}
        {doctor && (
          <div className="px-6 pb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Treating Physician</h3>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-900/20 border border-violet-500/30">
              <div className="w-12 h-12 rounded-xl bg-violet-900/60 border border-violet-500/40 flex items-center justify-center text-violet-300 text-lg font-bold">
                {doctor.avatarInitials}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{doctor.name}</p>
                <p className="text-sm text-violet-300">{doctor.specialty}</p>
                <div className="flex gap-4 mt-1">
                  <p className="text-xs text-slate-400">📞 {doctor.phone}</p>
                  <p className="text-xs text-slate-400">✉️ {doctor.email}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-violet-900/40 border border-violet-500/40 text-violet-300 font-mono">
                {doctor.id}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-200 text-right capitalize">{value}</span>
    </div>
  );
}

// ── Management Dashboard ──────────────────────────────────────────────────────
export const ManagementDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("All");
  const [billingFilter, setBillingFilter] = useState("All");
  const [selectedPatient, setSelectedPatient] = useState<MockPatientRecord | null>(null);
  const [now] = useState(new Date());

  const wards = useMemo(() => ["All", ...Array.from(new Set(MOCK_PATIENTS.map((p) => p.wardId)))], []);

  const filtered = useMemo(() =>
    MOCK_PATIENTS.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.bedNumber.toLowerCase().includes(search.toLowerCase());
      const matchWard = wardFilter === "All" || p.wardId === wardFilter;
      const matchBilling = billingFilter === "All" || p.billingStatus === billingFilter;
      return matchSearch && matchWard && matchBilling;
    }),
    [search, wardFilter, billingFilter]
  );

  // Summary stats
  const totalRevenue = MOCK_PATIENTS.reduce((s, p) => s + p.billingTotal, 0);
  const totalCollected = MOCK_PATIENTS.reduce((s, p) => s + p.billingPaid, 0);
  const activeCount = MOCK_PATIENTS.filter((p) => p.isActive).length;
  const pendingBills = MOCK_PATIENTS.filter((p) => p.billingStatus !== "Paid").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-ink-950 via-ink-900 to-ink-800 border-b border-slate-700/50 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 border border-violet-500/40 rounded-xl flex items-center justify-center text-xl">
              🏥
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white">VisionCare AI</h1>
              <p className="text-violet-400 text-xs font-mono">Hospital Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-xs px-3 py-1.5 rounded-lg bg-signal-teal/20 border border-signal-teal/40 text-signal-teal hover:bg-signal-teal/30 transition-colors"
            >
              ← Nurse View
            </Link>
            <p className="text-slate-400 text-xs font-mono">
              {now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* ── Summary Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MgmtStatCard label="Active Patients" value={activeCount} sub={`of ${MOCK_PATIENTS.length} total`} accent="border-signal-teal" icon="🛏️" />
          <MgmtStatCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub="all admissions" accent="border-violet-500" icon="💰" />
          <MgmtStatCard label="Collected" value={formatCurrency(totalCollected)} sub={`${((totalCollected / totalRevenue) * 100).toFixed(0)}% of total`} accent="border-emerald-500" icon="✅" />
          <MgmtStatCard label="Pending Bills" value={pendingBills} sub="need follow-up" accent="border-red-500" icon="⚠️" valueClass="text-red-400" />
        </div>

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7 7 0 1116.65 2.35a7 7 0 010 14.3z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, ID, or bed…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-signal-teal focus:ring-1 focus:ring-signal-teal outline-none"
            />
          </div>
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-signal-teal outline-none"
          >
            {wards.map((w) => <option key={w}>{w}</option>)}
          </select>
          <select
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-signal-teal outline-none"
          >
            {["All", "Paid", "Partial", "Pending"].map((b) => <option key={b}>{b}</option>)}
          </select>
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} records</span>
        </div>

        {/* ── Patient Table ─────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-800/60">
                <tr>
                  {["Patient ID", "Name", "Bed / Ward", "Condition & Reason", "Admitted", "Doctor", "Billing", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500 text-sm">
                      No patients match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const doctor = getDoctorById(p.doctorId);
                    const balance = p.billingTotal - p.billingPaid;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* ID */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-signal-teal">
                            {p.id}
                          </span>
                        </td>

                        {/* Name + gender/age */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-ink-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-signal-teal">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{p.name}</p>
                              <p className="text-xs text-slate-400">{p.gender} · {p.age} yrs</p>
                            </div>
                          </div>
                        </td>

                        {/* Bed / Ward */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-mono text-signal-teal font-bold text-sm">Bed {p.bedNumber}</p>
                          <p className="text-xs text-slate-400">{p.wardId}</p>
                        </td>

                        {/* Condition + reason */}
                        <td className="px-5 py-4 max-w-[200px]">
                          <span className="inline-block px-2 py-0.5 rounded bg-ink-800 border border-slate-700 text-xs text-slate-200 capitalize mb-1">
                            {p.condition}
                          </span>
                          <p className="text-xs text-slate-400 truncate" title={p.admissionReason}>
                            {p.admissionReason}
                          </p>
                        </td>

                        {/* Admitted */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-sm text-slate-300">{formatDate(p.admittedOn)}</p>
                          <p className="text-xs text-slate-500">{daysSince(p.admittedOn)} days</p>
                        </td>

                        {/* Doctor */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {doctor ? <DoctorChip doctor={doctor} /> : <span className="text-slate-500 text-xs">Unassigned</span>}
                        </td>

                        {/* Billing */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <BillingBadge status={p.billingStatus} />
                            <p className="text-xs text-slate-400">{formatCurrency(p.billingTotal)}</p>
                            {balance > 0 && (
                              <p className="text-[10px] text-red-400">Due: {formatCurrency(balance)}</p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPatient(p)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-violet-900/30 border border-violet-500/40 text-violet-300 hover:bg-violet-900/50 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Doctors Panel ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-display font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-violet-400">👨‍⚕️</span> Active Physicians
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_DOCTORS.map((doc) => {
              const patientCount = MOCK_PATIENTS.filter((p) => p.doctorId === doc.id && p.isActive).length;
              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-violet-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-900/60 border border-violet-500/40 flex items-center justify-center text-violet-300 font-bold text-sm">
                      {doc.avatarInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{doc.name}</p>
                      <p className="text-xs text-violet-400">{doc.specialty}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Active patients</span>
                      <span className="font-bold text-signal-teal">{patientCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">ID</span>
                      <span className="font-mono text-slate-300">{doc.id}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{doc.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── Patient Detail Modal ────────────────────────────────────────────── */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          doctor={getDoctorById(selectedPatient.doctorId)}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function MgmtStatCard({
  label, value, sub, accent, icon, valueClass,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
  icon: string;
  valueClass?: string;
}) {
  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl p-4 border-l-4 ${accent} hover:bg-slate-800/80 transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-xs">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-display font-bold text-white ${valueClass ?? ""}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

export default ManagementDashboard;
