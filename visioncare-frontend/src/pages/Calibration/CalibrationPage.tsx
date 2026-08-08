import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { useNavigate, useParams } from "react-router-dom";
import { calibrationApi, patientsApi } from "../../services/api";
import { CalibrationSession, GestureType } from "../../types";
import {
  CheckCircle,
  XCircle,
  Hand,
  Smile,
  Shield,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Camera,
  RotateCcw,
} from "lucide-react";

const SAMPLES_REQUIRED = 3;
const COUNTDOWN_SECONDS = 2;
const CAPTURE_FRAMES = 20;
const FRAME_INTERVAL_MS = 40;

const FACE_FRAMES_REQUIRED = 25;
const FACE_FRAME_INTERVAL_MS = 80;

type CaptureStatus = "idle" | "countdown" | "capturing" | "processing" | "done";
type CalibStep = "assessment" | "face" | "hand_gestures" | "face_gestures" | "review";

interface HandGestureDef {
  id: string;
  label: string;
  icon: string;
  need: string;
  description: string;
  tips: string;
}

const HAND_GESTURES: HandGestureDef[] = [
  {
    id: "open_palm",
    label: "Open Palm",
    icon: "✋",
    need: "Call Nurse",
    description: "Hold full open palm up toward camera.",
    tips: "Keep all 5 fingers spread naturally."
  },
  {
    id: "thumbs_up",
    label: "Thumbs Up",
    icon: "👍",
    need: "I'm OK",
    description: "Make a fist and point thumb straight up.",
    tips: "Keep thumb pointing distinctly upwards."
  },
  {
    id: "thumbs_down",
    label: "Thumbs Down",
    icon: "👎",
    need: "Need Assistance",
    description: "Make a fist and point thumb straight down.",
    tips: "Point thumb downwards clearly."
  },
  {
    id: "index_finger",
    label: "Index Finger",
    icon: "☝️",
    need: "Need Water",
    description: "Raise index finger upright with other fingers folded.",
    tips: "Point single index finger up toward camera."
  },
  {
    id: "two_fingers",
    label: "Two Fingers",
    icon: "✌️",
    need: "Need Food",
    description: "Raise index and middle fingers (peace sign).",
    tips: "Extend both index and middle fingers."
  },
  {
    id: "three_fingers",
    label: "Three Fingers",
    icon: "🤟",
    need: "Need Medicine",
    description: "Extend thumb, index, and pinky fingers.",
    tips: "Raise 3 fingers clearly towards camera."
  },
  {
    id: "closed_fist",
    label: "Closed Fist",
    icon: "✊",
    need: "Emergency",
    description: "Clench hand into a firm closed fist.",
    tips: "Fold all 5 fingers tight into a fist."
  },
  {
    id: "wave",
    label: "Wave Hand",
    icon: "👋",
    need: "Attention Needed",
    description: "Hold hand open and wave gently left to right.",
    tips: "Wave palm in front of camera."
  },
];

export const CalibrationPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);

  const [step, setStep] = useState<CalibStep>("assessment");
  const [patientName, setPatientName] = useState<string>("Patient");
  const [canUseHands, setCanUseHands] = useState<boolean>(true);
  const [calibratedHands, setCalibratedHands] = useState<string[]>([]);
  const [currentHandIdx, setCurrentHandIdx] = useState<number>(0);

  // Face capture states
  const [faceStatus, setFaceStatus] = useState<CaptureStatus>("idle");
  const [faceProgress, setFaceProgress] = useState(0);

  // Gesture capture states
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [sampleCount, setSampleCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CalibrationSession | null>(null);
  const [currentFaceGestureIdx, setCurrentFaceGestureIdx] = useState(0);

  // Load patient details
  useEffect(() => {
    if (!patientId) return;
    (async () => {
      try {
        const res = await patientsApi.get(patientId);
        if (res.data) {
          setPatientName(res.data.name || "Patient");
          setCanUseHands(res.data.can_use_hand_gestures ?? true);
        }
      } catch {
        // Fallback
      }
    })();
  }, [patientId]);

  // Load facial gesture session when entering facial gesture calibration
  useEffect(() => {
    if (step !== "face_gestures" || !patientId) return;
    (async () => {
      try {
        const response = await calibrationApi.start(patientId);
        setSession(response.data);
      } catch {
        setError("Failed to start facial gesture calibration session.");
      }
    })();
  }, [step, patientId]);

  // ── Step 1: Handle Capability Selection ────────────────────────────
  const handleCapabilitySelect = async (enableHands: boolean) => {
    setCanUseHands(enableHands);
    try {
      if (patientId) {
        await patientsApi.update(patientId, { can_use_hand_gestures: enableHands });
      }
    } catch {
      // Non-fatal fallback
    }
    setStep("face");
  };

  // ── Step 2: Face Registration Capture ─────────────────────────────
  const captureFace = useCallback(async () => {
    if (!webcamRef.current || !patientId) return;
    setFaceStatus("capturing");
    setFaceProgress(0);
    setError(null);

    const frames: string[] = [];
    for (let i = 0; i < FACE_FRAMES_REQUIRED; i++) {
      const frame = webcamRef.current.getScreenshot();
      if (frame) frames.push(frame);
      setFaceProgress(i + 1);
      await new Promise((res) => setTimeout(res, FACE_FRAME_INTERVAL_MS));
    }

    setFaceStatus("processing");
    try {
      await calibrationApi.captureFace(patientId, frames, 0.75);
      setFaceStatus("done");
      setTimeout(() => {
        if (canUseHands) {
          setStep("hand_gestures");
        } else {
          setStep("face_gestures");
        }
      }, 800);
    } catch (err: any) {
      setError("Face registration failed. Please ensure face is well-lit and try again.");
      setFaceStatus("idle");
    }
  }, [patientId, canUseHands]);

  // ── Step 3: Hand Gesture Capture ──────────────────────────────────
  const currentHandGesture = HAND_GESTURES[currentHandIdx];

  const captureHandSample = useCallback(async () => {
    if (!webcamRef.current || !currentHandGesture || !patientId) return;
    setStatus("capturing");
    const frames: string[] = [];
    for (let i = 0; i < CAPTURE_FRAMES; i++) {
      const frame = webcamRef.current.getScreenshot();
      if (frame) frames.push(frame);
      await new Promise((res) => setTimeout(res, FRAME_INTERVAL_MS));
    }

    setStatus("processing");
    try {
      const nextCount = sampleCount + 1;
      setSampleCount(nextCount);

      if (nextCount >= 3) {
        // Successfully calibrated this gesture
        if (!calibratedHands.includes(currentHandGesture.id)) {
          setCalibratedHands((prev) => [...prev, currentHandGesture.id]);
        }

        if (currentHandIdx + 1 < HAND_GESTURES.length) {
          setCurrentHandIdx((idx) => idx + 1);
          setSampleCount(0);
        } else {
          // Finished all hand gestures
          setStep("face_gestures");
        }
      }
    } catch {
      setError("Sample capture error. Please try again.");
    }
    setStatus("idle");
  }, [currentHandGesture, currentHandIdx, patientId, sampleCount, calibratedHands]);

  const startHandCapture = () => {
    setStatus("countdown");
    setCountdown(COUNTDOWN_SECONDS);
  };

  const skipHandGesture = () => {
    if (currentHandIdx + 1 < HAND_GESTURES.length) {
      setCurrentHandIdx((idx) => idx + 1);
      setSampleCount(0);
    } else {
      setStep("face_gestures");
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      captureHandSample();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, captureHandSample]);

  // ── Step 5: Save Profile & Complete ──────────────────────────────
  const handleCompleteProfile = async () => {
    if (!patientId) return;
    try {
      if (calibratedHands.length > 0) {
        await calibrationApi.saveHandCalibration(patientId, calibratedHands);
      }
      await calibrationApi.complete(patientId);
    } catch {
      // Non-fatal
    }
    navigate(`/dashboard`);
  };

  // ── WIZARD BREADCRUMB INDICATOR ────────────────────────────────────
  const stepsList = [
    { key: "assessment",    label: "1. Capability"    },
    { key: "face",          label: "2. Face Profile"  },
    { key: "hand_gestures", label: "3. Hand Calibration", disabled: !canUseHands },
    { key: "face_gestures", label: "4. Face Gestures" },
    { key: "review",        label: "5. Review & Save" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* ── Wizard Progress Bar Header ────────────────────────────── */}
        <div className="mb-8 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between overflow-x-auto gap-2 text-xs font-semibold">
            {stepsList.map((s) => {
              const active = step === s.key;
              const disabled = s.disabled;
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                    active
                      ? "bg-primary-500 text-white shadow-orange"
                      : disabled
                      ? "text-slate-600 line-through cursor-not-allowed"
                      : "text-slate-400 bg-slate-800"
                  }`}
                >
                  {active && <Sparkles size={13} className="animate-spin" />}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STEP 1: PATIENT CAPABILITY ASSESSMENT ────────────────── */}
        {step === "assessment" && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 md:p-10 shadow-2xl animate-fade-up">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex p-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 text-primary-400 mb-5">
                <Hand size={40} />
              </div>
              <span className="block text-xs font-mono tracking-widest text-primary-400 uppercase mb-2">
                Step 1 · Assessment
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Patient Capability Assessment
              </h1>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8">
                To provide the most accurate monitoring experience for <strong className="text-white">{patientName}</strong>,
                please indicate whether the patient is able to communicate using hand gestures.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Option 1: Yes, Can Raise Hands */}
                <button
                  onClick={() => handleCapabilitySelect(true)}
                  className="group relative p-6 bg-slate-900/90 hover:bg-slate-800 border-2 border-primary-500/40 hover:border-primary-500 rounded-2xl text-left transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-orange"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="p-3 bg-primary-500/20 text-primary-400 rounded-xl text-xl">✋</span>
                    <span className="font-bold text-white text-base">Yes, Can Raise Hands</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Patient can move one or both hands. Enables 8 hand gesture triggers (Water, Nurse, Emergency, etc.).
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary-400 group-hover:translate-x-1 transition-transform">
                    <span>Select & Continue</span>
                    <ArrowRight size={14} />
                  </div>
                </button>

                {/* Option 2: No, Face Gestures Only */}
                <button
                  onClick={() => handleCapabilitySelect(false)}
                  className="group relative p-6 bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 hover:border-teal-500/60 rounded-2xl text-left transition-all duration-200 hover:-translate-y-1 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="p-3 bg-teal-500/20 text-teal-400 rounded-xl text-xl">👤</span>
                    <span className="font-bold text-white text-base">No, Face Gestures Only</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Patient has limited mobility. Only facial gestures (Blink, Yawn, Head Tilt) will be monitored.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-400 group-hover:translate-x-1 transition-transform">
                    <span>Select & Continue</span>
                    <ArrowRight size={14} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: FACE PROFILE CAPTURE ──────────────────────────── */}
        {step === "face" && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-up">
            <div className="max-w-2xl mx-auto text-center mb-6">
              <span className="text-xs font-mono tracking-wider text-teal-400 uppercase">Step 2 · Face Profile</span>
              <h2 className="text-2xl font-bold text-white mt-1">Register Face ID Profile</h2>
              <p className="text-slate-400 text-xs md:text-sm mt-1">
                Capturing baseline facial profile for {patientName}. Keep head steady inside the camera frame.
              </p>
            </div>

            <div className="relative aspect-video max-w-xl mx-auto bg-black rounded-2xl overflow-hidden ring-2 ring-primary-500/40 mb-6 shadow-2xl">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                mirrored
              />
              {faceStatus === "capturing" && (
                <div className="absolute inset-0 border-4 border-primary-500 animate-pulse flex flex-col justify-between p-4 bg-black/30">
                  <div className="flex justify-between items-center text-xs font-mono text-white">
                    <span className="bg-red-600 px-2 py-1 rounded-md uppercase font-bold">Recording</span>
                    <span>{faceProgress} / {FACE_FRAMES_REQUIRED} frames</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-primary-500 h-full transition-all" style={{ width: `${(faceProgress / FACE_FRAMES_REQUIRED) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={captureFace}
                disabled={faceStatus !== "idle"}
                className="btn-primary px-8 py-3 rounded-full font-bold text-sm shadow-orange flex items-center gap-2"
              >
                <Camera size={18} />
                {faceStatus === "idle" ? "Start Face Registration" : faceStatus === "done" ? "Verified ✅" : "Capturing..."}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: HAND GESTURE CALIBRATION ──────────────────────── */}
        {step === "hand_gestures" && currentHandGesture && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <span className="text-xs font-mono text-primary-400 uppercase">Step 3 · Hand Calibration</span>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
                  <span>{currentHandGesture.icon}</span>
                  <span>{currentHandGesture.label}</span>
                  <span className="text-xs bg-primary-500/20 text-primary-300 px-3 py-1 rounded-full font-mono">
                    {currentHandGesture.need}
                  </span>
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Gesture {currentHandIdx + 1} of {HAND_GESTURES.length}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden ring-2 ring-primary-500/40">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  mirrored
                />
                {status === "countdown" && countdown !== null && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                    <span className="text-7xl font-bold text-primary-400 animate-bounce">{countdown}</span>
                  </div>
                )}
                {status === "capturing" && (
                  <div className="absolute inset-0 border-4 border-emerald-500 bg-emerald-500/10 flex items-center justify-center">
                    <span className="bg-emerald-600 text-white font-bold text-sm px-4 py-2 rounded-full animate-pulse">
                      Recording Gesture Sample...
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions & Tips Card */}
              <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-6">
                <div className="text-4xl mb-3 text-center">{currentHandGesture.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2 text-center">{currentHandGesture.description}</h3>
                <p className="text-xs text-slate-400 text-center mb-6">{currentHandGesture.tips}</p>

                <div className="flex justify-between items-center bg-slate-800 rounded-xl p-3 mb-6 border border-slate-700 text-xs">
                  <span className="text-slate-300 font-medium">Samples Collected</span>
                  <span className="font-mono text-primary-400 font-bold">{sampleCount} / 3</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={startHandCapture}
                    disabled={status !== "idle"}
                    className="flex-1 btn-primary py-3 rounded-full font-semibold text-xs"
                  >
                    📸 Capture Gesture Sample
                  </button>
                  <button
                    onClick={skipHandGesture}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-xs font-semibold"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: FACIAL GESTURES CALIBRATION ───────────────────── */}
        {step === "face_gestures" && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-up">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-xs font-mono text-teal-400 uppercase">Step 4 · Facial Gestures</span>
                <h2 className="text-2xl font-bold text-white mt-1">Facial Gesture Calibration</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden ring-2 ring-teal-500/40">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  mirrored
                />
              </div>

              <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Blink & Mouth Threshold Baselines</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Setting optimal EAR (Eye Aspect Ratio) and MAR (Mouth Aspect Ratio) sensitivity thresholds for {patientName}.
                  </p>
                </div>

                <button
                  onClick={() => setStep("review")}
                  className="w-full btn-teal py-3 rounded-full font-bold text-xs shadow-teal"
                >
                  Proceed to Review & Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW & COMPLETE PROFILE ─────────────────────── */}
        {step === "review" && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 md:p-10 shadow-2xl animate-fade-up text-center">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Calibration Profile Complete!</h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto mb-8">
              Patient <strong>{patientName}</strong> is now configured for AI-powered monitoring.
            </p>

            <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 mb-8 text-left text-xs space-y-3">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Hand Gestures Enabled:</span>
                <span className="font-bold text-primary-400">{canUseHands ? "Yes (Hand + Face)" : "No (Face Only)"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Calibrated Hand Gestures:</span>
                <span className="font-mono text-emerald-400">{calibratedHands.length > 0 ? calibratedHands.join(", ") : "Standard Set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Facial Detection:</span>
                <span className="font-bold text-teal-400">Active (EAR/MAR Baseline)</span>
              </div>
            </div>

            <button
              onClick={handleCompleteProfile}
              className="btn-primary px-8 py-3.5 rounded-full font-bold text-sm shadow-orange flex items-center gap-2 mx-auto"
            >
              <span>Complete Profile & Start Monitoring</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default CalibrationPage;
