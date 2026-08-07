import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, Eye } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  nurseName?: string;
  wardId?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  nurseName,
  wardId,
}) => {
  const [dark, setDark] = useState<boolean>(() => {
    return localStorage.getItem("vc_dark_mode") === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("vc_dark_mode", String(dark));
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Sidebar (handles both desktop + mobile drawer) */}
      <Sidebar
        nurseName={nurseName}
        wardId={wardId}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* ── Mobile top bar ──────────────────────────────────────────── */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f97316,#14b8a6)" }}
            >
              <Eye size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              VisionCare <span className="text-primary-500">AI</span>
            </span>
          </div>
          {wardId && (
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-medium">
              Ward {wardId}
            </span>
          )}
        </header>

        {/* ── Scrollable page content ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
