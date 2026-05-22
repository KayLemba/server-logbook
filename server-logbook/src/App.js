import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useTheme, useLiveClock, useToast } from './hooks';
import { useAuth } from './context/AuthContext';
import EntryForm from './components/EntryForm';
import LogbookTable from './components/LogbookTable';
import StatsBar from './components/StatsBar';
import ExportModal from './components/ExportModal';
import ToastContainer from './components/Toast';
import AuthPage from './components/AuthPage';
import logo from './assets/logo.png';
import {
  IcoLogbook, IcoPlus, IcoExport, IcoSignOut,
  IcoSun, IcoMoon, IcoKey, IcoEye, IcoServer
} from './components/Icons';
import './styles/global.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const clock = useLiveClock();
  const { toasts, addToast, removeToast } = useToast();
  const { user, profile, loading: authLoading, signOut, isAdmin } = useAuth();

  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('log');
  const [editEntry, setEditEntry]   = useState(null);
  const [showExport, setShowExport] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('logbook_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('time_in', { ascending: false });
    if (error) addToast(`Failed to load entries: ${error.message}`, 'error');
    else setEntries(data || []);
    setLoading(false);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!user) return;
    fetchEntries();
    const channel = supabase
      .channel('logbook_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logbook_entries' }, fetchEntries)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchEntries]);

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setView('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => { setEditEntry(null); setView('log'); };
  const handleFormSuccess = () => {
    fetchEntries();
    if (editEntry) { setEditEntry(null); setView('log'); }
  };
  const handleSignOut = async () => { await signOut(); window.location.reload(); };

  const formattedClock = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate  = clock.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '18px',
      }}>
        <img src={logo} alt="Logo" style={{ height: '52px', objectFit: 'contain' }} />
        <span className="loading-spinner" style={{ width: '22px', height: '22px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
          Initialising…
        </span>
      </div>
    );
  }

  // ── Not logged in ──
  if (!user || !profile) {
    return (
      <>
        <AuthPage addToast={addToast} logo={logo} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  return (
    <div className="app-wrapper">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-logo">
          <img
            src={logo}
            alt="Exponent Bizolution"
            style={{
              height: '34px', objectFit: 'contain',
              filter: theme === 'dark' ? 'invert(1) brightness(1.6)' : 'none',
              transition: 'filter 0.3s',
            }}
          />
          <div className="logo-divider" />
          <div>
            <div className="logo-text">Server Room Logbook</div>
            <div className="logo-sub">Access Control System</div>
          </div>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-btn ${view === 'log' ? 'active' : ''}`}
            onClick={() => { setView('log'); setEditEntry(null); }}
          >
            <IcoLogbook size={15} />
            <span className="nav-label">Logbook</span>
          </button>

          {isAdmin && (
            <button
              className={`nav-btn ${view === 'new' && !editEntry ? 'active' : ''}`}
              onClick={() => { setView('new'); setEditEntry(null); }}
            >
              <IcoPlus size={15} />
              <span className="nav-label">New Entry</span>
            </button>
          )}

          <button className="nav-btn" onClick={() => setShowExport(true)}>
            <IcoExport size={15} />
            <span className="nav-label">Export</span>
          </button>

          <div className="live-clock">{formattedDate} · {formattedClock}</div>

          {/* User chip */}
          <div className="user-chip">
            <div className="user-avatar">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="user-name">{profile.full_name}</div>
              <div className={`role-badge ${isAdmin ? 'admin' : 'viewer'}`}>
                {isAdmin ? <><IcoKey size={9} /> Admin</> : <><IcoEye size={9} /> Viewer</>}
              </div>
            </div>
          </div>

          <button className="nav-btn danger" onClick={handleSignOut} title="Sign out">
            <IcoSignOut size={15} />
            <span className="nav-label">Sign Out</span>
          </button>

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? <IcoMoon size={15} /> : <IcoSun size={15} />}
          </button>
        </nav>
      </header>

      {/* ── Main ── */}
      <main className="main-content">
        <div style={{ marginBottom: '22px' }}>
          <div className="section-title">
            {view === 'new'
              ? editEntry ? `Editing — ${editEntry.full_name}` : 'New Access Entry'
              : 'Server Room Logbook'}
          </div>
          <div className="section-sub">
            {view === 'new'
              ? 'Complete all required fields and capture a signature before submitting'
              : isAdmin
                ? 'Full access — add, edit, delete and export entries'
                : 'Read-only access — view and export entries'}
          </div>
        </div>

        <StatsBar entries={entries} />

        {view === 'new' && isAdmin && (
          <EntryForm
            onSuccess={handleFormSuccess}
            addToast={addToast}
            editEntry={editEntry}
            onCancelEdit={handleCancelEdit}
          />
        )}

        <LogbookTable
          entries={entries}
          loading={loading}
          onEdit={handleEdit}
          onDelete={fetchEntries}
          addToast={addToast}
          isAdmin={isAdmin}
        />
      </main>

      {showExport && (
        <ExportModal entries={entries} onClose={() => setShowExport(false)} addToast={addToast} />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
