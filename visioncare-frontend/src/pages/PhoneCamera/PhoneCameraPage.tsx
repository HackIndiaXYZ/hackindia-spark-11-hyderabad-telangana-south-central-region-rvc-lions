import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { useParams, Link } from "react-router-dom";
import { ConnectionStatus } from "../../types";
import { Camera, Wifi, WifiOff, RefreshCw } from "lucide-react";

const DEFAULT_WS_URL = process.env.REACT_APP_WS_URL ?? "ws://127.0.0.1:8000";

export const PhoneCameraPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const webcamRef = useRef<Webcam>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [fps, setFps] = useState(5);

  const connectWebSocket = useCallback(() => {
    if (!patientId) return;
    if (socketRef.current) {
      socketRef.current.close();
    }

    setStatus("connecting");
    const socket = new WebSocket(`${DEFAULT_WS_URL}/ws/camera/${patientId}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      const intervalMs = Math.round(1000 / fps);
      intervalRef.current = setInterval(() => {
        const frame = webcamRef.current?.getScreenshot();
        if (frame && socket.readyState === WebSocket.OPEN) {
          socket.send(frame);
        }
      }, intervalMs);
    };

    socket.onclose = () => {
      setStatus("disconnected");
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [patientId, fps]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connectWebSocket]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/40 flex items-center justify-center text-primary-400">
            <Camera size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Mobile Camera Stream</h1>
            <p className="text-xs text-slate-400 font-mono">Patient ID: {patientId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            status === "connected"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : status === "connecting"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}>
            {status === "connected" ? <Wifi size={12} /> : <WifiOff size={12} />}
            {status}
          </span>
          <Link to="/dashboard" className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs hover:bg-slate-700">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="my-6 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.7}
            videoConstraints={{ facingMode }}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
              className="p-2.5 rounded-xl bg-black/60 backdrop-blur border border-white/20 text-xs font-medium hover:bg-white/20 transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Flip Camera ({facingMode})
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-semibold text-slate-200 mb-0.5">Streaming Controls</p>
            <p className="text-slate-400">Position camera facing patient for AI gesture & face recognition.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-slate-400 font-medium">FPS Rate:</label>
            <select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="bg-slate-800 border border-white/20 rounded-lg px-2.5 py-1 text-white"
            >
              <option value={2}>2 FPS (Low Data)</option>
              <option value={5}>5 FPS (Standard)</option>
              <option value={10}>10 FPS (High Precision)</option>
            </select>
            <button
              onClick={connectWebSocket}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg font-semibold text-white transition-colors"
            >
              Reconnect
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center text-slate-500 text-xs">
        VisionCare Multi-Device Camera Stream Client
      </footer>
    </div>
  );
};

export default PhoneCameraPage;
