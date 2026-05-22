import React, { useMemo } from 'react';
import { IcoLogbook, IcoCalendar, IcoActivity, IcoShield, IcoBarChart } from './Icons';

export default function StatsBar({ entries }) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const purposeCounts = {};
    entries.forEach(e => {
      if (e.purpose) purposeCounts[e.purpose] = (purposeCounts[e.purpose] || 0) + 1;
    });
    const topPurpose = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      total:      entries.length,
      today:      entries.filter(e => e.date === today).length,
      active:     entries.filter(e => !e.time_out).length,
      withEscort: entries.filter(e => e.escort_required).length,
      topPurpose: topPurpose ? topPurpose[0] : 'N/A',
    };
  }, [entries]);

  const cards = [
    { label: 'Total Entries',      value: stats.total,      icon: <IcoLogbook size={20} />,   cls: '' },
    { label: "Today's Visits",     value: stats.today,      icon: <IcoCalendar size={20} />,  cls: 'stat-success' },
    { label: 'Currently Inside',   value: stats.active,     icon: <IcoActivity size={20} />,  cls: 'stat-danger' },
    { label: 'Escort Required',    value: stats.withEscort, icon: <IcoShield size={20} />,    cls: 'stat-warning' },
    { label: 'Top Purpose',        value: stats.topPurpose, icon: <IcoBarChart size={20} />,  cls: '', small: true },
  ];

  return (
    <div className="stats-grid">
      {cards.map(c => (
        <div key={c.label} className={`stat-card ${c.cls}`}>
          <div className="stat-icon">{c.icon}</div>
          <div className="stat-info">
            <div className="stat-value" style={c.small ? { fontSize: '0.95rem', lineHeight: 1.3 } : {}}>
              {c.value}
            </div>
            <div className="stat-label">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
