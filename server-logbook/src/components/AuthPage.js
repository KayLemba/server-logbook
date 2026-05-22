import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IcoMail, IcoLock, IcoUser, IcoKey, IcoEye, IcoArrowRight, IcoArrowLeft, IcoCheck, IcoServer } from './Icons';

export default function AuthPage({ addToast, logo }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', role: 'viewer', resetEmail: '',
  });

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSignIn = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { addToast('Please fill in all fields', 'error'); return; }
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    if (error) {
      if (error.message.includes('timed out'))         addToast('Connection timed out — check your internet', 'error');
      else if (error.message.includes('Email not confirmed')) addToast('Please verify your email first', 'error');
      else if (error.message.includes('Invalid') || error.message.includes('invalid')) addToast('Incorrect email or password', 'error');
      else addToast(error.message, 'error');
    }
    setLoading(false);
  };

  const handleSignUp = async e => {
    e.preventDefault();
    if (!form.fullName.trim())                        { addToast('Please enter your full name', 'error'); return; }
    if (!form.email || !form.password)                { addToast('Please fill in all fields', 'error'); return; }
    if (form.password.length < 8)                     { addToast('Password must be at least 8 characters', 'error'); return; }
    if (form.password !== form.confirmPassword)        { addToast('Passwords do not match', 'error'); return; }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.fullName.trim(), form.role);
    if (error) addToast(error.message.includes('timed out') ? 'Connection timed out' : error.message, 'error');
    else setMode('verify');
    setLoading(false);
  };

  const handleForgot = async e => {
    e.preventDefault();
    if (!form.resetEmail) { addToast('Please enter your email address', 'error'); return; }
    setLoading(true);
    const { error } = await resetPassword(form.resetEmail);
    if (error) addToast(error.message, 'error');
    else setMode('forgot-sent');
    setLoading(false);
  };

  const inputRow = (icon, field, type, placeholder, extra = {}) => (
    <div className="form-group">
      <label style={{ textTransform: 'none', fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: 0, fontWeight: 500 }}>
        {icon}{placeholder}
      </label>
      <input type={type} value={form[field]} onChange={set(field)} placeholder={placeholder} required {...extra} />
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo block */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ height: '64px', objectFit: 'contain', display: 'block', margin: '0 auto 14px' }} />
            : <div style={{ width: '52px', height: '52px', background: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#fff' }}><IcoServer size={24} /></div>
          }
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Server Room Logbook
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>
            Access Control System
          </div>
        </div>

        {/* ── Verify ── */}
        {mode === 'verify' && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '36px 28px' }}>
              <div style={{ width: '56px', height: '56px', background: 'var(--accent-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent)' }}>
                <IcoMail size={24} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Check your email</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Verification link sent to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>.<br/>
                Click the link to activate your account.
              </p>
              <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.78rem', color: 'var(--accent)', marginBottom: '20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {form.role === 'admin' ? <IcoKey size={13} /> : <IcoEye size={13} />}
                <span>Role: <strong>{form.role === 'admin' ? 'IT Admin' : 'Viewer (Supervisor / MD)'}</strong></span>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMode('signin')}>
                <IcoArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ── Forgot Password ── */}
        {mode === 'forgot' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title"><IcoKey size={16} /> Reset Password</span>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.845rem', marginBottom: '18px', lineHeight: 1.6 }}>
                Enter your account email and we'll send a password reset link.
              </p>
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={form.resetEmail} onChange={set('resetEmail')} placeholder="your@email.com" required autoComplete="email" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                  {loading ? <><span className="loading-spinner" /> Sending…</> : <><IcoMail size={14} /> Send Reset Link</>}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.83rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IcoArrowLeft size={13} /> Back to Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Forgot Sent ── */}
        {mode === 'forgot-sent' && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '36px 28px' }}>
              <div style={{ width: '56px', height: '56px', background: 'var(--success-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--success)' }}>
                <IcoCheck size={24} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Reset link sent</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Check <strong style={{ color: 'var(--text-primary)' }}>{form.resetEmail}</strong> for a password reset link. It expires in 1 hour.
              </p>
              <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.78rem', color: 'var(--warning)', marginBottom: '20px', textAlign: 'left' }}>
                Check your spam folder if you don't see it within a few minutes.
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMode('signin')}>
                <IcoArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ── Sign In ── */}
        {mode === 'signin' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title"><IcoLock size={16} /> Sign In</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={form.password} onChange={set('password')} placeholder="Enter your password" required autoComplete="current-password" />
                  <div style={{ textAlign: 'right', marginTop: '3px' }}>
                    <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 500 }}>
                      Forgot password?
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                  {loading ? <><span className="loading-spinner" /> Signing in…</> : <>Sign In <IcoArrowRight size={14} /></>}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.845rem', color: 'var(--text-muted)' }}>
                No account?{' '}
                <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '0.845rem' }}>
                  Create one
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Sign Up ── */}
        {mode === 'signup' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title"><IcoUser size={16} /> Create Account</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="e.g. John Banda" required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={set('role')}>
                    <option value="viewer">Viewer — Supervisor / Managing Director</option>
                    <option value="admin">Admin — IT Administrator</option>
                  </select>
                  <div style={{ marginTop: '5px', padding: '8px 11px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {form.role === 'admin' ? <IcoKey size={12} /> : <IcoEye size={12} />}
                    {form.role === 'admin' ? 'Full access — add, edit, delete, export' : 'Read-only — view and export entries'}
                  </div>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" required autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" required autoComplete="new-password" />
                </div>
                {form.password && <PasswordStrength password={form.password} />}
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                  {loading ? <><span className="loading-spinner" /> Creating account…</> : <>Create Account <IcoArrowRight size={14} /></>}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.845rem', color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '0.845rem' }}>
                  Sign in
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          SECURED · SUPABASE AUTH · ALL ACCESS LOGGED
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ chars',     pass: password.length >= 8 },
    { label: 'Uppercase',    pass: /[A-Z]/.test(password) },
    { label: 'Number',       pass: /[0-9]/.test(password) },
    { label: 'Special char', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const bar   = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--warning)', 'var(--success)'];
  const lbl   = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ fontSize: '0.72rem' }}>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '5px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '100px', background: i < score ? bar[score] : 'var(--border)', transition: 'background 0.2s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '3px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {checks.map(c => (
            <span key={c.label} style={{ color: c.pass ? 'var(--success)' : 'var(--text-muted)' }}>
              {c.pass ? '✓' : '·'} {c.label}
            </span>
          ))}
        </div>
        <span style={{ color: bar[score], fontWeight: 600 }}>{lbl[score]}</span>
      </div>
    </div>
  );
}
