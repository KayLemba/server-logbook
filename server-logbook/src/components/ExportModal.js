import React, { useState } from 'react';
import { exportToCSV, exportToPDF, filterByDateRange } from '../utils/exportUtils';
import { IcoExport, IcoDownload, IcoFileText, IcoX, IcoCalendar } from './Icons';
import logo from '../assets/logo.png';

export default function ExportModal({ entries, onClose, addToast }) {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [loading, setLoading] = useState(null);

  const getFiltered = () => filterByDateRange(entries, from, to);

  const handleCSV = () => {
    const filtered = getFiltered();
    if (!filtered.length) { addToast('No entries in selected range', 'error'); return; }
    exportToCSV(filtered, `server_logbook_${from || 'all'}_to_${to || 'all'}.csv`);
    addToast(`CSV exported — ${filtered.length} entries`, 'success');
    onClose();
  };

  const handlePDF = async () => {
    const filtered = getFiltered();
    if (!filtered.length) { addToast('No entries in selected range', 'error'); return; }
    setLoading('pdf');
    try {
      await exportToPDF(filtered, from && to ? { from, to } : null, logo);
      addToast(`PDF exported — ${filtered.length} entries`, 'success');
      onClose();
    } catch (err) {
      console.error('PDF error:', err);
      addToast(`PDF error: ${err?.message || String(err)}`, 'error');
    }
    setLoading(null);
  };

  const count = getFiltered().length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title"><IcoExport size={16} /> Export Logbook</span>
          <button className="modal-close" onClick={onClose}><IcoX size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.845rem', marginBottom: '18px', lineHeight: 1.5 }}>
            Filter by date range or leave blank to export all entries.
          </p>
          <div className="date-range-grid">
            <div className="form-group">
              <label><IcoCalendar size={11} /> From Date</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label><IcoCalendar size={11} /> To Date</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <div className="info-banner">
            <IcoFileText size={15} />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>{count}</strong> entries will be exported
              {(from || to) && ` (filtered from ${entries.length} total)`}
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handleCSV} disabled={!!loading}>
            <IcoDownload size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={handlePDF} disabled={!!loading}>
            {loading === 'pdf'
              ? <><span className="loading-spinner" /> Generating…</>
              : <><IcoFileText size={14} /> Export PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}