import React, { useState } from 'react';
import SignaturePad from './SignaturePad';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { IcoPlus, IcoEdit, IcoX, IcoCheck, IcoUser } from './Icons';

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  time_in: new Date().toTimeString().slice(0, 5),
  time_out: '', full_name: '', organization: '',
  purpose: '', authorized_by: '', access_method: '',
  equipment_handled: '', remarks: '', escort_required: false, signature: null,
};

const ACCESS_METHODS = ['Keycard', 'Biometric', 'Manual Entry', 'PIN Code', 'Master Key'];
const PURPOSES = [
  'Routine Maintenance', 'Emergency Repair', 'Hardware Installation',
  'Cable Management', 'Inspection / Audit', 'Troubleshooting',
  'UPS Maintenance', 'Network Configuration', 'Security Assessment',
  'Backup & Recovery', 'Other',
];

export default function EntryForm({ onSuccess, addToast, editEntry, onCancelEdit }) {
  const { user, profile } = useAuth();
  const isEdit = !!editEntry;
  const [form, setForm]           = useState(isEdit ? editEntry : EMPTY_FORM);
  const [signatureSaved, setSigSaved] = useState(isEdit && !!editEntry?.signature);
  const [submitting, setSubmitting]   = useState(false);

  const set = f => e => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [f]: v }));
  };

  const validate = () => {
    const req = ['date', 'time_in', 'full_name', 'organization', 'purpose', 'authorized_by', 'access_method'];
    for (const f of req) {
      if (!form[f]) { addToast(`Required: ${f.replace(/_/g, ' ')}`, 'error'); return false; }
    }
    if (!form.signature) { addToast('Please capture a signature before submitting', 'error'); return false; }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      date: form.date, time_in: form.time_in,
      time_out: form.time_out || null,
      full_name: form.full_name.trim(),
      organization: form.organization.trim(),
      purpose: form.purpose,
      authorized_by: form.authorized_by.trim(),
      access_method: form.access_method,
      equipment_handled: form.equipment_handled.trim() || null,
      remarks: form.remarks.trim() || null,
      escort_required: form.escort_required,
      signature: form.signature,
      submitted_by_id: user?.id || null,
      submitted_by_name: profile?.full_name || null,
    };
    const { error } = isEdit
      ? await supabase.from('logbook_entries').update(payload).eq('id', editEntry.id)
      : await supabase.from('logbook_entries').insert([payload]);

    if (error) addToast(`Error: ${error.message}`, 'error');
    else {
      addToast(isEdit ? 'Entry updated' : 'Entry logged successfully', 'success');
      if (!isEdit) { setForm(EMPTY_FORM); setSigSaved(false); }
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <span className="card-title">
          {isEdit ? <><IcoEdit size={16} /> Edit Entry</> : <><IcoPlus size={16} /> New Access Entry</>}
        </span>
        {isEdit && (
          <button className="btn btn-ghost btn-sm" onClick={onCancelEdit}>
            <IcoX size={13} /> Cancel
          </button>
        )}
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Date <span className="required-star">*</span></label>
              <input type="date" value={form.date} onChange={set('date')} required />
            </div>
            <div className="form-group">
              <label>Time In <span className="required-star">*</span></label>
              <input type="time" value={form.time_in} onChange={set('time_in')} required />
            </div>
            <div className="form-group">
              <label>Time Out</label>
              <input type="time" value={form.time_out} onChange={set('time_out')} />
            </div>
            <div className="form-group">
              <label>Full Name <span className="required-star">*</span></label>
              <input type="text" value={form.full_name} onChange={set('full_name')} placeholder="e.g. John Banda" required />
            </div>
            <div className="form-group">
              <label>Organization / Department <span className="required-star">*</span></label>
              <input type="text" value={form.organization} onChange={set('organization')} placeholder="e.g. IT Department" required />
            </div>
            <div className="form-group">
              <label>Authorized By <span className="required-star">*</span></label>
              <input type="text" value={form.authorized_by} onChange={set('authorized_by')} placeholder="e.g. Jane Mwale" required />
            </div>
            <div className="form-group">
              <label>Purpose of Visit <span className="required-star">*</span></label>
              <select value={form.purpose} onChange={set('purpose')} required>
                <option value="">— Select Purpose —</option>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Access Method <span className="required-star">*</span></label>
              <select value={form.access_method} onChange={set('access_method')} required>
                <option value="">— Select Method —</option>
                {ACCESS_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Equipment Handled</label>
              <input type="text" value={form.equipment_handled} onChange={set('equipment_handled')} placeholder="e.g. Rack Server, UPS, Patch Panel" />
            </div>
            <div className="form-group full-width">
              <label>Remarks</label>
              <textarea value={form.remarks} onChange={set('remarks')} placeholder="Any unusual observations, incidents, or notes…" />
            </div>
            <div className="form-group">
              <label>Escort Required</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', fontWeight: 500, textTransform: 'none', letterSpacing: 'normal', fontSize: '0.875rem', padding: '8px 0' }}>
                <input type="checkbox" checked={form.escort_required} onChange={set('escort_required')} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
                Escort required for this visit
              </label>
            </div>
          </div>

          <div className="divider" />

          <div className="form-group">
            <label>
              Visitor Signature <span className="required-star">*</span>
              {signatureSaved && (
                <span style={{ marginLeft: '8px', color: 'var(--success)', fontSize: '0.72rem', textTransform: 'none', letterSpacing: 'normal', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                  <IcoCheck size={11} /> Captured
                </span>
              )}
            </label>
            <SignaturePad
              onSave={d => { setForm(p => ({ ...p, signature: d })); setSigSaved(true); addToast('Signature captured', 'success'); }}
              existingSignature={form.signature}
              onClear={() => { setForm(p => ({ ...p, signature: null })); setSigSaved(false); }}
            />
          </div>

          {/* Submitted-by notice */}
          <div style={{ marginTop: '14px', padding: '9px 13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <IcoUser size={13} />
            Entry will be stamped as submitted by <strong style={{ color: 'var(--text-secondary)' }}>{profile?.full_name}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            {isEdit && <button type="button" className="btn btn-secondary" onClick={onCancelEdit}><IcoX size={13} /> Cancel</button>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? <><span className="loading-spinner" /> Saving…</>
                : isEdit
                  ? <><IcoCheck size={14} /> Update Entry</>
                  : <><IcoCheck size={14} /> Submit Entry</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
