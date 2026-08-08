import { NeedType, RequestStatus } from "../types";

export interface NeedConfigEntry {
  icon: string;
  label: string;
  badgeClass: string;
  ringClass?: string;
}

export const NEED_CONFIG: Record<NeedType, NeedConfigEntry> = {
  water: {
    icon: "💧",
    label: "Water",
    badgeClass: "bg-signal-teal/10 text-signal-teal",
  },
  food: {
    icon: "🍽️",
    label: "Food",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  nurse: {
    icon: "👩‍⚕️",
    label: "Nurse",
    badgeClass: "bg-violet-100 text-violet-800",
  },
  pain: {
    icon: "⚠️",
    label: "Pain",
    badgeClass: "bg-signal-coral/10 text-signal-coral",
    ringClass: "ring-2 ring-signal-coral",
  },
  washroom: {
    icon: "🚻",
    label: "Washroom",
    badgeClass: "bg-signal-amber/10 text-signal-amber",
  },
  emergency: {
    icon: "🚨",
    label: "Emergency",
    badgeClass: "bg-signal-coral text-white",
    ringClass: "ring-2 ring-signal-coral",
  },
  yes: {
    icon: "👍",
    label: "Yes",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  no: {
    icon: "👎",
    label: "No",
    badgeClass: "bg-rose-100 text-rose-800",
  },
  other: {
    icon: "💬",
    label: "Other Need",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  medicine: {
    icon: "🤟",
    label: "Medicine",
    badgeClass: "bg-purple-100 text-purple-800",
    ringClass: "ring-2 ring-purple-400",
  },
  ok: {
    icon: "👍",
    label: "Patient OK",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  assistance: {
    icon: "👎",
    label: "Assistance",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  attention: {
    icon: "👋",
    label: "Attention",
    badgeClass: "bg-indigo-100 text-indigo-800",
  },
};

export function getNeedConfig(needKey: string | null | undefined): NeedConfigEntry {
  if (!needKey) {
    return { icon: "💬", label: "Request", badgeClass: "bg-blue-100 text-blue-800", ringClass: "" };
  }
  const key = String(needKey).toLowerCase().trim() as NeedType;
  if (NEED_CONFIG[key]) {
    return NEED_CONFIG[key];
  }
  // Hand gesture string fallbacks
  if (key.includes("palm") || key.includes("hand")) {
    return { icon: "✋", label: "Call Nurse", badgeClass: "bg-violet-100 text-violet-800", ringClass: "" };
  }
  if (key.includes("thumb") || key.includes("up")) {
    return { icon: "👍", label: "Patient OK", badgeClass: "bg-emerald-100 text-emerald-800", ringClass: "" };
  }
  if (key.includes("fist")) {
    return { icon: "✊", label: "Emergency", badgeClass: "bg-red-100 text-red-800", ringClass: "ring-2 ring-red-400" };
  }
  if (key.includes("wave")) {
    return { icon: "👋", label: "Attention", badgeClass: "bg-indigo-100 text-indigo-800", ringClass: "" };
  }
  return {
    icon: "💬",
    label: String(needKey).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    badgeClass: "bg-blue-100 text-blue-800",
    ringClass: "",
  };
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  false_positive: "False positive",
};

export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
