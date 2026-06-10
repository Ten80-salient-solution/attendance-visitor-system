import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Lock, Compass, CheckCircle2, AlertTriangle, 
  Smartphone, MapPin, Camera, RefreshCw
} from 'lucide-react';
import { 
  getStaff, getAttendance, saveAttendance, getSettings, addAuditLog, saveStaff 
} from '../utils/mockDb';
import { getDistanceInMeters } from '../utils/geo';
import type { AttendanceRecord, StaffMember } from '../types';

export const StaffPortal: React.FC = () => {
  // Portal Flow State: 'login' | 'gps-request' | 'scanner' | 'success'
  const [step, setStep] = useState<'login' | 'gps-request' | 'scanner' | 'success'>('login');
  
  // Login credentials
  const [staffName, setStaffName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<StaffMember | null>(null);

  // Self-service password change
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  // GPS/Geolocation state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Scanner State
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [latestRecord, setLatestRecord] = useState<AttendanceRecord | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Camera stream ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const officeSettings = getSettings();
  const staffList = getStaff();

  // Reset all states
  const handleReset = () => {
    stopCamera();
    setStep('login');
    setStaffName('');
    setStaffPassword('');
    setErrorMessage(null);
    setAuthenticatedStaff(null);
    setGpsCoords(null);
    setScanMessage(null);
    setLatestRecord(null);
    setShowChangePassword(false);
    setNewPasswordVal('');
    setConfirmPasswordVal('');
  };

  // Stop video stream track on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access denied or unavailable: ", err.message);
      // We don't crash, we just show a warning. Users can still use the simulation buttons!
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Handle credentials login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameInput = staffName.trim();
    const passwordInput = staffPassword;

    // Find staff member matching exact name
    const staffMember = staffList.find(
      s => s.name.toLowerCase() === nameInput.toLowerCase()
    );

    if (!staffMember || staffMember.password !== passwordInput) {
      setErrorMessage('Invalid Staff Name or Password.');
      addAuditLog({
        timestamp: new Date().toISOString(),
        actionType: 'LOGIN_FAILURE',
        userEmail: nameInput || 'unknown_staff',
        details: 'Staff credentials verification failed.',
        deviceInfo: navigator.userAgent
      });
      return;
    }

    // Success login
    setAuthenticatedStaff(staffMember);
    setStep('gps-request');
    
    // Log successful credentials check
    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'LOGIN_SUCCESS',
      userEmail: staffMember.email,
      details: 'Staff logged in successfully. Pending GPS verification.',
      deviceInfo: navigator.userAgent
    });
  };

  const handleSelfPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!newPasswordVal || !confirmPasswordVal) {
      setPasswordChangeError('Please fill out all fields.');
      return;
    }

    if (newPasswordVal !== confirmPasswordVal) {
      setPasswordChangeError('Passwords do not match.');
      return;
    }

    if (newPasswordVal.length < 4) {
      setPasswordChangeError('Password must be at least 4 characters.');
      return;
    }

    if (!authenticatedStaff) return;

    // Update password in local storage staff list
    const currentStaffList = getStaff();
    const updated = currentStaffList.map(s => {
      if (s.id === authenticatedStaff.id) {
        return { ...s, password: newPasswordVal };
      }
      return s;
    });

    saveStaff(updated);
    setPasswordChangeSuccess('Password updated successfully!');

    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'SETTINGS_UPDATE',
      userEmail: authenticatedStaff.email,
      details: 'Staff member updated their password through self-service reset.'
    });

    setTimeout(() => {
      setShowChangePassword(false);
      setNewPasswordVal('');
      setConfirmPasswordVal('');
      setPasswordChangeSuccess(null);
    }, 1500);
  };

  // Trigger GPS coordinate capture (browser popup)
  const handleRequestGPS = () => {
    setGpsLoading(true);
    setErrorMessage(null);

    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your device browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        setGpsCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        
        // Move to scanner view and activate camera
        setStep('scanner');
        setTimeout(() => startCamera(), 100);
      },
      (error) => {
        setGpsLoading(false);
        setErrorMessage(`GPS Location permission is mandatory to check in. Reason: ${error.message}`);
        
        // Audit log permission deny
        if (authenticatedStaff) {
          addAuditLog({
            timestamp: new Date().toISOString(),
            actionType: 'CHECK_IN_FAILED',
            userEmail: authenticatedStaff.email,
            details: `Staff check-in denied. Device GPS permission rejected: ${error.message}.`,
            deviceInfo: navigator.userAgent
          });
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };



  // QR verification logic
  const handleQRScanned = (scannedCode: string) => {
    if (!authenticatedStaff || !gpsCoords) return;
    stopCamera();

    const expectedToken = officeSettings.staffQRToken || 'TEN80_STAFF_TOKEN_2026';

    // 1. Cross-check QR code
    if (scannedCode.trim() !== expectedToken) {
      setScanMessage({
        type: 'error',
        text: 'Access Denied: Scanned QR code does not match the official staff sign-in token.'
      });

      addAuditLog({
        timestamp: new Date().toISOString(),
        actionType: 'CHECK_IN_FAILED',
        userEmail: authenticatedStaff.email,
        details: `Staff scanned incorrect QR code. Scanned value: "${scannedCode.substring(0, 15)}..."`,
        gpsCoordinates: gpsCoords,
        deviceInfo: navigator.userAgent
      });
      return;
    }

    // 2. Scan matches! Authenticate and log coordinates location
    // Calculate nearest office coordinates
    const offices = officeSettings.offices || [];
    let nearestOffice = offices[0];
    let minDistance = Infinity;
    let isWithinAnyOffice = false;

    offices.forEach(office => {
      const dist = getDistanceInMeters(
        gpsCoords.latitude,
        gpsCoords.longitude,
        office.latitude,
        office.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestOffice = office;
      }
      if (dist <= office.radiusMeters) {
        isWithinAnyOffice = true;
      }
    });

    const locationLabel = isWithinAnyOffice ? nearestOffice.name : 'Remote';
    const distanceText = minDistance >= 1000 
      ? `${(minDistance / 1000).toFixed(2)} km` 
      : `${minDistance.toFixed(1)} meters`;

    const todayStr = new Date().toISOString().split('T')[0];
    const timestampStr = new Date().toISOString();
    const attendanceLogs = getAttendance();

    // Check if clocked in today
    let recordIndex = attendanceLogs.findIndex(
      r => r.email.toLowerCase() === authenticatedStaff.email.toLowerCase() && r.date === todayStr
    );

    let updatedRecords = [...attendanceLogs];
    let record: AttendanceRecord;
    let actionType: 'CHECK_IN_SUCCESS' | 'CHECK_OUT_SUCCESS';

    if (recordIndex >= 0 && updatedRecords[recordIndex].checkInTime && !updatedRecords[recordIndex].checkOutTime) {
      // Perform Check-Out
      record = {
        ...updatedRecords[recordIndex],
        checkOutTime: timestampStr,
        status: `Checked Out (${locationLabel})`
      };
      updatedRecords[recordIndex] = record;
      actionType = 'CHECK_OUT_SUCCESS';
    } else {
      // Perform Check-In
      const now = new Date();
      const isLate = now.getHours() >= 9 && now.getMinutes() > 0;
      const statusLabel = isLate ? `Late (${locationLabel})` : `Present (${locationLabel})`;

      record = {
        id: `att-${Date.now()}`,
        staffName: authenticatedStaff.name,
        employeeId: authenticatedStaff.employeeId,
        email: authenticatedStaff.email,
        department: authenticatedStaff.department,
        checkInTime: timestampStr,
        checkOutTime: null,
        date: todayStr,
        gpsCoordinates: gpsCoords,
        deviceInfo: navigator.userAgent,
        status: statusLabel
      };
      
      if (recordIndex >= 0) {
        updatedRecords[recordIndex] = record;
      } else {
        updatedRecords.push(record);
      }
      actionType = 'CHECK_IN_SUCCESS';
    }

    saveAttendance(updatedRecords);
    setLatestRecord(record);
    setStep('success');

    // Write audit log
    addAuditLog({
      timestamp: timestampStr,
      actionType,
      userEmail: authenticatedStaff.email,
      details: `${actionType === 'CHECK_IN_SUCCESS' ? 'Staff clocked in' : 'Staff clocked out'} via portal scanner. Location: ${locationLabel}. Nearest Office: ${nearestOffice.name} (Dist: ${distanceText}).`,
      gpsCoordinates: gpsCoords,
      deviceInfo: navigator.userAgent
    });
  };

  return (
    <div className="portal-wrapper glass-panel animated-fadeIn" style={{ maxWidth: '480px', marginTop: '4rem' }}>
      
      {/* HEADER TITLE */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' }}>
          Ten80 Staff Portal
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Secure Clock-In Gateway</p>
      </div>

      {authenticatedStaff && !showChangePassword && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '-0.75rem' }}>
          <button 
            type="button" 
            onClick={() => setShowChangePassword(true)} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center', cursor: 'pointer' }}
          >
            <Lock size={10} /> Change Password
          </button>
        </div>
      )}

      {/* PASSWORD CHANGE PANEL */}
      {showChangePassword && authenticatedStaff && (
        <form onSubmit={handleSelfPasswordChange} className="animated-fadeIn">
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h3>Change Account Password</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updating password for {authenticatedStaff.name}</p>
          </div>

          {passwordChangeError && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '0.85rem' }}>{passwordChangeError}</span>
            </div>
          )}

          {passwordChangeSuccess && (
            <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.85rem' }}>{passwordChangeSuccess}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={newPasswordVal}
              onChange={(e) => setNewPasswordVal(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={confirmPasswordVal}
              onChange={(e) => setConfirmPasswordVal(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={() => { setShowChangePassword(false); setPasswordChangeError(null); }} 
              className="btn btn-secondary" 
              style={{ flexGrow: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
              Save Password
            </button>
          </div>
        </form>
      )}

      {/* STEP 1: CREDENTIALS LOGIN */}
      {step === 'login' && !showChangePassword && (
        <form onSubmit={handleLoginSubmit}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Please authenticate using your registered name and account password.
          </div>

          {errorMessage && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '0.85rem' }}>{errorMessage}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="staff-name-input">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="staff-name-input"
                type="text"
                required
                className="form-input"
                placeholder="Ekene Anyaegbu"
                style={{ paddingLeft: '2.5rem' }}
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="staff-pass-input">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="staff-pass-input"
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                style={{ paddingLeft: '2.5rem' }}
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
            Verify Credentials
          </button>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔑 Forgot your password? Please contact your Administrator to override/reset it.
          </div>
        </form>
      )}

      {/* STEP 2: GPS ACCESS REQUEST */}
      {step === 'gps-request' && authenticatedStaff && !showChangePassword && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Compass size={28} className={gpsLoading ? 'animate-spin' : ''} />
          </div>

          <h3>Location Verification</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 1.5rem 0', lineHeight: 1.4 }}>
            Hi {authenticatedStaff.name}, credential verification succeeded. 
            The system now requires your current device location coordinates to log sign-in parameters.
          </p>

          {errorMessage && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>{errorMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              onClick={handleRequestGPS} 
              className="btn btn-primary" 
              style={{ display: 'flex', gap: '0.5rem', width: '100%' }}
              disabled={gpsLoading}
            >
              Authorize GPS Coordinates
            </button>


          </div>
        </div>
      )}

      {/* STEP 3: QR CAMERA SCANNER */}
      {step === 'scanner' && authenticatedStaff && gpsCoords && !showChangePassword && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.8rem', display: 'flex', gap: '0.25rem', color: 'var(--text-muted)', alignItems: 'center' }}>
              <MapPin size={12} className="text-emerald-500" />
              GPS: {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
            </span>
            <button onClick={handleReset} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
              Cancel
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h3>Scan Entrance Staff QR</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Position the fixed office QR code inside the camera container frame.
            </p>
          </div>

          {scanMessage && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>{scanMessage.text}</span>
            </div>
          )}

          {/* Video Container (Camera Stream Interface) */}
          <div style={{ position: 'relative', width: '100%', height: '240px', backgroundColor: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '1.5rem', border: '2px solid var(--border-color)' }}>
            
            {cameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <Camera size={40} />
                <span style={{ fontSize: '0.8rem' }}>Initializing video sensor...</span>
                <button onClick={startCamera} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  <RefreshCw size={10} /> Retry Camera
                </button>
              </div>
            )}

            {/* Cyberpunk scanner crosshair overlays */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '160px', height: '160px', border: '2px dashed #4f46e5', borderRadius: 'var(--radius-md)', pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #ef4444, transparent)', animation: 'fadeIn 2s infinite alternate', top: '30%' }}></div>
            </div>
          </div>

          {/* Test Buttons - Simulate Scanner */}
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
              💻 Scanner Simulator Widget (For Testers)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button 
                onClick={() => handleQRScanned(officeSettings.staffQRToken || 'TEN80_STAFF_TOKEN_2026')}
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.5rem' }}
              >
                Scan Correct Fixed QR
              </button>
              <button 
                onClick={() => handleQRScanned('INVALID_SCAN_CODE_XYZ')}
                className="btn btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.5rem' }}
              >
                Scan Fake QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS RECEIPT */}
      {step === 'success' && authenticatedStaff && latestRecord && !showChangePassword && (
        <div style={{ textAlign: 'center' }} className="animated-fadeIn">
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <CheckCircle2 size={36} />
          </div>

          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verification Success</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Attendance logged successfully for today.
          </p>

          <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{latestRecord.staffName}</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {latestRecord.employeeId} • {latestRecord.department}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Action:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-indigo)' }}>
                  {latestRecord.checkOutTime ? 'Clock Out' : 'Clock In'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Time:</span>
                <span>
                  {new Date(latestRecord.checkOutTime || latestRecord.checkInTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status Classification:</span>
                <span style={{ fontWeight: '600' }}>{latestRecord.status}</span>
              </div>
              {latestRecord.gpsCoordinates && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Coordinates:</span>
                  <span>{latestRecord.gpsCoordinates.latitude.toFixed(5)}, {latestRecord.gpsCoordinates.longitude.toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleReset} className="btn btn-primary" style={{ width: '100%' }}>
            Done
          </button>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'center' }}>
        <Smartphone size={12} />
        <span>GPS Authorization is locked to portal session audits.</span>
      </div>

    </div>
  );
};
