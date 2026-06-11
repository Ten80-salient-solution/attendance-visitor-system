import type { StaffMember, AttendanceRecord, VisitorRecord, AuditLog, OfficeSettings } from '../types';

// Storage Keys
const KEYS = {
  SETTINGS: 'ten80_settings',
  STAFF: 'ten80_staff',
  ATTENDANCE: 'ten80_attendance',
  VISITORS: 'ten80_visitors',
  AUDIT: 'ten80_audit_logs',
  DELETED_STAFF: 'ten80_deleted_staff',
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

// Default Staff (empty for fresh start)
const DEFAULT_STAFF: StaffMember[] = [];

// Seed Attendance Records for Today (empty for fresh start)
const getSeededAttendance = (): AttendanceRecord[] => {
  return [];
};

// Seed Visitors (empty for fresh start)
const getSeededVisitors = (): VisitorRecord[] => {
  return [];
};

// Seed Audit Logs (empty for fresh start)
const getSeededAuditLogs = (): AuditLog[] => {
  return [];
};

// Database Initializer with Schema Migration
export function initDB(): void {
  // Force reset local state to empty lists for the fresh start update
  const freshFlag = localStorage.getItem('ten80_fresh_v2');
  if (!freshFlag) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(KEYS.STAFF, JSON.stringify([]));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(KEYS.VISITORS, JSON.stringify([]));
    localStorage.setItem(KEYS.AUDIT, JSON.stringify([]));
    localStorage.setItem(KEYS.DELETED_STAFF, JSON.stringify([]));
    localStorage.setItem('ten80_fresh_v2', 'true');
  }

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
export function getDeletedStaff(): string[] {
  const deleted = localStorage.getItem(KEYS.DELETED_STAFF);
  return deleted ? JSON.parse(deleted) : [];
}

export function getStaff(): StaffMember[] {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.STAFF)!);
}

export function addStaff(member: StaffMember): void {
  const staff = getStaff();
  staff.push(member);
  localStorage.setItem(KEYS.STAFF, JSON.stringify(staff));
  
  const deleted = getDeletedStaff().filter(id => id !== member.id);
  localStorage.setItem(KEYS.DELETED_STAFF, JSON.stringify(deleted));
  
  setTimeout(syncWithCloud, 0);
}

export function saveStaff(staffList: StaffMember[]): void {
  localStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
  
  const activeIds = new Set(staffList.map(s => s.id));
  const deleted = getDeletedStaff().filter(id => !activeIds.has(id));
  localStorage.setItem(KEYS.DELETED_STAFF, JSON.stringify(deleted));
  
  setTimeout(syncWithCloud, 0);
}

export function removeStaff(id: string): void {
  const staff = getStaff().filter(s => s.id !== id);
  localStorage.setItem(KEYS.STAFF, JSON.stringify(staff));
  
  const deleted = getDeletedStaff();
  if (!deleted.includes(id)) {
    deleted.push(id);
    localStorage.setItem(KEYS.DELETED_STAFF, JSON.stringify(deleted));
  }
  
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
  deletedStaff?: string[];
}

const BUCKET_URL = 'https://kvdb.io/LZPkZC8umVfWtLeKrt6zPk/ten80_db_v2';
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
    const localDeletedStaff = getDeletedStaff();

    // 3. Merge Settings
    const mergedSettings = cloudData.settings ? { ...cloudData.settings, ...localSettings } : localSettings;

    // Merge Deleted Staff lists
    const mergedDeletedStaff = Array.from(new Set([
      ...(cloudData.deletedStaff || []),
      ...localDeletedStaff
    ]));

    // 4. Merge Staff (filtering out deleted staff members)
    const staffMap = new Map<string, StaffMember>();
    (cloudData.staff || []).forEach(s => {
      if (!mergedDeletedStaff.includes(s.id)) {
        staffMap.set(s.id, s);
      }
    });
    localStaff.forEach(s => {
      if (!mergedDeletedStaff.includes(s.id)) {
        const existing = staffMap.get(s.id);
        if (existing) {
          staffMap.set(s.id, { ...existing, ...s });
        } else {
          staffMap.set(s.id, s);
        }
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

    // Enforce 1-year attendance retention policy
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const mergedAttendance = Array.from(attendanceMap.values()).filter(r => {
      if (!r.date) return true;
      return new Date(r.date) >= oneYearAgo;
    });

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
    const prevDeletedStaffStr = localStorage.getItem(KEYS.DELETED_STAFF);

    const nextSettingsStr = JSON.stringify(mergedSettings);
    const nextStaffStr = JSON.stringify(mergedStaff);
    const nextAttendanceStr = JSON.stringify(mergedAttendance);
    const nextVisitorsStr = JSON.stringify(mergedVisitors);
    const nextAuditStr = JSON.stringify(mergedAudit);
    const nextDeletedStaffStr = JSON.stringify(mergedDeletedStaff);

    const dataChanged = 
      prevSettingsStr !== nextSettingsStr ||
      prevStaffStr !== nextStaffStr ||
      prevAttendanceStr !== nextAttendanceStr ||
      prevVisitorsStr !== nextVisitorsStr ||
      prevAuditStr !== nextAuditStr ||
      prevDeletedStaffStr !== nextDeletedStaffStr;

    if (dataChanged) {
      localStorage.setItem(KEYS.SETTINGS, nextSettingsStr);
      localStorage.setItem(KEYS.STAFF, nextStaffStr);
      localStorage.setItem(KEYS.ATTENDANCE, nextAttendanceStr);
      localStorage.setItem(KEYS.VISITORS, nextVisitorsStr);
      localStorage.setItem(KEYS.AUDIT, nextAuditStr);
      localStorage.setItem(KEYS.DELETED_STAFF, nextDeletedStaffStr);
      
      window.dispatchEvent(new CustomEvent('ten80_db_sync'));
    }

    // 9. Update cloud state
    const newCloudData: SyncState = {
      settings: mergedSettings,
      staff: mergedStaff,
      attendance: mergedAttendance,
      visitors: mergedVisitors,
      audit: mergedAudit,
      deletedStaff: mergedDeletedStaff
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
