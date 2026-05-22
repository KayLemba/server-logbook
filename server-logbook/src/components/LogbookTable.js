import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatDate, formatTime } from '../utils/exportUtils';
import { IcoEdit, IcoTrash, IcoSearch, IcoX, IcoLogbook, IcoUser, IcoPenLine } from './Icons';

export default function LogbookTable({ entries, loading, onEdit, onDelete, addToast, isAdmin }) {
  const [search, setSearch]               = useState('');
  const [sortField, setSortField]         = useState('date');
  const [sortDir, setSortDir]             = useState('desc');
  const [viewSig, setViewSig]             = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries
      .filter(e => !q ||
        e.full_name?.toLowerCase().includes(q) ||
        e.organization?.toLowerCase().includes(q) ||
        e.purpose?.toLowerCase().includes(q) ||
        e.authorized_by?.toLowerCase().includes(q) ||
        e.submitted_by_name?.toLowerCase().includes(q) ||
        e.remarks?.toLowerCase().includes(q) ||
        e.date?.includes(q)
      )
      .sort((a, b) => {
        const cmp = String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [entries, search, sortField, sortDir]);

  const handleDelete = async (id) => {
    const { error } = await supabase.from('logbook_entries').delete().eq('id', id);
    if (error) addToast(`Delete failed: ${error.message}`, 'error');
    else { addToast('Entry deleted', 'info'); onDelete(); }
    setConfirmDelete(null);
  };

  const SortTh = ({ field, label }) => (
    <th onClick={() => handleSort(field)} className={sortField === field ? 'sorted' : ''}>
      {label}
      <span className="sort-icon">{sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>
    </th>
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <IcoLogbook size={16} /> Access Log
          </span>
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon"><IcoSearch size={14} /></span>
              <input
                type="text"
                placeholder="Search name, org, purpose…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>
                <IcoX size={12} /> Clear
              </button>
            )}
            {search && (
              <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {filtered.length} of {entries.length}
              </span>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="page-loader">
              <span className="loading-spinner" /> Loading entries…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><IcoLogbook size={48} /></div>
              <div className="empty-title">{search ? 'No matching entries' : 'No entries yet'}</div>
              <div className="empty-sub">
                {search
                  ? 'Try a different search term'
                  : isAdmin
                    ? 'Add the first entry using the New Entry button'
                    : 'No access entries have been logged yet'}
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <SortTh field="date"         label="Date" />
                  <SortTh field="time_in"      label="Time In" />
                  <th>Time Out</th>
                  <SortTh field="full_name"    label="Full Name" />
                  <SortTh field="organization" label="Organization" />
                  <SortTh field="purpose"      label="Purpose" />
                  <th>Authorized By</th>
                  <th>Access</th>
                  <th>Equipment</th>
                  <th>Escort</th>
                  <th>Signature</th>
                  <th>Remarks</th>
                  <th>Logged By</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id} className={!entry.time_out ? 'row-active' : ''}>
                    <td className="mono">{formatDate(entry.date)}</td>
                    <td className="mono">{formatTime(entry.time_in)}</td>
                    <td className="mono">
                      {entry.time_out
                        ? formatTime(entry.time_out)
                        : <span className="badge badge-active">Active</span>}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{entry.full_name}</td>
                    <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {entry.organization}
                    </td>
                    <td><span className="badge badge-completed">{entry.purpose}</span></td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{entry.authorized_by}</td>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{entry.access_method}</td>
                    <td style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {entry.equipment_handled || '—'}
                    </td>
                    <td>
                      <span className={`badge ${entry.escort_required ? 'badge-escort' : 'badge-no-escort'}`}>
                        {entry.escort_required ? 'Required' : 'None'}
                      </span>
                    </td>
                    <td>
                      {entry.signature
                        ? <img src={entry.signature} alt="sig" className="sig-preview"
                            onClick={() => setViewSig(entry)} title="Click to enlarge" />
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>}
                    </td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: '0.79rem' }}>
                      {entry.remarks || '—'}
                    </td>
                    <td>
                      {entry.submitted_by_name
                        ? <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                            <IcoUser size={11} /> {entry.submitted_by_name}
                          </span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(entry)} title="Edit">
                            <IcoEdit size={13} />
                          </button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => setConfirmDelete(entry)} title="Delete">
                            <IcoTrash size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className="table-footer">
            <span>{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}{search ? ` matching "${search}"` : ''}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              Active: {entries.filter(e => !e.time_out).length} · Total: {entries.length}
            </span>
          </div>
        )}
      </div>

      {/* Signature Viewer */}
      {viewSig && (
        <div className="modal-overlay" onClick={() => setViewSig(null)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <span className="modal-title"><IcoPenLine size={16} /> {viewSig.full_name}</span>
              <button className="modal-close" onClick={() => setViewSig(null)}><IcoX size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '14px', fontFamily: 'var(--font-mono)' }}>
                {viewSig.organization} · {formatDate(viewSig.date)} · {formatTime(viewSig.time_in)}
              </p>
              <img src={viewSig.signature} alt="Signature" className="sig-modal-img" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewSig(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title"><IcoTrash size={16} /> Confirm Delete</span>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}><IcoX size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Delete the entry for <strong>{confirmDelete.full_name}</strong> on {formatDate(confirmDelete.date)}?
              </p>
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '8px' }}>
                This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>
                <IcoTrash size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
