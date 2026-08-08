import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { patientsApi } from "../../services/api";
import {
  UserPlus,
  ArrowLeft,
  CheckCircle,
  Upload,
  User,
  Building2,
  Camera,
} from "lucide-react";

const CONDITIONS = [
  { value: "stroke",       label: "Stroke"       },
  { value: "als",          label: "ALS"           },
  { value: "paralysis",    label: "Paralysis"     },
  { value: "post_surgery", label: "Post Surgery"  },
  { value: "elderly",      label: "Elderly"       },
  { value: "other",        label: "Other"         },
];

const WARDS = ["ICU-1", "ICU-2", "Ward-A", "Ward-B", "Ward-C", "Emergency"];

// ── Section card header ───────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  color = "orange",
}: {
  icon: React.ReactNode;
  title: string;
  color?: "orange" | "teal" | "violet" | "emerald";
}) {
  const colorMap = {
    orange:  "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
    teal:    "bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400",
    violet:  "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/60">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">{title}</h3>
    </div>
  );
}

export const AddPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const [form, setForm] = useState({
    name:              "",
    age:               "",
    gender:            "male",
    bed_number:        "",
    ward_id:           "ICU-1",
    hospital_id:       "HOSP-1",
    condition:         "stroke",
    notes:             "",
    doctor:            "",
    phone:             "",
    emergency_contact: "",
    blood_group:       "O+",
    enable_monitoring: true,
  });

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.bed_number) {
      setError("Please fill in all required fields (Name, Age, Bed).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await patientsApi.create({
        name:        form.name,
        age:         parseInt(form.age, 10),
        bed_number:  form.bed_number,
        ward_id:     form.ward_id,
        hospital_id: form.hospital_id,
        condition:   form.condition,
        notes:       form.notes || "",
      });
      setSuccess(true);
      setTimeout(() => navigate("/patients"), 2000);
    } catch {
      setError("Failed to register patient. Check all required fields and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[70vh] animate-fade-up">
        <div className="text-center max-w-sm">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-teal"
            style={{ background: "linear-gradient(135deg,#14b8a6,#2dd4bf)" }}
          >
            <CheckCircle size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Patient Registered!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            The patient has been successfully added to the monitoring system.
            Redirecting to patients list…
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
            <div
              className="h-1 rounded-full animate-pulse"
              style={{ background: "linear-gradient(90deg,#f97316,#14b8a6)", width: "60%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-up max-w-5xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/patients")}
          className="btn-ghost btn-icon"
          aria-label="Back to patients"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">Add Patient</h1>
          <p className="page-subtitle">Register a new patient for AI monitoring</p>
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

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* ── Personal Information ────────────────────────────────────────── */}
        <div className="card p-6">
          <SectionHeader icon={<User size={17} />} title="Personal Information" color="orange" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="label" htmlFor="patient-name">
                Full Name <span className="text-rose-500 normal-case">*</span>
              </label>
              <input
                id="patient-name"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label" htmlFor="patient-age">
                Age <span className="text-rose-500 normal-case">*</span>
              </label>
              <input
                id="patient-age"
                type="number"
                required
                min={1}
                max={120}
                placeholder="e.g. 65"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label" htmlFor="patient-gender">Gender</label>
              <select
                id="patient-gender"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="select-field"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="patient-blood">Blood Group</label>
              <select
                id="patient-blood"
                value={form.blood_group}
                onChange={(e) => set("blood_group", e.target.value)}
                className="select-field"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="patient-phone">Phone Number</label>
              <input
                id="patient-phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label" htmlFor="patient-emergency">Emergency Contact</label>
              <input
                id="patient-emergency"
                type="tel"
                placeholder="+1 (555) 000-0001"
                value={form.emergency_contact}
                onChange={(e) => set("emergency_contact", e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* ── Ward & Medical ──────────────────────────────────────────────── */}
        <div className="card p-6">
          <SectionHeader icon={<Building2 size={17} />} title="Ward & Medical Information" color="teal" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="label" htmlFor="patient-bed">
                Bed / Room Number <span className="text-rose-500 normal-case">*</span>
              </label>
              <input
                id="patient-bed"
                type="text"
                required
                placeholder="e.g. 102A"
                value={form.bed_number}
                onChange={(e) => set("bed_number", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label" htmlFor="patient-ward">Ward</label>
              <select
                id="patient-ward"
                value={form.ward_id}
                onChange={(e) => set("ward_id", e.target.value)}
                className="select-field"
              >
                {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="patient-doctor">Assigned Doctor</label>
              <input
                id="patient-doctor"
                type="text"
                placeholder="Dr. Smith"
                value={form.doctor}
                onChange={(e) => set("doctor", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label" htmlFor="patient-condition">
                Medical Condition <span className="text-rose-500 normal-case">*</span>
              </label>
              <select
                id="patient-condition"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                className="select-field"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="patient-notes">Clinical Notes</label>
              <textarea
                id="patient-notes"
                rows={3}
                placeholder="Additional clinical notes, allergies, special requirements…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="input-field resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Camera & Monitoring ─────────────────────────────────────────── */}
        <div className="card p-6">
          <SectionHeader icon={<Camera size={17} />} title="Camera & Monitoring" color="violet" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Photo upload */}
            <div>
              <label className="label">Patient Photo (optional)</label>
              <label className="flex items-center gap-3 p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                  <Upload size={18} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    Click to upload photo
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>

            {/* Camera + toggle */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Camera Assignment</label>
                <select className="select-field">
                  <option>Auto-assign</option>
                  <option>Camera 01</option>
                  <option>Camera 02</option>
                  <option>Camera 03</option>
                </select>
              </div>

              {/* Monitoring toggle */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.enable_monitoring}
                  onClick={() => set("enable_monitoring", !form.enable_monitoring)}
                  className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
                    form.enable_monitoring
                      ? "bg-gradient-to-r from-primary-500 to-primary-600"
                      : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      form.enable_monitoring ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Enable AI Monitoring
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Start computer vision monitoring on registration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            id="add-patient-submit"
            disabled={submitting}
            className="btn-primary px-8 py-3 text-base"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registering…
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Register Patient
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/patients")}
            className="btn-secondary px-6 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPatientPage;
