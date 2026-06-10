import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, UserCheck, Users, MapPin, Sliders, 
  ClipboardList, QrCode, LogOut, Search, FileDown, 
  Plus, Trash2, Calendar, Filter, Clock, UserMinus, ShieldAlert, Info, Key,
  PieChart
} from 'lucide-react';
import { 
  getSettings, getStaff, addStaff, removeStaff, saveStaff,
  getAttendance, saveAttendance, getVisitors, saveVisitors, 
  getAuditLogs, addAuditLog, DEFAULT_AVATAR
} from '../utils/mockDb';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/export';
import type { StaffMember, AttendanceRecord, VisitorRecord, AuditLog } from '../types';

interface AdminDashboardProps {
  adminEmail: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminEmail, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'visitors' | 'map' | 'settings' | 'audit' | 'qrcode'>('overview');
  
  // Data States
  const [settings, setSettings] = useState(getSettings());
  const [staff, setStaff] = useState<StaffMember[]>(getStaff());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(getAttendance());
  const [visitors, setVisitors] = useState<VisitorRecord[]>(getVisitors());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(getAuditLogs());

  // Search & Filter States
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceDept, setAttendanceDept] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [attendanceStartDate, setAttendanceStartDate] = useState('');
  const [attendanceEndDate, setAttendanceEndDate] = useState('');

  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorStatus, setVisitorStatus] = useState('');
  const [visitorStartDate, setVisitorStartDate] = useState('');
  const [visitorEndDate, setVisitorEndDate] = useState('');

  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');

  // Roster Modals
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffId, setNewStaffId] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPosition, setNewStaffPosition] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffPhoto, setNewStaffPhoto] = useState('');
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Focus and action states
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: number; longitude: number; label: string } | null>(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffMember | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [selectedAnalyticsStaff, setSelectedAnalyticsStaff] = useState<StaffMember | null>(null);
  const [serverBaseUrl, setServerBaseUrl] = useState(() => localStorage.getItem('ten80_server_url') || window.location.origin);

  const [mapFocusId] = useState<string>('off-1');

  // Google Maps refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Reload data from local storage
  const reloadData = () => {
    setSettings(getSettings());
    setStaff(getStaff());
    setAttendance(getAttendance());
    setVisitors(getVisitors());
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    reloadData();
  }, [activeTab]);

  // Google Maps Initialization
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    // Reset previous instance ref
    mapInstanceRef.current = null;

    try {
      const google = (window as any).google;
      if (!google || !google.maps) {
        console.error("Google Maps API is not loaded.");
        return;
      }

      const list = settings.offices || [];
      const focusOffice = list.find(o => o.id === mapFocusId) || list[0] || { latitude: 6.5244, longitude: 3.3792 };
      
      let mapCenter = { lat: focusOffice.latitude, lng: focusOffice.longitude };
      let zoomLevel = 16;
      if (selectedCoordinates) {
        mapCenter = { lat: selectedCoordinates.latitude, lng: selectedCoordinates.longitude };
        zoomLevel = 18;
      }

      // Create Map centered at focused target
      const map = new google.maps.Map(mapContainerRef.current, {
        center: mapCenter,
        zoom: zoomLevel,
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      });
      mapInstanceRef.current = map;

      // Add all office pins and geofence circles
      list.forEach(office => {
        const officeIcon = {
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='36' height='36'><path fill='%23eab308' d='M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 10H7V8h2v2zm0 4H7v-2h2v2zm0 4H7v-2h2v2zm4-8h-2V8h2v2zm0 4h-2v-2h2v2zm0 4h-2v-2h2v2zm4-8h-2V8h2v2zm0 4h-2v-2h2v2zm0 4h-2v-2h2v2z'/></svg>",
          scaledSize: new google.maps.Size(36, 36),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(18, 18),
        };

        const marker = new google.maps.Marker({
          position: { lat: office.latitude, lng: office.longitude },
          map: map,
          icon: officeIcon,
          title: office.name,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 4px; line-height: 1.4;">
              <b style="color: #4f46e5; font-size: 0.95rem;">${office.name}</b><br/>
              <b>Latitude:</b> ${office.latitude}<br/>
              <b>Longitude:</b> ${office.longitude}<br/>
              <b>Radius:</b> ${office.radiusMeters}m
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Draw geofence circle
        new google.maps.Circle({
          strokeColor: '#4f46e5',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#4f46e5',
          fillOpacity: 0.1,
          map: map,
          center: { lat: office.latitude, lng: office.longitude },
          radius: office.radiusMeters,
        });
      });

      // Add Staff Check-In Markers (for today)
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance.filter(a => a.date === todayStr && a.gpsCoordinates);

      todayAttendance.forEach(att => {
        if (!att.gpsCoordinates) return;
        
        const staffIcon = {
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='28' height='28'><circle cx='12' cy='8' r='4' fill='%233b82f6'/><path fill='%233b82f6' d='M12 14c-6.1 0-8 4-8 4v2h16v-2c0-2-1.9-4-8-4z'/></svg>",
          scaledSize: new google.maps.Size(28, 28),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(14, 14),
        };

        const marker = new google.maps.Marker({
          position: { lat: att.gpsCoordinates.latitude, lng: att.gpsCoordinates.longitude },
          map: map,
          icon: staffIcon,
          title: att.staffName,
        });

        const time = att.checkInTime 
          ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : 'N/A';

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 4px; line-height: 1.4;">
              <span style="font-weight: 700; color: #3b82f6;">Staff Checked In</span><br/>
              <b>Name:</b> ${att.staffName}<br/>
              <b>ID:</b> ${att.employeeId}<br/>
              <b>Time:</b> ${time}<br/>
              <b>Status:</b> ${att.status}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });

      // Add Active Visitors Markers
      const activeVisitors = visitors.filter(v => v.status === 'Inside' && v.gpsCoordinates);

      activeVisitors.forEach(v => {
        if (!v.gpsCoordinates) return;

        const visIcon = {
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='28' height='28'><path fill='%23a855f7' d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z'/></svg>",
          scaledSize: new google.maps.Size(28, 28),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(14, 14),
        };

        const marker = new google.maps.Marker({
          position: { lat: v.gpsCoordinates.latitude, lng: v.gpsCoordinates.longitude },
          map: map,
          icon: visIcon,
          title: v.visitorName,
        });

        const time = new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: 'Inter', sans-serif; color: #1e293b; padding: 4px; line-height: 1.4;">
              <span style="font-weight: 700; color: #a855f7;">Visitor Present</span><br/>
              <b>Name:</b> ${v.visitorName}<br/>
              <b>Host:</b> ${v.hostEmployee}<br/>
              <b>Check-In:</b> ${time}<br/>
              <b>Reason:</b> ${v.reasonForVisit}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });

      // Add Selected Focus Marker if present
      if (selectedCoordinates) {
        const targetIcon = {
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='36' height='36'><circle cx='12' cy='12' r='10' fill='none' stroke='%23f43f5e' stroke-width='3'/><circle cx='12' cy='12' r='6' fill='none' stroke='%23f43f5e' stroke-width='2'/><circle cx='12' cy='12' r='2' fill='%23f43f5e'/></svg>",
          scaledSize: new google.maps.Size(36, 36),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(18, 18),
        };

        const marker = new google.maps.Marker({
          position: { lat: selectedCoordinates.latitude, lng: selectedCoordinates.longitude },
          map: map,
          icon: targetIcon,
          title: selectedCoordinates.label,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: 'Inter', sans-serif; color: #1e293b; text-align: center; font-size: 0.85rem; min-width: 140px; padding: 4px; line-height: 1.4;">
              <span style="font-weight: 700; color: #f43f5e; font-size: 0.9rem;">Target Location</span><br/>
              <b>User:</b> ${selectedCoordinates.label}<br/>
              <b>GPS:</b> ${selectedCoordinates.latitude.toFixed(5)}, ${selectedCoordinates.longitude.toFixed(5)}
            </div>
          `
        });

        infoWindow.open(map, marker);

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      }

    } catch (e) {
      console.error("Google Maps rendering error:", e);
    }

    return () => {
      mapInstanceRef.current = null;
    };
  }, [activeTab, settings, attendance, visitors, mapFocusId, selectedCoordinates]);

  // Handle Logout
  const handleLogoutClick = () => {
    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'LOGOUT',
      userEmail: adminEmail,
      details: 'Admin logged out securely.'
    });
    onLogout();
  };

  // ----------------------------------------------------
  // Statistics Calculations (Overview Tab)
  // ----------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter(a => a.date === todayStr);

  const totalStaffCount = staff.length;
  
  // Total Staff Present today (having checked in)
  const staffPresentCount = todayRecords.filter(r => r.checkInTime !== null).length;
  
  // Total Staff Absent today (registered staff who have no attendance record or status 'Absent')
  const staffAbsentCount = totalStaffCount - todayRecords.filter(r => r.status !== 'Absent').length;

  // Staff Currently Inside (checked in, but not checked out)
  const staffInsideCount = todayRecords.filter(r => r.checkInTime !== null && r.checkOutTime === null).length;

  // Total Visitors registered today
  const totalVisitorsToday = visitors.filter(v => v.checkInTime.startsWith(todayStr)).length;



  // ----------------------------------------------------
  // Filter Logic (Attendance Table)
  // ----------------------------------------------------
  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = 
      record.staffName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      record.email.toLowerCase().includes(attendanceSearch.toLowerCase());
    
    const matchesDept = attendanceDept === '' || record.department === attendanceDept;
    
    const matchesStatus = attendanceStatus === '' || record.status === attendanceStatus;
    
    let matchesDate = true;
    if (attendanceStartDate) {
      matchesDate = matchesDate && record.date >= attendanceStartDate;
    }
    if (attendanceEndDate) {
      matchesDate = matchesDate && record.date <= attendanceEndDate;
    }

    return matchesSearch && matchesDept && matchesStatus && matchesDate;
  });

  // Extract Departments for dropdown filters
  const departments = Array.from(new Set(staff.map(s => s.department)));

  // ----------------------------------------------------
  // Filter Logic (Visitor Table)
  // ----------------------------------------------------
  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = 
      v.visitorName.toLowerCase().includes(visitorSearch.toLowerCase()) ||
      v.hostEmployee.toLowerCase().includes(visitorSearch.toLowerCase()) ||
      v.id.toLowerCase().includes(visitorSearch.toLowerCase());

    const matchesStatus = visitorStatus === '' || v.status === visitorStatus;

    let matchesDate = true;
    const vDate = v.checkInTime.split('T')[0];
    if (visitorStartDate) {
      matchesDate = matchesDate && vDate >= visitorStartDate;
    }
    if (visitorEndDate) {
      matchesDate = matchesDate && vDate <= visitorEndDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // ----------------------------------------------------
  // Filter Logic (Audit Logs)
  // ----------------------------------------------------
  const filteredAudits = auditLogs.filter(log => {
    const matchesSearch = 
      log.userEmail.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesAction = auditAction === '' || log.actionType === auditAction;
    return matchesSearch && matchesAction;
  });

  // ----------------------------------------------------
  // Action Handlers
  // ----------------------------------------------------
  


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setRosterError('Profile image must be less than 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewStaffPhoto(reader.result as string);
    };
    reader.onerror = () => {
      setRosterError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Add Employee to Roster
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRosterError(null);

    if (!newStaffName || !newStaffEmail || !newStaffId || !newStaffPhone || !newStaffPosition || !newStaffPassword) {
      setRosterError('Please fill out all fields.');
      return;
    }

    const emailClean = newStaffEmail.trim().toLowerCase();
    
    // Check if email already exists
    const emailExists = staff.some(s => s.email.toLowerCase() === emailClean);
    if (emailExists) {
      setRosterError('Email is already registered in the system.');
      return;
    }

    const newEmp: StaffMember = {
      id: `s-${Date.now()}`,
      name: newStaffName.trim(),
      phone: newStaffPhone.trim(),
      position: newStaffPosition.trim(),
      profilePicture: newStaffPhoto || DEFAULT_AVATAR,
      email: emailClean,
      employeeId: newStaffId.trim().toUpperCase(),
      department: '',
      password: newStaffPassword,
    };

    addStaff(newEmp);
    
    // Log audit
    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'STAFF_ADDED',
      userEmail: adminEmail,
      details: `Added new employee ${newEmp.name} (ID: ${newEmp.employeeId}, Dept: ${newEmp.department}) to roster.`
    });

    // Reset Form
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffId('');
    setNewStaffPhone('');
    setNewStaffPosition('');
    setNewStaffPassword('');
    setNewStaffPhoto('');
    setShowRosterModal(false);
    reloadData();
  };

  const handleBackupAllAttendance = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(attendance, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ten80_attendance_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'SETTINGS_UPDATE',
      userEmail: adminEmail,
      details: 'Full staff attendance logs backup downloaded by administrator.'
    });
    alert('Full attendance backup downloaded successfully!');
  };

  const handleWipeOutdatedAttendance = () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const outdated = attendance.filter(r => {
      if (!r.date) return false;
      return new Date(r.date) < oneYearAgo;
    });

    if (outdated.length === 0) {
      alert('No attendance records older than 1 year were found.');
      return;
    }

    const confirmWipe = window.confirm(`Found ${outdated.length} records older than 1 year. Would you like to download a backup of these outdated records before wiping them?`);
    
    if (confirmWipe) {
      // First download a backup of the outdated records
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outdated, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ten80_outdated_attendance_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    // Filter and save only records within 1 year
    const activeRecords = attendance.filter(r => {
      if (!r.date) return true;
      return new Date(r.date) >= oneYearAgo;
    });

    saveAttendance(activeRecords);
    setAttendance(activeRecords);

    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'SETTINGS_UPDATE',
      userEmail: adminEmail,
      details: `Purged ${outdated.length} attendance records older than 1 year (Retention policy clean-up).`
    });

    alert(`Wipe complete. Purged ${outdated.length} outdated records successfully!`);
    reloadData();
  };

  const handleAdminResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordStaff || !adminNewPassword) return;

    const updatedStaffList = staff.map(s => {
      if (s.id === resetPasswordStaff.id) {
        return { ...s, password: adminNewPassword };
      }
      return s;
    });

    saveStaff(updatedStaffList);
    setResetPasswordSuccess('Password reset successfully!');

    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'SETTINGS_UPDATE',
      userEmail: adminEmail,
      details: `Admin manually reset password for staff member ${resetPasswordStaff.name} (Email: ${resetPasswordStaff.email}).`
    });

    setTimeout(() => {
      setResetPasswordStaff(null);
      setAdminNewPassword('');
      setResetPasswordSuccess(null);
      reloadData();
    }, 1500);
  };

  // Remove Employee
  const handleRemoveStaff = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from the employee roster?`)) {
      removeStaff(id);
      
      addAuditLog({
        timestamp: new Date().toISOString(),
        actionType: 'STAFF_REMOVED',
        userEmail: adminEmail,
        details: `Removed employee ${name} from roster.`
      });

      reloadData();
    }
  };

  const handleGPSClick = (lat: number, lng: number, label: string) => {
    setSelectedCoordinates({ latitude: lat, longitude: lng, label });
    setActiveTab('map');
  };

  // Admin checkout override for visitors
  const handleAdminVisitorCheckout = (id: string, name: string) => {
    const vLogs = getVisitors();
    const idx = vLogs.findIndex(v => v.id === id);
    if (idx === -1) return;

    const timeStr = new Date().toISOString();
    const updated = [...vLogs];
    updated[idx] = {
      ...updated[idx],
      checkOutTime: timeStr,
      status: 'Checked Out'
    };

    saveVisitors(updated);
    reloadData();

    addAuditLog({
      timestamp: timeStr,
      actionType: 'CHECK_OUT_SUCCESS',
      userEmail: adminEmail,
      details: `Administrative override: checked out visitor ${name} (ID: ${id}) manually.`
    });
  };

  // Export Staff Attendance Logs
  const triggerAttendanceExport = (format: 'csv' | 'excel' | 'pdf') => {
    const headers = ['Staff Name', 'Employee ID', 'Department', 'Date', 'Check-In Time', 'Check-Out Time', 'GPS Coordinates', 'Status'];
    const rows = filteredAttendance.map(r => [
      r.staffName,
      r.employeeId,
      r.department,
      r.date,
      r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-',
      r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-',
      r.gpsCoordinates ? `${r.gpsCoordinates.latitude}, ${r.gpsCoordinates.longitude}` : 'N/A',
      r.status
    ]);

    const title = `Staff Attendance Report - ${new Date().toLocaleDateString()}`;
    const filename = `Staff_Attendance_${todayStr}.${format === 'pdf' ? 'pdf' : format === 'excel' ? 'xls' : 'csv'}`;

    if (format === 'csv') {
      exportToCSV(filename, headers, rows);
    } else if (format === 'excel') {
      exportToExcel(filename, 'Attendance Logs', headers, rows);
    } else {
      exportToPDF(filename, title, headers, rows);
    }
  };

  // Export Visitor Logs
  const triggerVisitorExport = (format: 'csv' | 'excel' | 'pdf') => {
    const headers = ['Visitor Name', 'Phone', 'Company', 'Reason', 'Host Employee', 'Check-In', 'Check-Out', 'GPS', 'Status'];
    const rows = filteredVisitors.map(v => [
      v.visitorName,
      v.phone,
      v.company || '-',
      v.reasonForVisit,
      v.hostEmployee,
      new Date(v.checkInTime).toLocaleString(),
      v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : '-',
      `${v.gpsCoordinates.latitude.toFixed(5)}, ${v.gpsCoordinates.longitude.toFixed(5)}`,
      v.status
    ]);

    const title = `Visitor Access Report - ${new Date().toLocaleDateString()}`;
    const filename = `Visitor_Logs_${todayStr}.${format === 'pdf' ? 'pdf' : format === 'excel' ? 'xls' : 'csv'}`;

    if (format === 'csv') {
      exportToCSV(filename, headers, rows);
    } else if (format === 'excel') {
      exportToExcel(filename, 'Visitor Logs', headers, rows);
    } else {
      exportToPDF(filename, title, headers, rows);
    }
  };

  // Print Entrance Staff QR Screen
  const handlePrintStaffQR = () => {
    const token = settings.staffQRToken || 'TEN80_STAFF_TOKEN_2026';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(token)}`;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Staff QR - Ten80 Entrance</title>
          <style>
            body { font-family: 'Inter', sans-serif; text-align: center; padding: 40px; color: #1e293b; }
            .container { border: 3px solid #4f46e5; border-radius: 20px; padding: 40px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { font-size: 26px; margin-bottom: 5px; color: #4f46e5; font-family: 'Outfit', sans-serif; }
            p { font-size: 14px; color: #64748b; margin-bottom: 25px; }
            img { border: 1px solid #e2e8f0; padding: 10px; border-radius: 10px; margin-bottom: 25px; background: white; }
            .instructions { font-size: 15px; font-weight: bold; background-color: #f8fafc; border: 1px dashed #e2e8f0; padding: 15px; border-radius: 10px; line-height: 1.5; color: #334155; }
            .warning { font-size: 12px; color: #ef4444; margin-top: 15px; font-weight: 600; }
            .footer { font-size: 11px; color: #94a3b8; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>TEN80 SALIENT SOLUTIONS</h1>
            <p>Official Entrance Staff Verification QR</p>
            <img src="${qrUrl}" alt="Staff QR" width="250" height="250" />
            <div class="instructions">
              SCAN ONLY FROM WITHIN THE STAFF PORTAL<br/>
              (Visit: ${serverBaseUrl} to login & scan)
            </div>
            <div class="warning">
              ⚠️ Will NOT display anything if scanned with ordinary phone camera.
            </div>
            <div class="footer">Ten80 Salient Solutions Secure Verification Gateway</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print Entrance Visitor QR Screen
  const handlePrintVisitorQR = () => {
    const portalUrl = `${serverBaseUrl}/?mode=visitor`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(portalUrl)}`;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Visitor QR - Ten80 Entrance</title>
          <style>
            body { font-family: 'Inter', sans-serif; text-align: center; padding: 40px; color: #1e293b; }
            .container { border: 3px solid #7c3aed; border-radius: 20px; padding: 40px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { font-size: 26px; margin-bottom: 5px; color: #7c3aed; font-family: 'Outfit', sans-serif; }
            p { font-size: 14px; color: #64748b; margin-bottom: 25px; }
            img { border: 1px solid #e2e8f0; padding: 10px; border-radius: 10px; margin-bottom: 25px; background: white; }
            .instructions { font-size: 15px; font-weight: bold; background-color: #f1f5f9; padding: 15px; border-radius: 10px; line-height: 1.5; color: #334155; }
            .footer { font-size: 11px; color: #94a3b8; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>TEN80 SALIENT SOLUTIONS</h1>
            <p>Welcome! Guest Entrance Registration QR</p>
            <img src="${qrUrl}" alt="Visitor QR" width="250" height="250" />
            <div class="instructions">
              SCAN WITH YOUR MOBILE PHONE CAMERA<br/>
              TO FILL IN THE REGISTRATION FORM
            </div>
            <div class="footer">Ten80 Salient Solutions Secure Verification Gateway</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="admin-layout animated-fadeIn">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-menu">
          <div className="sidebar-link" style={{ pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '1rem' }}>
            Operations Monitor
          </div>
          <button 
            type="button" 
            onClick={() => setActiveTab('overview')} 
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          
          <button 
            type="button" 
            onClick={() => setActiveTab('map')} 
            className={`sidebar-link ${activeTab === 'map' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
          >
            <MapPin size={18} />
            Map Monitor
          </button>

          <div className="sidebar-link" style={{ pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '1rem', marginTop: '1rem' }}>
            Data Tables
          </div>

          <button 
            type="button" 
            onClick={() => setActiveTab('attendance')} 
            className={`sidebar-link ${activeTab === 'attendance' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
          >
            <UserCheck size={18} />
            Staff Attendance
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('visitors')} 
            className={`sidebar-link ${activeTab === 'visitors' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
          >
            <Users size={18} />
            Visitor Log
          </button>

          <div className="sidebar-link" style={{ pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '1rem', marginTop: '1rem' }}>
            Security & Config
          </div>

          <button 
            type="button" 
            onClick={() => setActiveTab('settings')} 
            className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
          >
            <Sliders size={18} />
            Office Settings
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('audit')} 
            className={`sidebar-link ${activeTab === 'audit' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
          >
            <ClipboardList size={18} />
            Audit Logs
          </button>

          <button 
            type="button" 
            onClick={() => setActiveTab('qrcode')} 
            className={`sidebar-link ${activeTab === 'qrcode' ? 'active' : ''}`}
            style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}
          >
            <QrCode size={18} />
            Entrance QR Code
          </button>
        </div>

        <button 
          onClick={handleLogoutClick}
          className="sidebar-link btn-danger" 
          style={{ border: 'none', color: 'white', marginTop: '2rem', display: 'flex', gap: '0.5rem', width: '100%', cursor: 'pointer' }}
        >
          <LogOut size={16} />
          Secure Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="animated-fadeIn">
            <h2 style={{ marginBottom: '1.5rem' }}>Operations Overview</h2>
            
            <div className="stats-grid">
              <div className="stat-card glass-panel">
                <div className="stat-info">
                  <h5>Staff Present Today</h5>
                  <div className="stat-value">{staffPresentCount}</div>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                  <UserCheck size={24} />
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-info">
                  <h5>Staff Absent</h5>
                  <div className="stat-value">{staffAbsentCount}</div>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                  <UserMinus size={24} />
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-info">
                  <h5>Staff Currently Inside</h5>
                  <div className="stat-value">{staffInsideCount}</div>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)' }}>
                  <Clock size={24} />
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-info">
                  <h5>Visitors Today</h5>
                  <div className="stat-value">{totalVisitorsToday}</div>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-purple)' }}>
                  <Users size={24} />
                </div>
              </div>


            </div>

            {/* Quick overview grids */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginTop: '2rem' }}>
              <div className="table-card glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>Recent Audit Log Highlights</h3>
                  <button onClick={() => setActiveTab('audit')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>View All</button>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>User</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.slice(0, 5).map(log => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td>
                            <span className={`badge ${
                              log.actionType.includes('SUCCESS') ? 'badge-success' : 
                              log.actionType.includes('FAILED') || log.actionType.includes('FAILURE') ? 'badge-danger' : 'badge-info'
                            }`}>
                              {log.actionType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{log.userEmail}</td>
                          <td>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAP MONITOR */}
        {activeTab === 'map' && (
          <div className="animated-fadeIn">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2>Real-Time Location Monitor</h2>
            </div>
            <div className="map-monitor-container">
              <div className="map-card glass-panel">
                <div id="map-viewport" ref={mapContainerRef} className="map-viewport"></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="animated-fadeIn">
            <h2 style={{ marginBottom: '1.5rem' }}>Staff Attendance Logs</h2>

            {/* Retention & Archive Manager Panel */}
            <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--accent-indigo)', backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Data Retention & Archival Manager</h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Staff attendance records hold up to 1 year of data. Keep local storage optimized by archiving and cleaning up older records.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={handleBackupAllAttendance} 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FileDown size={14} /> Backup Database
                </button>
                <button 
                  onClick={handleWipeOutdatedAttendance} 
                  className="btn btn-danger" 
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Trash2 size={14} /> Wipe Outdated (&gt;1 Year)
                </button>
              </div>
            </div>
            
            <div className="table-card glass-panel">
              <div className="table-header">
                <div className="table-title">
                  <h3>Attendance Records</h3>
                  <p>Filter, search, and export staff clock-in data.</p>
                </div>
                
                <div className="table-controls">
                  <button onClick={() => triggerAttendanceExport('csv')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    <FileDown size={14} /> CSV
                  </button>
                  <button onClick={() => triggerAttendanceExport('excel')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    <FileDown size={14} /> Excel
                  </button>
                  <button onClick={() => triggerAttendanceExport('pdf')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    <FileDown size={14} /> PDF
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              <div className="filters-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', marginRight: '0.5rem' }}>
                  <Filter size={14} />
                  Filters:
                </div>
                
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search name, ID or email..."
                    className="form-input search-input"
                    style={{ padding: '0.4rem 0.5rem 0.4rem 2rem', fontSize: '0.85rem' }}
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                  />
                </div>

                <select
                  className="form-select"
                  style={{ padding: '0.4rem 1.5rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.85rem' }}
                  value={attendanceDept}
                  onChange={(e) => setAttendanceDept(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  className="form-select"
                  style={{ padding: '0.4rem 1.5rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.85rem' }}
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Checked Out">Checked Out</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Calendar size={14} />
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }}
                    value={attendanceStartDate}
                    onChange={(e) => setAttendanceStartDate(e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }}
                    value={attendanceEndDate}
                    onChange={(e) => setAttendanceEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Table rendering */}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Employee ID</th>
                      <th>Department</th>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Coordinates</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.length > 0 ? (
                      filteredAttendance.map(row => (
                        <tr key={row.id}>
                          <td style={{ fontWeight: 600 }}>{row.staffName}</td>
                          <td>{row.employeeId}</td>
                          <td>{row.department}</td>
                          <td>{row.date}</td>
                          <td>{row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                          <td>{row.checkOutTime ? new Date(row.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                          <td>
                            {row.gpsCoordinates ? (
                              <button 
                                type="button"
                                onClick={() => handleGPSClick(row.gpsCoordinates!.latitude, row.gpsCoordinates!.longitude, row.staffName)}
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--accent-indigo)', cursor: 'pointer' }}
                              >
                                <MapPin size={12} />
                                {row.gpsCoordinates.latitude.toFixed(4)}, {row.gpsCoordinates.longitude.toFixed(4)}
                              </button>
                            ) : '-'}
                          </td>
                          <td>
                            <span className={`badge ${
                              row.status.includes('Present') || row.status.includes('Checked Out') ? 'badge-success' : 
                              row.status.includes('Late') ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No staff attendance records matched your search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VISITOR LOGS */}
        {activeTab === 'visitors' && (
          <div className="animated-fadeIn">
            <h2 style={{ marginBottom: '1.5rem' }}>Visitor Access Logs</h2>

            <div className="table-card glass-panel">
              <div className="table-header">
                <div className="table-title">
                  <h3>Visitor Registrations</h3>
                  <p>Monitor arrivals, departures and hosts currently inside the premises.</p>
                </div>
                
                <div className="table-controls">
                  <button onClick={() => triggerVisitorExport('csv')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    <FileDown size={14} /> CSV
                  </button>
                  <button onClick={() => triggerVisitorExport('excel')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    <FileDown size={14} /> Excel
                  </button>
                  <button onClick={() => triggerVisitorExport('pdf')} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                    <FileDown size={14} /> PDF
                  </button>
                </div>
              </div>

              {/* Visitor Filters */}
              <div className="filters-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', marginRight: '0.5rem' }}>
                  <Filter size={14} />
                  Filters:
                </div>
                
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search name, host, ID..."
                    className="form-input search-input"
                    style={{ padding: '0.4rem 0.5rem 0.4rem 2rem', fontSize: '0.85rem' }}
                    value={visitorSearch}
                    onChange={(e) => setVisitorSearch(e.target.value)}
                  />
                </div>

                <select
                  className="form-select"
                  style={{ padding: '0.4rem 1.5rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.85rem' }}
                  value={visitorStatus}
                  onChange={(e) => setVisitorStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Inside">Inside Building</option>
                  <option value="Checked Out">Checked Out</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Calendar size={14} />
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }}
                    value={visitorStartDate}
                    onChange={(e) => setVisitorStartDate(e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }}
                    value={visitorEndDate}
                    onChange={(e) => setVisitorEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Visitor Name</th>
                      <th>Visitor ID</th>
                      <th>Phone</th>
                      <th>Company</th>
                      <th>Reason</th>
                      <th>Host Employee</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>GPS Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisitors.length > 0 ? (
                      filteredVisitors.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 600 }}>{v.visitorName}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{v.id}</td>
                          <td>{v.phone}</td>
                          <td>{v.company || '-'}</td>
                          <td>{v.reasonForVisit}</td>
                          <td>{v.hostEmployee}</td>
                          <td>{new Date(v.checkInTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td>{v.checkOutTime ? new Date(v.checkOutTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                          <td>
                            {v.gpsCoordinates ? (
                              <button 
                                type="button"
                                onClick={() => handleGPSClick(v.gpsCoordinates.latitude, v.gpsCoordinates.longitude, `Visitor: ${v.visitorName}`)}
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--accent-purple)', cursor: 'pointer' }}
                              >
                                <MapPin size={12} />
                                {v.gpsCoordinates.latitude.toFixed(4)}, {v.gpsCoordinates.longitude.toFixed(4)}
                              </button>
                            ) : '-'}
                          </td>
                          <td>
                            <span className={`badge ${v.status === 'Inside' ? 'badge-info' : 'badge-success'}`}>
                              {v.status === 'Inside' ? 'Inside' : 'Checked Out'}
                            </span>
                          </td>
                          <td>
                            {v.status === 'Inside' && (
                              <button
                                onClick={() => handleAdminVisitorCheckout(v.id, v.visitorName)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              >
                                Check-Out
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No visitor records matched your search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: OFFICE SETTINGS & ROSTER */}
        {activeTab === 'settings' && (
          <div className="animated-fadeIn">
            <h2 style={{ marginBottom: '1.5rem' }}>Staff Roster & Portal Configuration</h2>

            {/* Left Column: Roster Directory */}
            <div className="table-card glass-panel" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3>Employee Directory Roster</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Register staff members, configure their secure logins, and override passwords.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowRosterModal(true)} 
                    className="btn btn-primary" 
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', gap: '0.35rem' }}
                  >
                    <Plus size={16} /> Add Staff
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Position</th>
                        <th>Department</th>
                        <th>Phone</th>
                        <th>Company Email</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.length > 0 ? (
                        staff.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
                                <img 
                                  src={s.profilePicture || DEFAULT_AVATAR} 
                                  alt={s.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              </div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{s.employeeId}</td>
                            <td style={{ fontSize: '0.85rem' }}>{s.position}</td>
                            <td>
                              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{s.department}</span>
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{s.phone}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.email}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button
                                  onClick={() => setSelectedAnalyticsStaff(s)}
                                  className="btn-icon-only"
                                  title="View Attendance Analytics"
                                  style={{ width: '32px', height: '32px', border: 'none', backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-purple)', cursor: 'pointer' }}
                                >
                                  <PieChart size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setResetPasswordStaff(s);
                                    setAdminNewPassword('');
                                  }}
                                  className="btn-icon-only"
                                  title="Reset Staff Password"
                                  style={{ width: '32px', height: '32px', border: 'none', backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-indigo)' }}
                                >
                                  <Key size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemoveStaff(s.id, s.name)}
                                  className="btn-icon-only"
                                  title="Remove Staff Member"
                                  style={{ width: '32px', height: '32px', border: 'none', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No employees registered. Use the "Add Staff" button to register.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            {/* Staff Adding Modal */}
            {showRosterModal && (
              <div className="modal-overlay">
                <div className="modal-content glass-panel animated-fadeIn" style={{ backgroundColor: 'var(--bg-secondary)', maxWidth: '500px', width: '90%' }}>
                  <div className="modal-header">
                    <h3>Register New Employee</h3>
                  </div>

                  {rosterError && (
                    <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>
                      {rosterError}
                    </div>
                  )}

                  <form onSubmit={handleAddStaffSubmit}>
                    
                    {/* Picture Upload & Preview */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', flexShrink: 0 }}>
                        <img 
                          src={newStaffPhoto || DEFAULT_AVATAR} 
                          alt="Preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <label className="form-label" style={{ marginBottom: '0.25rem' }}>Profile Picture</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePhotoUpload} 
                          style={{ fontSize: '0.75rem', width: '100%' }}
                        />
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Max size: 1MB. PNG/JPG formats.</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="Emeka Okafor"
                          value={newStaffName}
                          onChange={(e) => setNewStaffName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="+234 803 111 2222"
                          value={newStaffPhone}
                          onChange={(e) => setNewStaffPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Position / Title</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Product Manager"
                        value={newStaffPosition}
                        onChange={(e) => setNewStaffPosition(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Company Email Address</label>
                      <input
                        type="email"
                        required
                        className="form-input"
                        placeholder="emeka@ten80.com"
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Employee ID</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="EMP-010"
                          value={newStaffId}
                          onChange={(e) => setNewStaffId(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Default Password</label>
                        <input
                          type="password"
                          required
                          className="form-input"
                          placeholder="••••••••"
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button 
                        type="button" 
                        onClick={() => { setShowRosterModal(false); setRosterError(null); setNewStaffPhoto(''); }} 
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Register Employee
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Admin Reset Password Modal */}
            {resetPasswordStaff && (
              <div className="modal-overlay">
                <div className="modal-content glass-panel animated-fadeIn" style={{ backgroundColor: 'var(--bg-secondary)', maxWidth: '400px', width: '90%' }}>
                  <div className="modal-header">
                    <h3>Reset Staff Password</h3>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Resetting password for <b>{resetPasswordStaff.name}</b> ({resetPasswordStaff.email}).
                  </p>

                  {resetPasswordSuccess ? (
                    <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>
                      {resetPasswordSuccess}
                    </div>
                  ) : (
                    <form onSubmit={handleAdminResetPassword}>
                      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label">New Password</label>
                        <input
                          type="password"
                          required
                          className="form-input"
                          placeholder="Enter new secure password"
                          value={adminNewPassword}
                          onChange={(e) => setAdminNewPassword(e.target.value)}
                        />
                      </div>

                      <div className="modal-footer">
                        <button 
                          type="button" 
                          onClick={() => { setResetPasswordStaff(null); setAdminNewPassword(''); }} 
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Reset Password
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Attendance Analytics Pie Chart Modal */}
            {selectedAnalyticsStaff && (() => {
              const records = attendance.filter(r => r.employeeId === selectedAnalyticsStaff.employeeId);
              const total = records.length;
              const present = records.filter(r => r.status.includes('Present')).length;
              const late = records.filter(r => r.status.includes('Late')).length;
              const absent = records.filter(r => r.status.includes('Absent')).length;
              const checkedOut = records.filter(r => r.status.includes('Checked Out')).length;

              const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
              const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
              const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;
              const checkedOutPct = total > 0 ? Math.round((checkedOut / total) * 100) : 0;

              const gradient = total > 0 
                ? `conic-gradient(
                    var(--success) 0% ${presentPct}%,
                    var(--warning) ${presentPct}% ${presentPct + latePct}%,
                    var(--danger) ${presentPct + latePct}% ${presentPct + latePct + absentPct}%,
                    var(--accent-indigo) ${presentPct + latePct + absentPct}% 100%
                  )`
                : `var(--bg-tertiary)`;

              return (
                <div className="modal-overlay">
                  <div className="modal-content glass-panel animated-fadeIn" style={{ backgroundColor: 'var(--bg-secondary)', maxWidth: '420px', width: '90%', padding: '2rem' }}>
                    <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
                      <h3 style={{ margin: 0 }}>Attendance Analytics</h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-purple)', flexShrink: 0 }}>
                        <img src={selectedAnalyticsStaff.profilePicture || DEFAULT_AVATAR} alt={selectedAnalyticsStaff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{selectedAnalyticsStaff.name}</h4>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {selectedAnalyticsStaff.position} • {selectedAnalyticsStaff.employeeId}
                        </p>
                      </div>
                    </div>

                    {total === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <PieChart size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
                        <p style={{ fontSize: '0.9rem' }}>No attendance records logged for this employee yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        {/* Conic Gradient Pie Chart */}
                        <div style={{ 
                          position: 'relative',
                          width: '150px', 
                          height: '150px', 
                          borderRadius: '50%', 
                          background: gradient,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                        }} />

                        {/* Legends with counts and percentages */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid var(--success)' }}>
                            <span style={{ fontWeight: 500, color: 'var(--success)' }}>Present</span>
                            <span style={{ fontWeight: 600 }}>{present} ({presentPct}%)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid var(--warning)' }}>
                            <span style={{ fontWeight: 500, color: 'var(--warning)' }}>Late</span>
                            <span style={{ fontWeight: 600 }}>{late} ({latePct}%)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid var(--danger)' }}>
                            <span style={{ fontWeight: 500, color: 'var(--danger)' }}>Absent</span>
                            <span style={{ fontWeight: 600 }}>{absent} ({absentPct}%)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(79, 70, 229, 0.08)', borderLeft: '3px solid var(--accent-indigo)' }}>
                            <span style={{ fontWeight: 500, color: 'var(--accent-indigo)' }}>Checked Out</span>
                            <span style={{ fontWeight: 600 }}>{checkedOut} ({checkedOutPct}%)</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-color)', width: '100%', paddingTop: '0.75rem' }}>
                          Total Records Tracked: <b>{total}</b>
                        </div>
                      </div>
                    )}

                    <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setSelectedAnalyticsStaff(null)} 
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                      >
                        Close Analytics
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="animated-fadeIn">
            <h2 style={{ marginBottom: '1.5rem' }}>System Security & Audit Trail</h2>

            <div className="table-card glass-panel">
              <div className="table-header" style={{ marginBottom: '1.25rem' }}>
                <div className="table-title">
                  <h3>Audit Trail</h3>
                  <p>Immutable record of all portal security transactions and check-in metrics.</p>
                </div>
              </div>

              {/* Filters */}
              <div className="filters-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', marginRight: '0.5rem' }}>
                  <Filter size={14} />
                  Filters:
                </div>
                
                <div className="search-input-wrapper" style={{ flexGrow: 1 }}>
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search logs, details, or user emails..."
                    className="form-input search-input"
                    style={{ padding: '0.4rem 0.5rem 0.4rem 2rem', fontSize: '0.85rem' }}
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                </div>

                <select
                  className="form-select"
                  style={{ padding: '0.4rem 1.5rem 0.4rem 0.75rem', width: 'auto', fontSize: '0.85rem' }}
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                >
                  <option value="">All Actions</option>
                  <option value="CHECK_IN_SUCCESS">Check-In Success</option>
                  <option value="CHECK_IN_FAILED">Check-In Failure</option>
                  <option value="CHECK_OUT_SUCCESS">Check-Out Success</option>
                  <option value="LOGIN_SUCCESS">Login Success</option>
                  <option value="LOGIN_FAILURE">Login Failure</option>
                  <option value="SETTINGS_UPDATE">Settings Update</option>
                  <option value="STAFF_ADDED">Roster Added</option>
                  <option value="STAFF_REMOVED">Roster Removed</option>
                </select>
              </div>

              {/* Audit Table */}
              <div className="table-responsive">
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action Type</th>
                      <th>Account Entity</th>
                      <th>Event Details</th>
                      <th>Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudits.length > 0 ? (
                      filteredAudits.map(log => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${
                              log.actionType.includes('SUCCESS') ? 'badge-success' : 
                              log.actionType.includes('FAILED') || log.actionType.includes('FAILURE') ? 'badge-danger' : 'badge-info'
                            }`}>
                              {log.actionType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{log.userEmail}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span>{log.details}</span>
                              {log.deviceInfo && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Device: {log.deviceInfo}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {log.gpsCoordinates ? (
                              <button 
                                type="button"
                                onClick={() => handleGPSClick(log.gpsCoordinates!.latitude, log.gpsCoordinates!.longitude, log.userEmail)}
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--accent-indigo)', cursor: 'pointer' }}
                              >
                                <MapPin size={10} />
                                {log.gpsCoordinates.latitude.toFixed(5)}, {log.gpsCoordinates.longitude.toFixed(5)}
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No audit trail records match the specified filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ENTRANCE QR CODE */}
        {activeTab === 'qrcode' && (
          <div className="animated-fadeIn">
            <h2 style={{ marginBottom: '1.5rem' }}>Office Entrance QR Display</h2>

            {/* Server Access / Local IP Configuration Panel */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-purple)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>External Device Connection Setup</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 1.25rem 0', lineHeight: 1.4 }}>
                For visitors' physical phones to connect to this server when scanning the QR code, configure your computer's local network IP address (e.g. <code>http://192.168.1.15:5173</code>) instead of <code>localhost</code>. Ensure you run your Vite server exposed (e.g., <code>npm run dev -- --host</code>).
              </p>
              <div className="form-group" style={{ margin: 0, maxWidth: '400px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Server Base URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. http://192.168.1.15:5173"
                  value={serverBaseUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setServerBaseUrl(val);
                    localStorage.setItem('ten80_server_url', val);
                  }}
                  style={{ fontSize: '0.85rem', padding: '0.55rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
              {/* Card 1: Staff Fixed QR Code */}
              <div className="table-card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <h3>Staff Entrance QR Code</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Fixed security verification token. Staff MUST scan this from within the staff portal.
                  </p>
                </div>

                <div className="qr-code-section" style={{ flexGrow: 1 }}>
                  <div className="qr-placeholder">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(settings.staffQRToken || 'TEN80_STAFF_TOKEN_2026')}`} 
                      alt="Staff Entrance QR Token" 
                      width="200" 
                      height="200"
                      style={{ border: 'none', padding: 0 }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem', width: '100%' }}>
                    <strong>Verification Token:</strong>
                    <div style={{ wordBreak: 'break-all', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {settings.staffQRToken || 'TEN80_STAFF_TOKEN_2026'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                    <button onClick={handlePrintStaffQR} className="btn btn-primary" style={{ flexGrow: 1 }}>
                      <QrCode size={18} /> Print Staff QR
                    </button>
                    <a 
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(settings.staffQRToken || 'TEN80_STAFF_TOKEN_2026')}`} 
                      download="Ten80_Staff_QR.png" 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary" 
                      style={{ flexGrow: 1 }}
                    >
                      Download PNG
                    </a>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)' }}>
                  <ShieldAlert size={22} style={{ flexShrink: 0, color: 'var(--danger)' }} />
                  <span>
                    <strong>Security Notice:</strong> This QR code does NOT redirect to a link. It will not check staff in if scanned with an ordinary phone camera. It must be scanned using the in-app scanner at <code>{serverBaseUrl}/?view=staff</code>.
                  </span>
                </div>
              </div>

              {/* Card 2: Visitor Redirection QR Code */}
              <div className="table-card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <h3>Visitor Registration QR Code</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Redirects guests directly to the registration form using their native phone camera.
                  </p>
                </div>

                <div className="qr-code-section" style={{ flexGrow: 1 }}>
                  <div className="qr-placeholder">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(serverBaseUrl + '/?mode=visitor')}`} 
                      alt="Visitor Registration Link" 
                      width="200" 
                      height="200"
                      style={{ border: 'none', padding: 0 }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem', width: '100%' }}>
                    <strong>Redirection Link:</strong>
                    <div style={{ wordBreak: 'break-all', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {serverBaseUrl}/?mode=visitor
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                    <button onClick={handlePrintVisitorQR} className="btn btn-primary" style={{ flexGrow: 1, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
                      <QrCode size={18} /> Print Visitor QR
                    </button>
                    <a 
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(serverBaseUrl + '/?mode=visitor')}`} 
                      download="Ten80_Visitor_QR.png" 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary" 
                      style={{ flexGrow: 1 }}
                    >
                      Download PNG
                    </a>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--info-bg)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)' }}>
                  <Info size={22} style={{ flexShrink: 0, color: 'var(--info)' }} />
                  <span>
                    <strong>Visitor Instructions:</strong> Guests scan this QR code using their normal mobile phone camera. They are immediately directed to the visitor registration form to check in.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
