import React, { useState } from "react";
import { CameraFeed } from "../CameraFeed/CameraFeed";
import { Patient, ConnectionStatus } from "../../types";
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  Activity,
  Video,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Link } from "react-router-dom";

interface FloatingCameraWindowProps {
  patient: Patient;
  onClose: () => void;
}

export const FloatingCameraWindow: React.FC<FloatingCameraWindowProps> = ({
  patient,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [identityStatus, setIdentityStatus] = useState<string>("uncalibrated");

  const bedNum = patient.bed_number ?? patient.bedNumber ?? "—";
  const wardId = patient.ward_id ?? patient.wardId ?? "ICU-1";

  // ── Minimized Floating Pill Card ─────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-primary-500/40 rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3">
          <div className="relative flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <Video size={16} className="text-primary-400" />
            <span className="text-xs font-bold text-white truncate max-w-[140px]">
              {patient.name} <span className="text-slate-400 font-normal">| Bed {bedNum}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button
              onClick={() => setIsMinimized(false)}
              title="Expand Camera"
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              title="Close Camera"
              className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded Floating Window ─────────────────────────────────────────────
  return (
    <div
      className={`fixed z-50 transition-all duration-300 animate-scale-up ${
        isMaximized
          ? "inset-4 md:inset-10"
          : "bottom-6 right-6 w-full max-w-[460px] max-h-[90vh]"
      }`}
    >
      <div className="bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full ring-1 ring-white/10">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <span
                className={`h-2.5 w-2.5 rounded-full block ${
                  status === "connected"
                    ? "bg-emerald-400 animate-pulse"
                    : status === "connecting"
                    ? "bg-amber-400 animate-ping"
                    : "bg-rose-400"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white truncate">{patient.name}</h3>
                <span className="px-2 py-0.5 rounded-md bg-secondary-500/20 border border-secondary-500/40 text-secondary-300 text-[10px] font-mono font-bold">
                  Bed {bedNum}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                Ward: {wardId} · ID: {patient.id?.substring(0, 8)}…
              </p>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>

            <button
              onClick={() => setIsMinimized(true)}
              title="Minimize to floating widget"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Minus size={15} />
            </button>

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore size" : "Maximize camera window"}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <Link
              to={`/patients/${patient.id}/monitor`}
              target="_blank"
              title="Open direct link"
              className="p-1.5 text-slate-400 hover:text-primary-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ExternalLink size={15} />
            </Link>

            <button
              onClick={onClose}
              title="Close camera"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Camera Body ─────────────────────────────────────────────────── */}
        <div className="p-3 flex-1 flex flex-col justify-center min-h-0 bg-black/60">
          <CameraFeed
            patientId={patient.id}
            onStatusChange={setStatus}
            onIdentityChange={(id) => setIdentityStatus(id.status)}
          />
        </div>

        {/* ── Real-time Status Overlay Footer ─────────────────────────────── */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Activity size={13} className="text-primary-400" />
              <span>AI Engine: Active</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline flex items-center gap-1">
              <Shield size={13} className="text-teal-400" />
              <span className="capitalize">ID: {identityStatus}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="capitalize text-slate-300 font-semibold">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingCameraWindow;
