import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, AlertTriangle, Eye, EyeOff, ArrowLeft, Check, Key } from 'lucide-react';
import { addAuditLog } from '../utils/mockDb';

interface AdminLoginProps {
  onLoginSuccess: (email: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password Reset State
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);

    const emailClean = email.trim().toLowerCase();
    const storedPassword = localStorage.getItem('ten80_admin_password') || 'admin123';

    // Secure authentication check (mock backend credential storage)
    if (emailClean === 'admin@ten80salientsolution.com' && password === storedPassword) {
      // Log successful login
      addAuditLog({
        timestamp: new Date().toISOString(),
        actionType: 'LOGIN_SUCCESS',
        userEmail: emailClean,
        details: 'Admin authenticated successfully. Access granted to Dashboard.',
        deviceInfo: navigator.userAgent
      });
      
      onLoginSuccess(emailClean);
    } else {
      setError('Invalid admin credentials. Please try again.');
      
      // Log login failure
      addAuditLog({
        timestamp: new Date().toISOString(),
        actionType: 'LOGIN_FAILURE',
        userEmail: emailClean || 'unknown_admin',
        details: 'Failed admin login attempt. Unauthorized password entered.',
        deviceInfo: navigator.userAgent
      });
    }
  };

  const handleStartReset = async () => {
    setResetError(null);
    setOtp('');
    setIsSendingOtp(true);
    
    // Generate secure 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    try {
      const response = await fetch("https://formsubmit.co/ajax/Officialmultiforteresources@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          _subject: "Ten80 Salient Solutions - Secure Admin OTP Verification",
          message: `Your secure one-time passcode (OTP) for admin dashboard password reset is: ${code}. This code is valid for 10 minutes.`,
          _captcha: "false",
          _template: "box"
        })
      });

      if (response.ok) {
        setView('forgot');
        // Log audit
        addAuditLog({
          timestamp: new Date().toISOString(),
          actionType: 'PASSWORD_RESET_REQUESTED',
          userEmail: 'admin@ten80salientsolution.com',
          details: 'Password reset requested. Secure OTP code sent to Officialmultiforteresources@gmail.com.',
          deviceInfo: navigator.userAgent
        });
      } else {
        const errorData = await response.json();
        setResetError(errorData.message || 'Failed to dispatch secure OTP email. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setResetError('Network error: Unable to connect to OTP dispatch server.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (otp.trim() === generatedOtp) {
      setNewPassword('');
      setConfirmPassword('');
      setView('reset');
    } else {
      setResetError('Invalid OTP code. Please enter the correct code sent to your email.');
    }
  };

  const handlePasswordOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }

    // Save new password
    localStorage.setItem('ten80_admin_password', newPassword);
    
    // Log audit
    addAuditLog({
      timestamp: new Date().toISOString(),
      actionType: 'PASSWORD_RESET_SUCCESS',
      userEmail: 'admin@ten80salientsolution.com',
      details: 'Admin password reset successfully verified via OTP authorization.',
      deviceInfo: navigator.userAgent
    });

    setResetSuccess('Password has been updated successfully! Please log in.');
    setError(null);
    setPassword('');
    setView('login');
  };

  return (
    <div className="portal-wrapper glass-panel animated-fadeIn" style={{ maxWidth: '420px', marginTop: '6rem' }}>
      
      {/* LOGIN VIEW */}
      {view === 'login' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <ShieldCheck size={30} />
            </div>
            <h2>Admin Gateway</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Access the real-time monitoring dashboard</p>
          </div>

          {resetSuccess && (
            <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <Check size={18} />
              <span style={{ fontSize: '0.85rem' }}>{resetSuccess}</span>
            </div>
          )}

          {error && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">Admin Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                 <input
                  id="admin-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="Enter your admin email"
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="admin-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button 
                type="button" 
                onClick={handleStartReset}
                disabled={isSendingOtp}
                className="btn-link"
                style={{ fontSize: '0.85rem', color: 'var(--accent-indigo)', background: 'none', border: 'none', cursor: isSendingOtp ? 'not-allowed' : 'pointer', padding: 0 }}
              >
                {isSendingOtp ? 'Sending OTP...' : 'Reset Password'}
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Authenticate Access
            </button>
          </form>
        </>
      )}

      {/* FORGOT OTP VIEW */}
      {view === 'forgot' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Mail size={30} />
            </div>
            <h2>Verify Reset OTP</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              An OTP code has been sent to <br />
              <b style={{ color: 'var(--text)' }}>Officialmultiforteresources@gmail.com</b>.
            </p>
          </div>

          {resetError && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '0.85rem' }}>{resetError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" htmlFor="otp-input">Verification Code (OTP)</label>
              <input
                id="otp-input"
                type="text"
                required
                placeholder="######"
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.3rem', fontWeight: 'bold' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setView('login')} 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <ArrowLeft size={16} /> Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                Verify OTP
              </button>
            </div>
          </form>
        </>
      )}

      {/* NEW PASSWORD OVERRIDE VIEW */}
      {view === 'reset' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Key size={30} />
            </div>
            <h2>New Password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Define your new admin dashboard access password</p>
          </div>

          {resetError && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: '0.85rem' }}>{resetError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordOverride}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Save and Continue
            </button>
          </form>
        </>
      )}

    </div>
  );
};
