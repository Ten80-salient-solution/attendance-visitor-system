import type { StaffMember, AttendanceRecord, VisitorRecord, AuditLog, OfficeSettings } from '../types';

// Storage Keys
const KEYS = {
  SETTINGS: 'ten80_settings',
  STAFF: 'ten80_staff',
  ATTENDANCE: 'ten80_attendance',
  VISITORS: 'ten80_visitors',
  AUDIT: 'ten80_audit_logs',
};

// Default Settings: Lagos and Abuja offices
const DEFAULT_SETTINGS: OfficeSettings = {
  offices: [
    { id: 'off-1', name: 'Lagos Head Office', latitude: 6.5244, longitude: 3.3792, radiusMeters: 100 },
    { id: 'off-2', name: 'Abuja Branch Office', latitude: 9.0765, longitude: 7.3986, radiusMeters: 100 },
  ],
  staffQRToken: 'TEN80_STAFF_TOKEN_2026'
};

// Default Avatar (offline SVG inline URI)
export const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%234f46e5'><circle cx='50' cy='35' r='20'/><path d='M10 85C10 65 28 55 50 55S90 65 90 85Z'/></svg>";

// Default Staff
const DEFAULT_STAFF: StaffMember[] = [
  { id: 's1', name: 'Ekene Anyaegbu', phone: '+2348031112222', position: 'Lead Software Architect', profilePicture: DEFAULT_AVATAR, email: 'ekene@ten80.com', employeeId: 'EMP-001', department: 'Engineering', password: 'password123' },
  { id: 's2', name: 'Jane Doe', phone: '+2348032223333', position: 'Operations Director', profilePicture: DEFAULT_AVATAR, email: 'jane@ten80.com', employeeId: 'EMP-002', department: 'Operations', password: 'password123' },
  { id: 's3', name: 'Chidi Okafor', phone: '+2348033334444', position: 'Senior Product Manager', profilePicture: DEFAULT_AVATAR, email: 'chidi@ten80.com', employeeId: 'EMP-003', department: 'Product', password: 'password123' },
  { id: 's4', name: 'Fatima Musa', phone: '+2348034445555', position: 'HR Operations Manager', profilePicture: DEFAULT_AVATAR, email: 'fatima@ten80.com', employeeId: 'EMP-004', department: 'Human Resources', password: 'password123' },
  { id: 's5', name: 'Tunde Bakare', phone: '+2348035556666', position: 'Head of Finance', profilePicture: DEFAULT_AVATAR, email: 'tunde@ten80.com', employeeId: 'EMP-005', department: 'Finance', password: 'password123' },
];

// Seed Attendance Records for Today
const getSeededAttendance = (): AttendanceRecord[] => {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  return [
    {
      id: 'a1',
      staffName: 'Ekene Anyaegbu',
      employeeId: 'EMP-001',
      email: 'ekene@ten80.com',
      department: 'Engineering',
      checkInTime: `${todayStr}T08:15:22.000Z`,
      checkOutTime: null,
      date: todayStr,
      gpsCoordinates: { latitude: 6.52442, longitude: 3.37921 },
      deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'Present (Lagos Head Office)',
    },
    {
      id: 'a2',
      staffName: 'Jane Doe',
      employeeId: 'EMP-002',
      email: 'jane@ten80.com',
      department: 'Operations',
      checkInTime: `${todayStr}T08:52:10.000Z`,
      checkOutTime: `${todayStr}T17:05:40.000Z`,
      date: todayStr,
      gpsCoordinates: { latitude: 6.52445, longitude: 3.37918 },
      deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
      status: 'Present (Lagos Head Office)',
    },
    {
      id: 'a3',
      staffName: 'Chidi Okafor',
      employeeId: 'EMP-003',
      email: 'chidi@ten80.com',
      department: 'Product',
      checkInTime: `${yesterdayStr}T09:05:12.000Z`,
      checkOutTime: `${yesterdayStr}T17:00:00.000Z`,
      date: yesterdayStr,
      gpsCoordinates: { latitude: 9.0768, longitude: 7.3989 },
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'Present (Abuja Branch Office)',
    },
    {
      id: 'a4',
      staffName: 'Chidi Okafor',
      employeeId: 'EMP-003',
      email: 'chidi@ten80.com',
      department: 'Product',
      checkInTime: null,
      checkOutTime: null,
      date: todayStr,
      gpsCoordinates: null,
      deviceInfo: '',
      status: 'Absent',
    },
  ];
};

// Seed Visitors
const getSeededVisitors = (): VisitorRecord[] => {
  const todayStr = new Date().toISOString().split('T')[0];

  return [
    {
      id: 'v1',
      visitorName: 'Alice Johnson',
      phone: '+2348012345678',
      email: 'alice@google.com',
      company: 'Google',
      reasonForVisit: 'Partnership Sync',
      hostEmployee: 'Ekene Anyaegbu',
      checkInTime: `${todayStr}T09:30:00.000Z`,
      checkOutTime: null,
      gpsCoordinates: { latitude: 6.52445, longitude: 3.37925 },
      status: 'Inside',
    },
    {
      id: 'v2',
      visitorName: 'Bob Smith',
      phone: '+2348098765432',
      reasonForVisit: 'Equipment Delivery',
      hostEmployee: 'Fatima Musa',
      checkInTime: `${todayStr}T10:00:00.000Z`,
      checkOutTime: `${todayStr}T10:45:00.000Z`,
      gpsCoordinates: { latitude: 6.52439, longitude: 3.37919 },
      status: 'Checked Out',
    },
  ];
};

// Seed Audit Logs
const getSeededAuditLogs = (): AuditLog[] => {
  const todayStr = new Date().toISOString().split('T')[0];

  return [
    {
      id: 'l1',
      timestamp: `${todayStr}T08:00:00.000Z`,
      actionType: 'SETTINGS_UPDATE',
      userEmail: 'system@ten80.com',
      details: 'System database initialized with default office location and settings.',
    },
    {
      id: 'l2',
      timestamp: `${todayStr}T08:15:22.000Z`,
      actionType: 'CHECK_IN_SUCCESS',
      userEmail: 'ekene@ten80.com',
      details: 'Staff checked in successfully. Distance to office: 4.3 meters.',
      gpsCoordinates: { latitude: 6.52442, longitude: 3.37921 },
    },
    {
      id: 'l3',
      timestamp: `${todayStr}T08:40:15.000Z`,
      actionType: 'CHECK_IN_FAILED',
      userEmail: 'tunde@ten80.com',
      details: 'Staff check-in denied. Geofence violation. Distance: 5320 meters.',
      gpsCoordinates: { latitude: 6.5684, longitude: 3.3211 },
    },
    {
      id: 'l4',
      timestamp: `${todayStr}T08:52:10.000Z`,
      actionType: 'CHECK_IN_SUCCESS',
      userEmail: 'jane@ten80.com',
      details: 'Staff checked in successfully. Distance to office: 7.2 meters.',
      gpsCoordinates: { latitude: 6.52445, longitude: 3.37918 },
    },
  ];
};

// Database Initializer with Schema Migration
export function initDB(): void {
  const existingSettings = localStorage.getItem(KEYS.SETTINGS);
  let needsReset = false;
  if (existingSettings) {
    try {
      const parsed = JSON.parse(existingSettings);
      if ('latitude' in parsed || !('staffQRToken' in parsed)) {
        needsReset = true;
      }
    } catch (e) {
      needsReset = true;
    }
  } else {
    needsReset = true;
  }

  if (needsReset) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(getSeededAttendance()));
    localStorage.setItem(KEYS.AUDIT, JSON.stringify(getSeededAuditLogs()));
  } else {
    // If staff roster exists, perform field migration for missing properties
    const existingStaff = localStorage.getItem(KEYS.STAFF);
    if (existingStaff) {
      try {
        const staffList: any[] = JSON.parse(existingStaff);
        let migrated = false;
        const updatedStaff = staffList.map(s => {
          const updated = { ...s };
          if (!('password' in updated)) {
            updated.password = 'password123';
            migrated = true;
          }
          if (!('phone' in updated)) {
            updated.phone = '+2348030000000';
            migrated = true;
          }
          if (!('position' in updated)) {
            updated.position = 'Staff Member';
            migrated = true;
          }
          if (!('profilePicture' in updated)) {
            updated.profilePicture = DEFAULT_AVATAR;
            migrated = true;
          }
          return updated;
        });
        if (migrated) {
          localStorage.setItem(KEYS.STAFF, JSON.stringify(updatedStaff));
        }
      } catch (e) {
        localStorage.setItem(KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
      }
    }
  }

  if (!localStorage.getItem(KEYS.STAFF)) {
    localStorage.setItem(KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(getSeededAttendance()));
  }
  if (!localStorage.getItem(KEYS.VISITORS)) {
    localStorage.setItem(KEYS.VISITORS, JSON.stringify(getSeededVisitors()));
  }
  if (!localStorage.getItem(KEYS.AUDIT)) {
    localStorage.setItem(KEYS.AUDIT, JSON.stringify(getSeededAuditLogs()));
  }
}

// Settings Get/Set
export function getSettings(): OfficeSettings {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.SETTINGS)!);
}

export function saveSettings(settings: OfficeSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  setTimeout(syncWithCloud, 0);
}

// Staff Directory Get/Set/Add/Remove
export function getStaff(): StaffMember[] {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.STAFF)!);
}

export function addStaff(member: StaffMember): void {
  const staff = getStaff();
  staff.push(member);
  localStorage.setItem(KEYS.STAFF, JSON.stringify(staff));
  setTimeout(syncWithCloud, 0);
}

export function saveStaff(staffList: StaffMember[]): void {
  localStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
  setTimeout(syncWithCloud, 0);
}

export function removeStaff(id: string): void {
  const staff = getStaff().filter(s => s.id !== id);
  localStorage.setItem(KEYS.STAFF, JSON.stringify(staff));
  setTimeout(syncWithCloud, 0);
}

// Attendance Records
export function getAttendance(): AttendanceRecord[] {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.ATTENDANCE)!);
}

export function saveAttendance(records: AttendanceRecord[]): void {
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
  setTimeout(syncWithCloud, 0);
}

// Visitors
export function getVisitors(): VisitorRecord[] {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.VISITORS)!);
}

export function saveVisitors(records: VisitorRecord[]): void {
  localStorage.setItem(KEYS.VISITORS, JSON.stringify(records));
  setTimeout(syncWithCloud, 0);
}

// Audit Logs
export function getAuditLogs(): AuditLog[] {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.AUDIT)!);
}

export function addAuditLog(log: Omit<AuditLog, 'id'>): void {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  logs.unshift(newLog); // Put new logs at the beginning
  localStorage.setItem(KEYS.AUDIT, JSON.stringify(logs));
  setTimeout(syncWithCloud, 0);
}

// Cross-device online synchronization layer using kvdb.io
interface SyncState {
  settings?: OfficeSettings;
  staff?: StaffMember[];
  attendance?: AttendanceRecord[];
  visitors?: VisitorRecord[];
  audit?: AuditLog[];
}

const BUCKET_URL = 'https://kvdb.io/LZPkZC8umVfWtLeKrt6zPk/ten80_db';
let isSyncing = false;

export async function syncWithCloud(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    // 1. Fetch current cloud state
    const response = await fetch(BUCKET_URL);
    let cloudData: SyncState = {};
    if (response.ok) {
      const text = await response.text();
      if (text && text.trim()) {
        cloudData = JSON.parse(text);
      }
    }

    // 2. Read local state
    const localSettings = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || 'null') || getSettings();
    const localStaff = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]') as StaffMember[];
    const localAttendance = JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '[]') as AttendanceRecord[];
    const localVisitors = JSON.parse(localStorage.getItem(KEYS.VISITORS) || '[]') as VisitorRecord[];
    const localAudit = JSON.parse(localStorage.getItem(KEYS.AUDIT) || '[]') as AuditLog[];

    // 3. Merge Settings
    const mergedSettings = cloudData.settings ? { ...cloudData.settings, ...localSettings } : localSettings;

    // 4. Merge Staff
    const staffMap = new Map<string, StaffMember>();
    (cloudData.staff || []).forEach(s => staffMap.set(s.id, s));
    localStaff.forEach(s => {
      const existing = staffMap.get(s.id);
      if (existing) {
        staffMap.set(s.id, { ...existing, ...s });
      } else {
        staffMap.set(s.id, s);
      }
    });
    const mergedStaff = Array.from(staffMap.values());

    // 5. Merge Attendance
    const attendanceMap = new Map<string, AttendanceRecord>();
    (cloudData.attendance || []).forEach(r => attendanceMap.set(r.id, r));
    localAttendance.forEach(r => {
      const existing = attendanceMap.get(r.id);
      if (existing) {
        if (r.checkOutTime && !existing.checkOutTime) {
          attendanceMap.set(r.id, r);
        } else if (existing.checkOutTime && !r.checkOutTime) {
          attendanceMap.set(r.id, existing);
        } else {
          attendanceMap.set(r.id, { ...existing, ...r });
        }
      } else {
        attendanceMap.set(r.id, r);
      }
    });
    const mergedAttendance = Array.from(attendanceMap.values());

    // 6. Merge Visitors
    const visitorMap = new Map<string, VisitorRecord>();
    (cloudData.visitors || []).forEach(v => visitorMap.set(v.id, v));
    localVisitors.forEach(v => {
      const existing = visitorMap.get(v.id);
      if (existing) {
        if (v.checkOutTime && !existing.checkOutTime) {
          visitorMap.set(v.id, v);
        } else if (existing.checkOutTime && !v.checkOutTime) {
          visitorMap.set(v.id, existing);
        } else {
          visitorMap.set(v.id, { ...existing, ...v });
        }
      } else {
        visitorMap.set(v.id, v);
      }
    });
    const mergedVisitors = Array.from(visitorMap.values());

    // 7. Merge Audit logs
    const auditMap = new Map<string, AuditLog>();
    (cloudData.audit || []).forEach(l => auditMap.set(l.id, l));
    localAudit.forEach(l => auditMap.set(l.id, l));
    const mergedAudit = Array.from(auditMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 8. Check if anything actually changed
    const prevSettingsStr = localStorage.getItem(KEYS.SETTINGS);
    const prevStaffStr = localStorage.getItem(KEYS.STAFF);
    const prevAttendanceStr = localStorage.getItem(KEYS.ATTENDANCE);
    const prevVisitorsStr = localStorage.getItem(KEYS.VISITORS);
    const prevAuditStr = localStorage.getItem(KEYS.AUDIT);

    const nextSettingsStr = JSON.stringify(mergedSettings);
    const nextStaffStr = JSON.stringify(mergedStaff);
    const nextAttendanceStr = JSON.stringify(mergedAttendance);
    const nextVisitorsStr = JSON.stringify(mergedVisitors);
    const nextAuditStr = JSON.stringify(mergedAudit);

    const dataChanged = 
      prevSettingsStr !== nextSettingsStr ||
      prevStaffStr !== nextStaffStr ||
      prevAttendanceStr !== nextAttendanceStr ||
      prevVisitorsStr !== nextVisitorsStr ||
      prevAuditStr !== nextAuditStr;

    if (dataChanged) {
      localStorage.setItem(KEYS.SETTINGS, nextSettingsStr);
      localStorage.setItem(KEYS.STAFF, nextStaffStr);
      localStorage.setItem(KEYS.ATTENDANCE, nextAttendanceStr);
      localStorage.setItem(KEYS.VISITORS, nextVisitorsStr);
      localStorage.setItem(KEYS.AUDIT, nextAuditStr);
      
      window.dispatchEvent(new CustomEvent('ten80_db_sync'));
    }

    // 9. Update cloud state
    const newCloudData: SyncState = {
      settings: mergedSettings,
      staff: mergedStaff,
      attendance: mergedAttendance,
      visitors: mergedVisitors,
      audit: mergedAudit
    };

    await fetch(BUCKET_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCloudData)
    });
  } catch (err) {
    console.error("Cloud synchronization error: ", err);
  } finally {
    isSyncing = false;
  }
}
