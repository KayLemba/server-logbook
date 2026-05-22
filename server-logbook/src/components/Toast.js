import React from 'react';
import { IcoCheck, IcoAlertCircle, IcoInfo, IcoX } from './Icons';

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          <span className="toast-icon">
            {t.type === 'success' && <IcoCheck size={15} />}
            {t.type === 'error'   && <IcoAlertCircle size={15} />}
            {t.type === 'info'    && <IcoInfo size={15} />}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', padding: '2px',
          }}>
            <IcoX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
