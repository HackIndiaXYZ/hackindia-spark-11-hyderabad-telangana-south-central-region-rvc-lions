// ── Mock data – replace with real API calls once backend endpoints exist ──

export type AlertPriority = "critical" | "high" | "medium" | "low";

export interface MockAlert {
  id: string;
  patientId: string;
  patientName: string;
  bedNumber: string;
  message: string;
  priority: AlertPriority;
  timestamp: Date;
  resolved: boolean;
}

export interface MockDoctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  avatarInitials: string;
}

export interface MockPatientRecord {
  id: string;           // e.g. "PID-0001"
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  bedNumber: string;
  wardId: string;
  condition: string;
  admissionReason: string;
  admittedOn: string;
  doctorId: string;
  billingTotal: number;
  billingPaid: number;
  billingStatus: "Paid" | "Partial" | "Pending";
  insuranceProvider?: string;
  isActive: boolean;
}

// ── Doctors ──────────────────────────────────────────────────────────────────
export const MOCK_DOCTORS: MockDoctor[] = [
  { id: "DR-001", name: "Dr. Ananya Krishnan", specialty: "Neurology",       phone: "+91 98400 11001", email: "a.krishnan@visioncare.in", avatarInitials: "AK" },
  { id: "DR-002", name: "Dr. Rajan Mehta",     specialty: "Cardiology",      phone: "+91 98400 11002", email: "r.mehta@visioncare.in",    avatarInitials: "RM" },
  { id: "DR-003", name: "Dr. Priya Nair",      specialty: "Orthopaedics",    phone: "+91 98400 11003", email: "p.nair@visioncare.in",     avatarInitials: "PN" },
  { id: "DR-004", name: "Dr. Suresh Babu",     specialty: "General Surgery", phone: "+91 98400 11004", email: "s.babu@visioncare.in",     avatarInitials: "SB" },
];

// ── Patients ─────────────────────────────────────────────────────────────────
export const MOCK_PATIENTS: MockPatientRecord[] = [
  {
    id: "PID-0001", name: "Ramesh Kumar",    age: 67, gender: "Male",
    bedNumber: "ICU-1A", wardId: "ICU-1",
    condition: "Stroke", admissionReason: "Ischaemic stroke with right-sided weakness and aphasia",
    admittedOn: "2026-07-28", doctorId: "DR-001",
    billingTotal: 85000, billingPaid: 50000, billingStatus: "Partial",
    insuranceProvider: "Star Health", isActive: true,
  },
  {
    id: "PID-0002", name: "Meena Devi",      age: 54, gender: "Female",
    bedNumber: "ICU-1B", wardId: "ICU-1",
    condition: "ALS", admissionReason: "Progressive bulbar palsy – respiratory monitoring",
    admittedOn: "2026-07-15", doctorId: "DR-001",
    billingTotal: 120000, billingPaid: 120000, billingStatus: "Paid",
    insuranceProvider: "HDFC ERGO", isActive: true,
  },
  {
    id: "PID-0003", name: "Suresh Pillai",   age: 72, gender: "Male",
    bedNumber: "ICU-1C", wardId: "ICU-1",
    condition: "Post Surgery", admissionReason: "Post-CABG recovery with ventricular monitoring",
    admittedOn: "2026-08-01", doctorId: "DR-002",
    billingTotal: 200000, billingPaid: 100000, billingStatus: "Partial",
    insuranceProvider: "National Insurance", isActive: true,
  },
  {
    id: "PID-0004", name: "Lakshmi Raj",     age: 48, gender: "Female",
    bedNumber: "ICU-2A", wardId: "ICU-2",
    condition: "Paralysis", admissionReason: "Spinal cord injury – C4 complete tetraplegia",
    admittedOn: "2026-07-20", doctorId: "DR-003",
    billingTotal: 95000, billingPaid: 0, billingStatus: "Pending",
    isActive: true,
  },
  {
    id: "PID-0005", name: "Arun Vijayan",    age: 61, gender: "Male",
    bedNumber: "ICU-2B", wardId: "ICU-2",
    condition: "Elderly", admissionReason: "Hip fracture repair – post-operative care",
    admittedOn: "2026-08-03", doctorId: "DR-003",
    billingTotal: 65000, billingPaid: 65000, billingStatus: "Paid",
    insuranceProvider: "LIC Health", isActive: true,
  },
  {
    id: "PID-0006", name: "Deepa Mohan",     age: 39, gender: "Female",
    bedNumber: "WARD-3A", wardId: "WARD-3",
    condition: "Post Surgery", admissionReason: "Appendectomy – routine recovery",
    admittedOn: "2026-08-05", doctorId: "DR-004",
    billingTotal: 35000, billingPaid: 35000, billingStatus: "Paid",
    isActive: true,
  },
];

// ── Alerts (priority sorted helper) ──────────────────────────────────────────
export const PRIORITY_ORDER: Record<AlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const MOCK_ALERTS: MockAlert[] = [
  {
    id: "ALT-001", patientId: "PID-0001", patientName: "Ramesh Kumar",
    bedNumber: "ICU-1A", message: "Severe pain – emergency gesture detected",
    priority: "critical", timestamp: new Date(Date.now() - 2 * 60000), resolved: false,
  },
  {
    id: "ALT-002", patientId: "PID-0003", patientName: "Suresh Pillai",
    bedNumber: "ICU-1C", message: "Requests nurse assistance",
    priority: "high", timestamp: new Date(Date.now() - 5 * 60000), resolved: false,
  },
  {
    id: "ALT-003", patientId: "PID-0002", patientName: "Meena Devi",
    bedNumber: "ICU-1B", message: "Needs water",
    priority: "medium", timestamp: new Date(Date.now() - 8 * 60000), resolved: false,
  },
  {
    id: "ALT-004", patientId: "PID-0004", patientName: "Lakshmi Raj",
    bedNumber: "ICU-2A", message: "Washroom assistance requested",
    priority: "medium", timestamp: new Date(Date.now() - 12 * 60000), resolved: false,
  },
  {
    id: "ALT-005", patientId: "PID-0005", patientName: "Arun Vijayan",
    bedNumber: "ICU-2B", message: "Requests food",
    priority: "low", timestamp: new Date(Date.now() - 20 * 60000), resolved: false,
  },
];

export function getSortedAlerts(alerts: MockAlert[]): MockAlert[] {
  return [...alerts].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

export function getDoctorById(id: string): MockDoctor | undefined {
  return MOCK_DOCTORS.find((d) => d.id === id);
}
