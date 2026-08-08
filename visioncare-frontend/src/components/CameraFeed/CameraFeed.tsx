import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { ConnectionStatus } from "../../types";

interface IdentityStatus {
  status: "matched" | "unknown" | "uncalibrated";
  similarity: number;
  threshold: number;
}

interface CameraFeedProps {
  patientId: string;
  wsUrl?: string;
  streamUrl?: string; // DroidCam IP stream URL e.g. http://192.168.1.50:4747/video
  frameIntervalMs?: number;
  onStatusChange?: (status: ConnectionStatus) => void;
  onIdentityChange?: (identity: IdentityStatus) => void;
}

const getWsUrl = () => {
  if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "127.0.0.1";
  return `ws://${host}:8000`;
};

/**
 * Streams JPEG frames from webcam or DroidCam IP stream to the backend AI pipeline.
 */
export const CameraFeed: React.FC<CameraFeedProps> = ({
  patientId,
  wsUrl,
  streamUrl,
  frameIntervalMs = 200,
  onStatusChange,
  onIdentityChange,
}) => {
  const effectiveWsUrl = wsUrl || getWsUrl();
  const webcamRef = useRef<Webcam>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [customStreamUrl, setCustomStreamUrl] = useState<string>(streamUrl ?? "");
  const [useIpStream, setUseIpStream] = useState<boolean>(!!streamUrl);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [identity, setIdentity] = useState<IdentityStatus>({
    status: "uncalibrated",
    similarity: 0,
    threshold: 0.75,
  });
  const identityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs for callbacks to avoid re-triggering the WebSocket effect on every render
  const onStatusChangeRef = useRef(onStatusChange);
  const onIdentityChangeRef = useRef(onIdentityChange);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);
  useEffect(() => { onIdentityChangeRef.current = onIdentityChange; }, [onIdentityChange]);

  // Enumerate video input devices (e.g. DroidCam Source 1, DroidCam Source 2, Webcam)
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((devs) => {
      const videoDevs = devs.filter((d) => d.kind === "videoinput");
      setDevices(videoDevs);
      if (videoDevs.length > 0) {
        setSelectedDeviceId((prev) => prev || videoDevs[0].deviceId);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let isComponentMounted = true;

    const connectWebSocket = () => {
      if (!isComponentMounted) return;
      setStatus("connecting");
      onStatusChangeRef.current?.("connecting");

      try {
        const socket = new WebSocket(`${effectiveWsUrl}/ws/camera/${patientId}`);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!isComponentMounted) return;
          setStatus("connected");
          onStatusChangeRef.current?.("connected");

          if (intervalRef.current) clearInterval(intervalRef.current);

          if (useIpStream && customStreamUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = customStreamUrl;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            intervalRef.current = setInterval(() => {
              if (img.complete && img.naturalWidth > 0 && ctx && socket.readyState === WebSocket.OPEN) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                socket.send(canvas.toDataURL("image/jpeg", 0.7));
              }
            }, frameIntervalMs);
          } else {
            intervalRef.current = setInterval(() => {
              const frame = webcamRef.current?.getScreenshot();
              if (frame && socket.readyState === WebSocket.OPEN) {
                socket.send(frame);
              }
            }, frameIntervalMs);
          }
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === "identity") {
              const next: IdentityStatus = {
                status: msg.status as "matched" | "unknown",
                similarity: msg.similarity ?? 0,
                threshold: msg.threshold ?? 0.75,
              };
              setIdentity(next);
              onIdentityChangeRef.current?.(next);
              if (identityTimeoutRef.current) clearTimeout(identityTimeoutRef.current);
              identityTimeoutRef.current = setTimeout(() => {
                setIdentity((prev) => ({ ...prev, status: "uncalibrated" }));
              }, 5000);
            }
          } catch {
            // Ignore non-JSON messages
          }
        };

        socket.onclose = () => {
          if (!isComponentMounted) return;
          setStatus("disconnected");
          onStatusChangeRef.current?.("disconnected");
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Reconnect after 3 seconds (increased from 2 to reduce connection storm)
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          // onerror is always followed by onclose, which handles reconnect
          socket.close();
        };
      } catch {
        if (!isComponentMounted) return;
        setStatus("disconnected");
        onStatusChangeRef.current?.("disconnected");
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (identityTimeoutRef.current) clearTimeout(identityTimeoutRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  // Only reconnect when these stable values change, NOT on callback identity changes
  }, [patientId, effectiveWsUrl, frameIntervalMs, useIpStream, customStreamUrl, selectedDeviceId]);

  const identityConfig = {
    matched:      { dot: "bg-emerald-400",          text: "text-emerald-300", border: "border-emerald-400/40", bg: "bg-emerald-900/60", label: "Identity Verified", icon: "✅" },
    unknown:      { dot: "bg-red-400 animate-ping", text: "text-red-300",     border: "border-red-400/40",     bg: "bg-red-900/60",     label: "Unknown Person",   icon: "🚫" },
    uncalibrated: { dot: "bg-slate-400",            text: "text-slate-300",   border: "border-slate-500/40",   bg: "bg-slate-900/60",   label: "Face ID Inactive", icon: "👤" },
  };

  const cfg = identityConfig[identity.status];

  return (
    <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden group">
      {useIpStream && customStreamUrl ? (
        <img
          src={customStreamUrl}
          alt="DroidCam Stream"
          className="w-full h-full object-cover"
          onError={() => { setStatus("disconnected"); onStatusChangeRef.current?.("disconnected"); }}
        />
      ) : (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.7}
          videoConstraints={selectedDeviceId ? { deviceId: selectedDeviceId } : { facingMode: "user" }}
          className="w-full h-full object-cover"
          mirrored
        />
      )}

      {/* Device / DroidCam Source Bar (hover) */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur rounded-lg p-1.5 flex gap-2 text-xs border border-white/10 z-10">
        <select
          value={useIpStream ? "droidcam_ip" : selectedDeviceId}
          onChange={(e) => {
            if (e.target.value === "droidcam_ip") {
              setUseIpStream(true);
            } else {
              setUseIpStream(false);
              setSelectedDeviceId(e.target.value);
            }
          }}
          className="bg-slate-800 text-white text-[11px] rounded px-2 py-1 border border-white/20"
        >
          {devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              📹 {d.label || `Camera ${i + 1}`}
            </option>
          ))}
          <option value="droidcam_ip">📱 DroidCam IP Feed (HTTP)</option>
        </select>

        {useIpStream && (
          <input
            type="text"
            placeholder="http://192.168.1.50:4747/video"
            value={customStreamUrl}
            onChange={(e) => setCustomStreamUrl(e.target.value)}
            className="bg-slate-900 border border-white/20 text-white text-[11px] rounded px-2 py-1 w-44 font-mono"
          />
        )}
      </div>

      {/* Connection status */}
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
        <span
          className={`h-2 w-2 rounded-full ${
            status === "connected"
              ? "bg-emerald-400"
              : status === "connecting"
              ? "bg-amber-400 animate-pulse"
              : "bg-red-400"
          }`}
        />
        <span className="text-white text-xs font-medium capitalize">{status}</span>
      </div>

      {/* Identity status */}
      <div
        className={`absolute bottom-3 left-3 flex items-center gap-2 backdrop-blur-sm
                    rounded-xl px-3 py-2 border transition-all duration-500
                    ${cfg.bg} ${cfg.border}`}
      >
        <span className="text-base leading-none">{cfg.icon}</span>
        <div>
          <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
          {identity.status !== "uncalibrated" && (
            <p className="text-slate-400 text-[10px] mt-0.5">
              Similarity: {(identity.similarity * 100).toFixed(0)}%
              {" · "}
              Threshold: {(identity.threshold * 100).toFixed(0)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraFeed;
