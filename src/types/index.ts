export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  position: string;
  profilePicture: string; // Base64 or placeholder URL
  email: string;
  employeeId: string;
  department: string;
  password: string;
}

export interface AttendanceRecord {
  id: string;
  staffName: string;
  employeeId: string;
  email: string;
  department: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  date: string; // YYYY-MM-DD
  gpsCoordinates: {
    latitude: number;
    longitude: number;
  } | null;
  deviceInfo: string;
  status: string;
}

export interface VisitorRecord {
  id: string;
  visitorName: string;
  phone: string;
  email?: string;
  company?: string;
  reasonForVisit: string;
  hostEmployee: string;
  checkInTime: string;
  checkOutTime: string | null;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
  };
  status: 'Inside' | 'Checked Out';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actionType: 
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILURE' 
    | 'CHECK_IN_SUCCESS' 
    | 'CHECK_IN_FAILED' 
    | 'CHECK_OUT_SUCCESS' 
    | 'CHECK_OUT_FAILED'
    | 'SETTINGS_UPDATE' 
    | 'STAFF_ADDED' 
    | 'STAFF_REMOVED' 
    | 'LOGOUT'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_SUCCESS';
  userEmail: string;
  details: string;
  deviceInfo?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface OfficeSettings {
  offices: OfficeLocation[];
  staffQRToken: string;
}
