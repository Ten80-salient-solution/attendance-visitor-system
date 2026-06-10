import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Phone, FileText, 
  User, Check, AlertTriangle, LogIn, LogOut, ArrowLeft
} from 'lucide-react';
import { 
  getVisitors, saveVisitors, addAuditLog, syncWithCloud
} from '../utils/mockDb';
import type { VisitorRecord } from '../types';

interface PortalProps {
  initialRole?: 'none' | 'visitor';
}

export const Portal: React.FC<PortalProps> = ({ initialRole = 'none' }) => {
  const [role, setRole] = useState<'none' | 'visitor'>(initialRole === 'visitor' ? 'visitor' : 'none');
  const [visitorAction, setVisitorAction] = useState<'none' | 'checkin' | 'checkout'>(
    initialRole === 'visitor' ? 'checkin' : 'none'
  );
  
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  // Visitor Checkin Form State
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [visitorReason, setVisitorReason] = useState('');
  const [visitorHost, setVisitorHost] = useState('');
  const [visitorSuccessData, setVisitorSuccessData] = useState<VisitorRecord | null>(null);

  // Visitor Checkout State
  const [checkoutSearch, setCheckoutSearch] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Re-render trigger on db sync events
  const [syncTrigger, setSyncTrigger] = useState(0);

  useEffect(() => {
    const handleSync = () => {
      setSyncTrigger(prev => prev + 1);
    };
    window.addEventListener('ten80_db_sync', handleSync);
    return () => window.removeEventListener('ten80_db_sync', handleSync);
  }, []);

  useEffect(() => {
    syncWithCloud();
    const interval = setInterval(() => {
      syncWithCloud();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialRole !== 'none') {
      setRole(initialRole);
      if (initialRole === 'visitor') {
        setVisitorAction('checkin');
      }
    }
  }, [initialRole]);

  useEffect(() => {
    if (role === 'none') {
      window.location.search = '?view=staff';
    }
  }, [role]);

  useEffect(() => {
    if (role === 'visitor') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGpsCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setGpsError(null);
          },
          (error) => {
            console.error("GPS error: ", error.message);
            setGpsError("Device GPS coordinates are required to check in. Please authorize location permissions.");
          },
          { enableHighAccuracy: true }
        );
      } else {
        setGpsError("Geolocation is not supported by this browser.");
      }
    }
  }, [role]);

  const handleBack = () => {
    setRole('none');
    setVisitorAction('none');
    setVisitorSuccessData(null);
    setCheckoutSearch('');
    setCheckoutMessage(null);
  };

  // Visitor Check-in Submission
  const handleVisitorCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorPhone || !visitorReason || !visitorHost) return;

    const visitorId = `V-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestampStr = new Date().toISOString();
    
    const newVisitor: VisitorRecord = {
      id: visitorId,
      visitorName: visitorName.trim(),
      phone: visitorPhone.trim(),
      email: visitorEmail.trim() || undefined,
      company: visitorCompany.trim() || undefined,
      reasonForVisit: visitorReason,
      hostEmployee: visitorHost,
      checkInTime: timestampStr,
      checkOutTime: null,
      gpsCoordinates: { latitude: gpsCoords?.latitude || 6.5244, longitude: gpsCoords?.longitude || 3.3792 },
      status: 'Inside',
    };

    const visitors = getVisitors();
    visitors.push(newVisitor);
    saveVisitors(visitors);

    setVisitorSuccessData(newVisitor);
    addAuditLog({
      timestamp: timestampStr,
      actionType: 'CHECK_IN_SUCCESS',
      userEmail: `${visitorName} (Visitor)`,
      details: `Visitor registered and checked in (ID: ${visitorId}). Host: ${visitorHost}.`,
      gpsCoordinates: { latitude: gpsCoords?.latitude || 6.5244, longitude: gpsCoords?.longitude || 3.3792 },
      deviceInfo: navigator.userAgent
    });

    // Reset forms
    setVisitorName('');
    setVisitorPhone('');
    setVisitorEmail('');
    setVisitorCompany('');
    setVisitorReason('');
    setVisitorHost('');
  };

  // Visitor Checkout Action by Name
  const handleVisitorCheckoutByName = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutMessage(null);
    const query = checkoutSearch.trim().toLowerCase();
    if (!query) return;

    const visitors = getVisitors();
    
    // Find matching visitor who is currently 'Inside'
    // First try exact name match
    let match = visitors.find(
      v => v.status === 'Inside' && v.visitorName.toLowerCase() === query
    );
    
    // If not found, try partial case-insensitive match
    if (!match) {
      match = visitors.find(
        v => v.status === 'Inside' && v.visitorName.toLowerCase().includes(query)
      );
    }

    if (!match) {
      setCheckoutMessage({
        type: 'error',
        text: 'No active visitor record found inside the building for this name.',
      });
      return;
    }

    const timestampStr = new Date().toISOString();
    const updatedVisitors = [...visitors];
    const index = visitors.findIndex(v => v.id === match!.id);
    
    updatedVisitors[index] = {
      ...match,
      checkOutTime: timestampStr,
      status: 'Checked Out',
    };

    saveVisitors(updatedVisitors);
    
    // Clear name field
    setCheckoutSearch('');
    
    setCheckoutMessage({
      type: 'success',
      text: `Thank you, ${match.visitorName}! Check-out completed at ${new Date(timestampStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    });

    addAuditLog({
      timestamp: timestampStr,
      actionType: 'CHECK_OUT_SUCCESS',
      userEmail: `${match.visitorName} (Visitor)`,
      details: `Visitor checked out successfully (ID: ${match.id}) via name sign-out.`,
      gpsCoordinates: { latitude: gpsCoords?.latitude || 6.5244, longitude: gpsCoords?.longitude || 3.3792 },
      deviceInfo: navigator.userAgent
    });
  };

  return (
    <div className="portal-wrapper glass-panel animated-fadeIn">
      {/* 1. Main Welcome Role Selection */}
      {role === 'none' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Redirecting to Staff Portal...</p>
        </div>
      )}



      {/* 3. Visitor Hub Selection */}
      {role === 'visitor' && visitorAction === 'none' && (
        <div>
          <button onClick={handleBack} className="btn btn-secondary" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.8rem' }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div className="portal-header">
            <h3>Visitor Management</h3>
            <p>Welcome! Are you arriving or departing the office space?</p>
          </div>

          <div className="portal-grid-options">
            <div className="portal-option-card glass-panel" onClick={() => setVisitorAction('checkin')}>
              <div className="portal-option-icon">
                <LogIn size={28} />
              </div>
              <h4>Check-In</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fill in the arrival form to receive a Visitor ID pass.</p>
            </div>

            <div className="portal-option-card glass-panel" onClick={() => setVisitorAction('checkout')}>
              <div className="portal-option-icon">
                <LogOut size={28} />
              </div>
              <h4>Check-Out</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Search and submit departures before exiting the building.</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Visitor Check-In Form */}
      {role === 'visitor' && visitorAction === 'checkin' && !visitorSuccessData && (
        <div>
          <button onClick={() => setVisitorAction('none')} className="btn btn-secondary" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.8rem' }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div className="portal-header" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <h3>Visitor Registration</h3>
            <p>Please provide details about your visit for access validation.</p>
          </div>

          <form onSubmit={handleVisitorCheckinSubmit}>
            {gpsError && (
              <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', lineHeight: 1.3, textAlign: 'left' }}>{gpsError}</span>
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="vis-name">Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="vis-name"
                  type="text"
                  required
                  placeholder="John Doe"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="vis-phone">Phone Number *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="vis-phone"
                  type="tel"
                  required
                  placeholder="+234..."
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="vis-email">Email (Optional)</label>
                <input
                  id="vis-email"
                  type="email"
                  placeholder="john@example.com"
                  className="form-input"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="vis-company">Company (Optional)</label>
                <input
                  id="vis-company"
                  type="text"
                  placeholder="Company Ltd"
                  className="form-input"
                  value={visitorCompany}
                  onChange={(e) => setVisitorCompany(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="vis-host">Person Being Visited (Host Employee) *</label>
              <div style={{ position: 'relative' }}>
                <UserCheck size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="vis-host"
                  type="text"
                  required
                  placeholder="Enter employee name"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={visitorHost}
                  onChange={(e) => setVisitorHost(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="vis-reason">Reason for Visit *</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '12px', color: 'var(--text-muted)' }} />
                <textarea
                  id="vis-reason"
                  required
                  placeholder="e.g. Scheduled meeting, system maintenance, delivery"
                  className="form-textarea"
                  rows={3}
                  style={{ paddingLeft: '2.5rem' }}
                  value={visitorReason}
                  onChange={(e) => setVisitorReason(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Complete Check-In
            </button>
          </form>
        </div>
      )}

      {/* 5. Visitor Check-In Success Pass */}
      {role === 'visitor' && visitorAction === 'checkin' && visitorSuccessData && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }} className="animated-fadeIn">
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', border: '3px solid var(--success)' }}>
            <Check size={60} strokeWidth={3} />
          </div>

          <h3 style={{ fontSize: '1.8rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>Sign in Complete</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.05rem' }}>Welcome to Ten80 Salient Solutions.</p>

          <button onClick={handleBack} className="btn btn-primary" style={{ width: '100%', maxWidth: '300px' }}>
            Done
          </button>
        </div>
      )}

      {/* 6. Visitor Check-Out Name-Only Sign-Out */}
      {role === 'visitor' && visitorAction === 'checkout' && (
        <div>
          <button onClick={() => setVisitorAction('none')} className="btn btn-secondary" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.8rem' }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div className="portal-header" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <h3>Visitor Sign-Out</h3>
            <p>Input your name and click Sign-Out to register your departure.</p>
          </div>

          {checkoutMessage && (
            <div className={`badge ${checkoutMessage.type === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ width: '100%', padding: '1rem', display: 'flex', gap: '0.5rem', margin: '0 0 1.5rem 0', borderRadius: 'var(--radius-md)' }}>
              {checkoutMessage.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
              <span style={{ fontSize: '0.875rem' }}>{checkoutMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleVisitorCheckoutByName}>
            <div className="form-group">
              <label className="form-label" htmlFor="checkout-name">Your Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="checkout-name"
                  type="text"
                  required
                  placeholder="Enter the name you registered with"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={checkoutSearch}
                  onChange={(e) => setCheckoutSearch(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-danger" style={{ width: '100%', marginTop: '1.5rem', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={18} /> Sign-Out
            </button>
          </form>
        </div>
      )}
      <span style={{ display: 'none' }}>{syncTrigger}</span>
    </div>
  );
};
