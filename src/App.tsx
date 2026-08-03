import { useState, useEffect } from 'react';
import { Sun, Moon, ShieldAlert, User, ShieldCheck, Users } from 'lucide-react';
import { Portal } from './components/Portal';
import { StaffPortal } from './components/StaffPortal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { VisitorAdminLogin } from './components/VisitorAdminLogin';
import { VisitorAdminDashboard } from './components/VisitorAdminDashboard';
import { initDB } from './utils/mockDb';

import 'leaflet/dist/leaflet.css';

function App() {
  // View states: 'portal' | 'staff-portal' | 'admin-login' | 'admin-dashboard' | 'visitor-admin-login' | 'visitor-admin-dashboard'
  const [view, setView] = useState<'portal' | 'staff-portal' | 'admin-login' | 'admin-dashboard' | 'visitor-admin-login' | 'visitor-admin-dashboard'>('staff-portal');
  const [adminEmail, setAdminEmail] = useState<string | null>(() => localStorage.getItem('ten80_active_admin_email'));
  const [visitorAdminEmail, setVisitorAdminEmail] = useState<string | null>(() => localStorage.getItem('ten80_active_visitor_admin_email'));
  const [theme, setTheme] = useState<'dark' | 'light'>('dark'); // Default to modern dark theme
  const [initialRole, setInitialRole] = useState<'none' | 'visitor'>('none');

  // Initialize DB and parse URL path query parameters
  useEffect(() => {
    initDB();

    const storedAdmin = localStorage.getItem('ten80_active_admin_email');
    const storedVisitorAdmin = localStorage.getItem('ten80_active_visitor_admin_email');

    // URL Query Routing Check
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const modeParam = params.get('mode');
    const path = window.location.pathname;

    if (storedAdmin) {
      setView('admin-dashboard');
    } else if (storedVisitorAdmin) {
      setView('visitor-admin-dashboard');
    } else if (viewParam === 'staff' || path.endsWith('/staff')) {
      setView('staff-portal');
    } else if (viewParam === 'admin' || path.endsWith('/admin')) {
      setView('admin-login');
    } else if (viewParam === 'visitor-admin' || path.endsWith('/visitor-admin')) {
      setView('visitor-admin-login');
    } else if (modeParam === 'visitor') {
      setInitialRole('visitor');
      setView('portal');
    }
  }, []);

  // Update theme class on HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="navbar">
        <div className="brand" onClick={() => {
          if (view === 'visitor-admin-login' || view === 'visitor-admin-dashboard') {
            setView('visitor-admin-login');
          } else {
            setView('staff-portal');
          }
        }} style={{ cursor: 'pointer' }}>
          {view === 'visitor-admin-login' || view === 'visitor-admin-dashboard' ? (
            <>
              <img src="/logo.jpg" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', backgroundColor: 'white', padding: '2px', border: '1px solid var(--border-color)', flexShrink: 0 }} />
              <span>Multiforte Resources Limited</span>
            </>
          ) : (
            <>
              <img src="/logo.jpg" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', backgroundColor: 'white', padding: '2px', border: '1px solid var(--border-color)', flexShrink: 0 }} />
              <span>Ten80 Salient Solutions</span>
            </>
          )}
        </div>

        <div className="nav-actions">
          {/* Theme Toggle Button */}
          <button 
            type="button" 
            onClick={toggleTheme} 
            className="btn-icon-only"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {view === 'staff-portal' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setView('visitor-admin-login')} 
                className="btn btn-secondary"
                style={{ display: 'flex', gap: '0.4rem', border: '1px solid var(--border-color)', color: 'var(--accent-purple)' }}
              >
                <Users size={16} />
                Visitor Admin
              </button>
              <button 
                type="button" 
                onClick={() => setView('admin-login')} 
                className="btn btn-secondary"
                style={{ display: 'flex', gap: '0.4rem', border: '1px solid var(--border-color)' }}
              >
                <ShieldCheck size={16} />
                Admin Portal
              </button>
            </div>
          )}

          {(view === 'admin-login' || view === 'visitor-admin-login') && (
            <button 
              type="button" 
              onClick={() => setView('staff-portal')} 
              className="btn btn-secondary"
              style={{ display: 'flex', gap: '0.4rem', border: '1px solid var(--border-color)' }}
            >
              <User size={16} />
              Clock Portal
            </button>
          )}

          {view === 'admin-dashboard' && adminEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldAlert size={14} className="text-indigo-500" />
                {adminEmail}
              </span>
              <button 
                type="button" 
                onClick={() => setView('staff-portal')} 
                className="btn btn-secondary"
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
              >
                Clock Portal
              </button>
            </div>
          )}

          {view === 'visitor-admin-dashboard' && visitorAdminEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldAlert size={14} style={{ color: 'var(--accent-purple)' }} />
                {visitorAdminEmail}
              </span>
              <button 
                type="button" 
                onClick={() => { setVisitorAdminEmail(null); setView('staff-portal'); }} 
                className="btn btn-secondary"
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
              >
                Clock Portal
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Page Layout */}
      <div style={{ flexGrow: 1, position: 'relative' }}>
        {view === 'portal' && (
          <Portal initialRole={initialRole} />
        )}

        {view === 'staff-portal' && (
          <StaffPortal />
        )}

        {view === 'admin-login' && (
          <AdminLogin onLoginSuccess={(email) => { 
            setAdminEmail(email); 
            localStorage.setItem('ten80_active_admin_email', email);
            setView('admin-dashboard'); 
          }} />
        )}

        {view === 'admin-dashboard' && adminEmail && (
          <AdminDashboard adminEmail={adminEmail} onLogout={() => { 
            setAdminEmail(null); 
            localStorage.removeItem('ten80_active_admin_email');
            setView('staff-portal'); 
          }} />
        )}

        {view === 'visitor-admin-login' && (
          <VisitorAdminLogin 
            onLoginSuccess={(email) => { 
              setVisitorAdminEmail(email); 
              localStorage.setItem('ten80_active_visitor_admin_email', email);
              setView('visitor-admin-dashboard'); 
            }} 
            onBackToClock={() => setView('staff-portal')}
          />
        )}

        {view === 'visitor-admin-dashboard' && visitorAdminEmail && (
          <VisitorAdminDashboard adminEmail={visitorAdminEmail} onLogout={() => { 
            setVisitorAdminEmail(null); 
            localStorage.removeItem('ten80_active_visitor_admin_email');
            setView('staff-portal'); 
          }} />
        )}
      </div>
    </div>
  );
}

export default App;
