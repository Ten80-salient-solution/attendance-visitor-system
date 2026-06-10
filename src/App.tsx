import { useState, useEffect } from 'react';
import { Sun, Moon, ShieldAlert, User, ShieldCheck } from 'lucide-react';
import { Portal } from './components/Portal';
import { StaffPortal } from './components/StaffPortal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { initDB } from './utils/mockDb';

import 'leaflet/dist/leaflet.css';

function App() {
  // View states: 'portal' (visitor & landing) | 'staff-portal' | 'admin-login' | 'admin-dashboard'
  const [view, setView] = useState<'portal' | 'staff-portal' | 'admin-login' | 'admin-dashboard'>('staff-portal');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark'); // Default to modern dark theme
  const [initialRole, setInitialRole] = useState<'none' | 'visitor'>('none');

  // Initialize DB and parse URL path query parameters
  useEffect(() => {
    initDB();

    // URL Query Routing Check
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const modeParam = params.get('mode');
    const path = window.location.pathname;

    if (viewParam === 'staff' || path.endsWith('/staff')) {
      setView('staff-portal');
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
        <div className="brand" onClick={() => setView('staff-portal')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">T8</div>
          <span>Ten80 Salient Solutions</span>
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
                onClick={() => setView('admin-login')} 
                className="btn btn-secondary"
                style={{ display: 'flex', gap: '0.4rem', border: '1px solid var(--border-color)' }}
              >
                <ShieldCheck size={16} />
                Admin Portal
              </button>
            </div>
          )}

          {view === 'admin-login' && (
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
          <AdminLogin onLoginSuccess={(email) => { setAdminEmail(email); setView('admin-dashboard'); }} />
        )}

        {view === 'admin-dashboard' && adminEmail && (
          <AdminDashboard adminEmail={adminEmail} onLogout={() => { setAdminEmail(null); setView('staff-portal'); }} />
        )}
      </div>
    </div>
  );
}

export default App;
