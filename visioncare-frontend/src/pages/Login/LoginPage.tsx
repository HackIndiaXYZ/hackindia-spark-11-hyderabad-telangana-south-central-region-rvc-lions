import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/api";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Zap,
  Activity,
  CheckCircle,
} from "lucide-react";

const ADMIN_ROLES = ["super_admin", "hospital_admin"];

// ── Feature list shown on the left panel ─────────────────────────────────────
const FEATURES = [
  { icon: <Eye size={18} />,      title: "Computer Vision",  desc: "Real-time blink, yawn & gesture detection" },
  { icon: <Activity size={18} />, title: "Live Monitoring",  desc: "24/7 AI-powered patient surveillance"       },
  { icon: <Shield size={18} />,   title: "HIPAA Compliant",  desc: "Enterprise-grade security & audit logs"    },
  { icon: <Zap size={18} />,      title: "Instant Alerts",   desc: "WebSocket push for sub-second response"   },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email,        setEmail]        = useState("nurse@visioncare.com");
  const [password,     setPassword]     = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Get token
      const res   = await authApi.login(cleanEmail, password);
      const token = res.data.access_token;
      localStorage.setItem("vc_access_token", token);

      // 2. Fetch user profile (with a short timeout safety net)
      let role = "nurse";
      try {
        const meRes = await authApi.me();
        const user  = meRes.data;
        if (user.id)      localStorage.setItem("vc_nurse_id",   String(user.id));
        if (user.name)    localStorage.setItem("vc_nurse_name", user.name);
        if (user.ward_id) localStorage.setItem("vc_ward_id",    user.ward_id);
        if (user.role)    localStorage.setItem("vc_role",       user.role);
        role = user.role ?? "nurse";
      } catch {
        // me() failed — still navigate using token, App.tsx will fetch profile
        role = localStorage.getItem("vc_role") ?? "nurse";
      }

      // 3. Role-based redirect
      if (ADMIN_ROLES.includes(role)) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      if (!err.response) {
        setError("Cannot reach the server. Make sure the backend is running on port 8000.");
      } else {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Invalid email or password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* ── Left Branded Panel (desktop only) ──────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12"
        style={{ background: "linear-gradient(145deg,#0f172a 0%,#1e293b 40%,#0f1f2b 100%)" }}
      >
        {/* Ambient blobs */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl animate-float"
          style={{ background: "radial-gradient(circle,#f97316,transparent)" }}
        />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl animate-float"
          style={{ background: "radial-gradient(circle,#14b8a6,transparent)", animationDelay: "2s" }}
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-orange-glow"
              style={{ background: "linear-gradient(135deg,#f97316,#14b8a6)" }}
            >
              <Eye size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xl tracking-tight">
                VisionCare <span className="text-gradient-orange">AI</span>
              </p>
              <p className="text-slate-400 text-xs">Medical AI Platform</p>
            </div>
          </div>
        </div>

        {/* Main headline */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              AI-Powered Patient{" "}
              <span className="text-gradient-orange">Monitoring</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Empowering nurses with real-time computer vision to detect patient needs
              before they become emergencies.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(249,115,22,0.15)" }}
                >
                  <span className="text-primary-400">{f.icon}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <p className="relative z-10 text-slate-500 text-xs">
          © 2025 VisionCare AI · HIPAA Compliant · Powered by Computer Vision
        </p>
      </div>

      {/* ── Right Form Panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f97316,#14b8a6)" }}
            >
              <Eye size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              VisionCare <span className="text-primary-500">AI</span>
            </span>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
              Welcome back
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Sign in to your account to access the dashboard
            </p>
          </div>

          {/* Form card */}
          <div className="card p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email */}
              <div>
                <label className="label" htmlFor="login-email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11"
                    placeholder="nurse@hospital.org"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="label" htmlFor="login-password">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-11 pr-12"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-sm animate-fade-in"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  {error}
                </div>
              )}

              {/* Default creds hint */}
              <div className="p-3.5 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/40 rounded-xl text-xs text-primary-700 dark:text-primary-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-primary-600 dark:text-primary-400 mb-1.5">
                  <CheckCircle size={12} />
                  Demo Credentials
                </div>
                <p><span className="font-semibold">Nurse:</span> nurse@visioncare.com / password123</p>
                <p><span className="font-semibold">Admin:</span> admin@visioncare.com / admin123</p>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 text-base"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-6">
            Secure Healthcare Platform · Computer Vision AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
