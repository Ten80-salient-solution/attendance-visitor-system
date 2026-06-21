import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, MapPin, Search, Calendar, Filter, FileDown, LogOut, 
  LayoutDashboard, FileSpreadsheet, Map, ShieldAlert, Clock, 
  MapIcon, ShieldCheck, RefreshCw
} from 'lucide-react';
import { 
  getSettings, getVisitors, saveVisitors, getAuditLogs, 
  addAuditLog, syncWithCloud 
} from '../utils/mockDb';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/export';
import type { VisitorRecord, AuditLog, OfficeSettings } from '../types';

interface VisitorAdminDashboardProps {
  adminEmail: string;
  onLogout: () => void;
}

export const VisitorAdminDashboard: React.FC<VisitorAdminDashboardProps> = ({ adminEmail, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'visitors' | 'map' | 'audit'>('overview');
  
  // Data states
  const [settings, setSettings] = useState<OfficeSettings>(getSettings());
  const [visitors, setVisitors] = useState<VisitorRecord[]>(getVisitors());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(getAuditLogs());
  const [isSyncing, setIsSyncing] = useState(false);

  // Search/Filter states
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorStatus, setVisitorStatus] = useState('');
  const [visitorStartDate, setVisitorStartDate] = useState('');
  const [visitorEndDate, setVisitorEndDate] = useState('');
  
  // Google Maps refs and focus
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapFocusId] = useState<string>('off-1');
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: number; longitude: number; label: string } | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(!!(window as any).google?.maps);

  const reloadData = () => {
    setSettings(getSettings());
    setVisitors(getVisitors());
    setAuditLogs(getAuditLogs());
  };

  // Listen for dynamic Google Maps script load
  useEffect(() => {
    if ((window as any).google?.maps) return;
    const handleLoaded = () => setMapsLoaded(true);
    window.addEventListener('google_maps_loaded', handleLoaded);
    return () => window.removeEventListener('google_maps_loaded', handleLoaded);
  }, []);

  // Sync data on tab change
  useEffect(() => {
    reloadData();
  }, [activeTab]);

  // Listen for background sync updates
  useEffect(() => {
    const handleSync = () => {
      reloadData();
    };
    window.addEventListener('ten80_db_sync', handleSync);
    return () => window.removeEventListener('ten80_db_sync', handleSync);
  }, []);

  // Poll cloud database periodically to get cross-device updates
  useEffect(() => {
    syncWithCloud();
    const interval = setInterval(() => {
      syncWithCloud();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncWithCloud();
    reloadData();
    setIsSyncing(false);
  };

  // Manual check out of visitor by admin
  const handleAdminVisitorCheckout = (id: string, name: string) => {
    const timestampStr = new Date().toISOString();
    const currentVisitors = getVisitors();
    const updated = currentVisitors.map(v => {
      if (v.id === id) {
        return {
          ...v,
          status: 'Checked Out' as const,
          checkOutTime: timestampStr
        };
      }
      return v;
    });

    saveVisitors(updated);
    setVisitors(updated);

    // Add Audit Log
    addAuditLog({
      timestamp: timestampStr,
      actionType: 'CHECK_OUT_SUCCESS',
      userEmail: `${name} (Visitor)`,
      details: `Visitor checked out manually by Admin (${adminEmail}) via Visitor Dashboard override.`,
      gpsCoordinates: { latitude: 6.5244, longitude: 3.3792 },
      deviceInfo: navigator.userAgent
    });
  };

  // Google Maps Initialization
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

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
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='36' height='36'><path fill='%23a855f7' d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/></svg>",
          scaledSize: new google.maps.Size(36, 36),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(18, 36),
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
              <b style="color: #a855f7; font-size: 0.95rem;">${office.name}</b><br/>
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
          strokeColor: '#a855f7',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#a855f7',
          fillOpacity: 0.1,
          map: map,
          center: { lat: office.latitude, lng: office.longitude },
          radius: office.radiusMeters,
        });
      });

      // Add Active Visitors Markers
      const activeVisitors = visitors.filter(v => v.status === 'Inside' && v.gpsCoordinates);

      activeVisitors.forEach(v => {
        if (!v.gpsCoordinates) return;

        const visIcon = {
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='28' height='28'><path fill='%23ec4899' d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z'/></svg>",
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
              <span style="font-weight: 700; color: #ec4899;">Visitor Present</span><br/>
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
  }, [activeTab, settings, visitors, mapFocusId, selectedCoordinates, mapsLoaded]);

  // Navigate to map with focused GPS coordinates
  const handleGPSClick = (latitude: number, longitude: number, label: string) => {
    setSelectedCoordinates({ latitude, longitude, label });
    setActiveTab('map');
  };

  // Filtered Visitors list
  const filteredVisitors = visitors.filter(v => {
    const query = visitorSearch.trim().toLowerCase();
    const matchQuery = 
      v.visitorName.toLowerCase().includes(query) ||
      v.id.toLowerCase().includes(query) ||
      v.phone.includes(query) ||
      (v.company && v.company.toLowerCase().includes(query)) ||
      v.hostEmployee.toLowerCase().includes(query);
    
    const matchStatus = visitorStatus === '' || v.status === visitorStatus;
    
    let matchDate = true;
    if (visitorStartDate) {
      const start = new Date(visitorStartDate + 'T00:00:00');
      const checkIn = new Date(v.checkInTime);
      matchDate = matchDate && checkIn >= start;
    }
    if (visitorEndDate) {
      const end = new Date(visitorEndDate + 'T23:59:59');
      const checkIn = new Date(v.checkInTime);
      matchDate = matchDate && checkIn <= end;
    }

    return matchQuery && matchStatus && matchDate;
  });

  // Filtered Audit Logs: Visitor actions only
  const filteredAuditLogs = auditLogs.filter(l => {
    const isVisitorAction = 
      l.userEmail.includes('(Visitor)') || 
      l.userEmail.toLowerCase().includes('multiforteresources.com') ||
      l.details.toLowerCase().includes('visitor');
    return isVisitorAction;
  });

  // Export Visitor Log
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
      v.gpsCoordinates ? `${v.gpsCoordinates.latitude.toFixed(5)}, ${v.gpsCoordinates.longitude.toFixed(5)}` : '-',
      v.status
    ]);

    const title = `Visitor Access Report - ${new Date().toLocaleDateString()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `Visitor_Logs_${todayStr}.${format === 'pdf' ? 'pdf' : format === 'excel' ? 'xls' : 'csv'}`;

    if (format === 'csv') {
      exportToCSV(filename, headers, rows);
    } else if (format === 'excel') {
      exportToExcel(filename, 'Visitor Logs', headers, rows);
    } else {
      exportToPDF(filename, title, headers, rows);
    }
  };

  // Visitor Metrics
  const totalVisitors = visitors.length;
  const visitorsInside = visitors.filter(v => v.status === 'Inside').length;
  const visitorsCheckedOut = visitors.filter(v => v.status === 'Checked Out').length;

  return (
    <div className="dashboard-container">
      
      {/* Side Bar Navigation */}
      <aside className="sidebar" style={{ borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="sidebar-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              MF
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>Multiforte Resources</h4>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Visitor Admin</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-menu">
          <div 
            onClick={() => { setActiveTab('overview'); setSelectedCoordinates(null); }} 
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
            style={activeTab === 'overview' ? { color: 'var(--accent-purple)', backgroundColor: 'rgba(168, 85, 247, 0.08)' } : {}}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </div>

          <div 
            onClick={() => setActiveTab('visitors')} 
            className={`sidebar-link ${activeTab === 'visitors' ? 'active' : ''}`}
            style={activeTab === 'visitors' ? { color: 'var(--accent-purple)', backgroundColor: 'rgba(168, 85, 247, 0.08)' } : {}}
          >
            <FileSpreadsheet size={18} />
            <span>Visitor Logs</span>
          </div>

          <div 
            onClick={() => setActiveTab('map')} 
            className={`sidebar-link ${activeTab === 'map' ? 'active' : ''}`}
            style={activeTab === 'map' ? { color: 'var(--accent-purple)', backgroundColor: 'rgba(168, 85, 247, 0.08)' } : {}}
          >
            <Map size={18} />
            <span>Interactive Map</span>
          </div>

          <div 
            onClick={() => setActiveTab('audit')} 
            className={`sidebar-link ${activeTab === 'audit' ? 'active' : ''}`}
            style={activeTab === 'audit' ? { color: 'var(--accent-purple)', backgroundColor: 'rgba(168, 85, 247, 0.08)' } : {}}
          >
            <ShieldAlert size={18} />
            <span>Access Audits</span>
          </div>
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={onLogout} 
            className="sidebar-link btn-danger" 
            style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
          >
            <LogOut size={16} />
            <span>Exit Dashboard</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        
        {/* Header toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Visitor Intelligence Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Welcome back. Managing records for <b>{adminEmail}</b></p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleManualSync}
              disabled={isSyncing}
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} className={isSyncing ? 'animated-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Database'}
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="animated-fadeIn">
            {/* Quick Stats Grid */}
            <div className="stats-grid">
              
              <div className="stat-card glass-panel">
                <div className="stat-info">
                  <h5>Registered Visitors</h5>
                  <div className="stat-value">{totalVisitors}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All-time registrations</span>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
                  <Users size={24} />
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-info">
                  <h5>Currently Inside</h5>
                  <div className="stat-value">{visitorsInside}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting departure check</span>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-pink)' }}>
                  <Clock size={24} />
                </div>
              </div>

              <div className="stat-card glass-panel">
                <div className="stat-info">
                  <h5>Checked Out</h5>
                  <div className="stat-value">{visitorsCheckedOut}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signed out safely</span>
                </div>
                <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                  <ShieldCheck size={24} />
                </div>
              </div>

            </div>

            {/* Split layout: Recent Activity Logs */}
            <div style={{ marginTop: '2rem' }}>
              <div className="table-card glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3>Recent Visitor Sign In & Out Audits</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Real-time audit log tracker</p>
                  </div>
                  <button onClick={() => setActiveTab('audit')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>View All</button>
                </div>
                
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Type</th>
                        <th>User (Visitor Name)</th>
                        <th>Details</th>
                        <th>GPS location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.slice(0, 10).map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td>
                            <span className={`badge ${
                              log.actionType === 'CHECK_IN_SUCCESS' ? 'badge-info' : 'badge-success'
                            }`}>
                              {log.actionType === 'CHECK_IN_SUCCESS' ? 'Sign In' : 'Sign Out'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{log.userEmail}</td>
                          <td>{log.details}</td>
                          <td>
                            {log.gpsCoordinates ? (
                              <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary)' }}>
                                <MapPin size={12} />
                                {log.gpsCoordinates.latitude.toFixed(4)}, {log.gpsCoordinates.longitude.toFixed(4)}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                      {filteredAuditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No visitor audit log history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VISITOR LOGS */}
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
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-purple)' }}
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

        {/* TAB 3: MAP VIEW */}
        {activeTab === 'map' && (
          <div className="animated-fadeIn" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <h2>Visitor Geofencing & GPS Map</h2>
                <p style={{ color: 'var(--text-muted)' }}>Real-time display of active visitors present on site</p>
              </div>

              {selectedCoordinates && (
                <button 
                  onClick={() => setSelectedCoordinates(null)} 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Clear Selection Focus
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', flexGrow: 1, minHeight: '500px', flexWrap: 'wrap' }} className="map-view-grid">
              
              {/* Map Panel */}
              <div className="glass-panel" style={{ padding: 0, position: 'relative', overflow: 'hidden', minHeight: '400px' }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '450px' }} />
                {!mapsLoaded && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', zIndex: 10 }}>
                    <MapIcon size={40} className="animated-pulse" style={{ color: 'var(--accent-purple)' }} />
                    <p style={{ fontWeight: 600 }}>Loading Google Maps Services...</p>
                  </div>
                )}
              </div>

              {/* Map Sidebar: Active Visitors lists */}
              <div className="glass-panel map-sidebar" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', maxHeight: '500px', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '1rem' }}>
                  <Users size={16} style={{ color: 'var(--accent-purple)' }} />
                  Active Visitors Inside
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {visitors.filter(v => v.status === 'Inside').map(v => (
                    <div 
                      key={v.id} 
                      className={`glass-panel`}
                      style={{ 
                        padding: '0.75rem', 
                        cursor: v.gpsCoordinates ? 'pointer' : 'default',
                        borderLeft: '3px solid var(--accent-purple)',
                        backgroundColor: 'var(--bg-secondary)',
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => v.gpsCoordinates && handleGPSClick(v.gpsCoordinates.latitude, v.gpsCoordinates.longitude, `Visitor: ${v.visitorName}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <b style={{ fontSize: '0.9rem' }}>{v.visitorName}</b>
                        {v.gpsCoordinates && <MapPin size={14} style={{ color: 'var(--accent-purple)' }} />}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Host: {v.hostEmployee}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Company: {v.company || '-'}</span>
                      {v.gpsCoordinates ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                          GPS Present (Click to Focus)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                          No GPS coordinate records
                        </span>
                      )}
                    </div>
                  ))}

                  {visitors.filter(v => v.status === 'Inside').length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No visitors inside the premises.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: ACCESS AUDITS */}
        {activeTab === 'audit' && (
          <div className="animated-fadeIn">
            <h2 style={{ marginBottom: '1.5rem' }}>Security Access Audits</h2>

            <div className="table-card glass-panel">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Visitor Activity Audit Trail</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Immutable logs tracking registrations, check-ins, check-outs, and login events.</p>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action Event</th>
                      <th>Target ID / Operator</th>
                      <th>Activity Details</th>
                      <th>GPS Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.length > 0 ? (
                      filteredAuditLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${
                              log.actionType === 'CHECK_IN_SUCCESS' || log.actionType === 'LOGIN_SUCCESS' ? 'badge-info' : 'badge-success'
                            }`}>
                              {log.actionType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.userEmail}</td>
                          <td>{log.details}</td>
                          <td>
                            {log.gpsCoordinates ? (
                              <button
                                type="button"
                                onClick={() => handleGPSClick(log.gpsCoordinates!.latitude, log.gpsCoordinates!.longitude, `Audit Event: ${log.actionType}`)}
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--accent-purple)', cursor: 'pointer' }}
                              >
                                <MapPin size={12} />
                                {log.gpsCoordinates.latitude.toFixed(4)}, {log.gpsCoordinates.longitude.toFixed(4)}
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No visitor audit logs recorded in system database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
