import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  Users,
  UserPlus,
  Activity,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sun,
  Moon,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",       icon: <LayoutDashboard size={18} />, path: "/dashboard"  },
  { label: "Live Monitoring", icon: <Video           size={18} />, path: "/monitoring" },
  { label: "Patients",        icon: <Users           size={18} />, path: "/patients"   },
  { label: "Add Patient",     icon: <UserPlus        size={18} />, path: "/add-patient"},
  { label: "Detections",      icon: <Activity        size={18} />, path: "/detections" },
  { label: "Alerts",          icon: <Bell            size={18} />, path: "/alerts"     },
  { label: "Analytics",       icon: <BarChart3       size={18} />, path: "/analytics"  },
  { label: "Settings",        icon: <Settings        size={18} />, path: "/settings"   },
];

interface SidebarProps {
  nurseName?: string;
  wardId?: string;
  dark: boolean;
  onToggleDark: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ── Nav Link Item ─────────────────────────────────────────────────────────────
function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 group
        ${active
          ? "bg-gradient-to-r from-primary-500/15 to-primary-500/5 text-primary-600 dark:text-primary-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-100"
        }
        ${collapsed ? "justify-center" : ""}
      `}
    >
      {/* Active left border */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-primary-500 to-primary-600" />
      )}

      {/* Icon */}
      <span
        className={`shrink-0 transition-colors duration-200 ${
          active
            ? "text-primary-500"
            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        }`}
      >
        {item.icon}
      </span>

      {/* Label */}
      {!collapsed && (
        <span className="truncate font-medium">{item.label}</span>
      )}
    </Link>
  );
}

// ── Sidebar Inner ─────────────────────────────────────────────────────────────
function SidebarInner({
  nurseName = "Nurse",
  wardId = "ICU-1",
  dark,
  onToggleDark,
  collapsed,
  setCollapsed,
  onMobileClose,
}: {
  nurseName?: string;
  wardId?: string;
  dark: boolean;
  onToggleDark: () => void;
  collapsed: boolean;
  setCollapsed?: (v: boolean) => void;
  onMobileClose?: () => void;
}) {
  const location = useLocation();
  const navigate  = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const initials = nurseName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b border-slate-100 dark:border-slate-700/60 overflow-hidden ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {/* Logo icon */}
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-orange-glow"
          style={{ background: "linear-gradient(135deg,#f97316,#14b8a6)" }}
        >
          <Eye size={18} className="text-white" />
        </div>

        {!collapsed && (
          <div className="overflow-hidden animate-fade-in">
            <p className="text-slate-900 dark:text-white font-bold text-sm leading-tight tracking-tight">
              VisionCare <span className="text-gradient-orange">AI</span>
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs truncate">Ward {wardId}</p>
          </div>
        )}

        {/* Mobile close */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto no-scrollbar"
        role="navigation"
        aria-label="Main navigation"
      >
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Menu
          </p>
        )}
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            collapsed={collapsed}
            onClick={onMobileClose}
          />
        ))}
      </nav>

      {/* ── Bottom ──────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-700/60 px-2 py-3 space-y-1">
        {/* Dark mode */}
        <button
          onClick={onToggleDark}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full
            text-slate-500 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-slate-700/60
            hover:text-slate-800 dark:hover:text-slate-100
            transition-all duration-200
            ${collapsed ? "justify-center" : ""}
          `}
        >
          {dark
            ? <Sun size={18} className="text-amber-400 shrink-0" />
            : <Moon size={18} className="text-slate-400 shrink-0" />
          }
          {!collapsed && (
            <span className="animate-fade-in">{dark ? "Light Mode" : "Dark Mode"}</span>
          )}
        </button>

        {/* User profile */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors animate-fade-in">
            <div
              className="avatar w-8 h-8 text-xs shrink-0"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-slate-800 dark:text-slate-100 text-xs font-semibold truncate">{nurseName}</p>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] truncate">Ward {wardId}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full
            text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20
            transition-all duration-200
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="animate-fade-in">Logout</span>}
        </button>
      </div>
    </div>
  );
}

// ── Sidebar (Desktop) ─────────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({
  nurseName = "Nurse",
  wardId = "ICU-1",
  dark,
  onToggleDark,
  mobileOpen = false,
  onMobileClose,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`
          hidden md:flex flex-col relative h-screen shrink-0
          bg-white dark:bg-slate-800
          border-r border-slate-100 dark:border-slate-700/60
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-16 z-10 w-6 h-6 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors shadow-card"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <SidebarInner
          nurseName={nurseName}
          wardId={wardId}
          dark={dark}
          onToggleDark={onToggleDark}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>

      {/* ── Mobile Drawer Overlay ────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 shadow-2xl flex flex-col animate-slide-in z-50">
            <SidebarInner
              nurseName={nurseName}
              wardId={wardId}
              dark={dark}
              onToggleDark={onToggleDark}
              collapsed={false}
              onMobileClose={onMobileClose}
            />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
