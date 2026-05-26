import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── CSV Export ─────────────────────────────────────────────────
export function exportToCSV(entries, filename = 'server_logbook.csv') {
  const headers = [
    'Date', 'Time In', 'Time Out', 'Full Name', 'Organization/Department',
    'Purpose of Visit', 'Authorized By', 'Access Method', 'Equipment Handled',
    'Remarks', 'Escort Required', 'Has Signature', 'Created At'
  ];
  const rows = entries.map(e => [
    e.date, e.time_in, e.time_out || '', e.full_name, e.organization,
    e.purpose, e.authorized_by, e.access_method,
    e.equipment_handled || '', e.remarks || '',
    e.escort_required ? 'Yes' : 'No',
    e.signature ? 'Yes' : 'No',
    new Date(e.created_at).toLocaleString(),
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Format helpers ─────────────────────────────────────────────
export function formatTime(timeStr) {
  if (!timeStr) return '-';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── Date filter ────────────────────────────────────────────────
export function filterByDateRange(entries, from, to) {
  if (!from && !to) return entries;
  return entries.filter(e => {
    if (from && e.date < from) return false;
    if (to   && e.date > to)   return false;
    return true;
  });
}

// ── Load image from src ────────────────────────────────────────
function loadImage(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new window.Image();
    img.onload  = () => resolve(img);
    img.onerror = () => { console.warn('Logo load failed:', src?.slice(0,60)); resolve(null); };
    img.src = src;
  });
}

// ── Convert image to PNG data URL preserving transparency ─────
// Use white background only for signature images (dark ink on white)
// Use transparent-safe PNG for logo (keeps original colours)
function toPng(img, whiteBg = false) {
  try {
    const c   = document.createElement('canvas');
    c.width   = img.naturalWidth  || img.width  || 300;
    c.height  = img.naturalHeight || img.height || 100;
    const ctx = c.getContext('2d');
    if (whiteBg) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  } catch (e) {
    console.warn('toPng failed:', e);
    return null;
  }
}

// ── PDF Export ─────────────────────────────────────────────────
export async function exportToPDF(entries, dateRange = null, logoSrc = null) {
  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const NAVY       = [13,  27,  60];
  const BLUE       = [15,  76, 158];
  const SILVER     = [148, 163, 184];
  const WHITE      = [255, 255, 255];
  const LIGHT_BG   = [248, 249, 251];
  const BORDER_COL = [220, 225, 234];

  // Load & convert logo — keep as PNG to preserve transparency
  let logoPng = null;
  if (logoSrc) {
    const img = await loadImage(logoSrc);
    if (img) {
      // Render logo on a white background so it shows on dark header
      const c   = document.createElement('canvas');
      c.width   = img.naturalWidth  || img.width  || 300;
      c.height  = img.naturalHeight || img.height || 100;
      const ctx = c.getContext('2d');
      // Dark navy background matching the PDF header
      ctx.fillStyle = '#0d1b3c';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      logoPng = c.toDataURL('image/png');
    }
  }

  // ── Page header ───────────────────────────────────────────────
  const drawHeader = (title) => {
    // Navy background
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 26, 'F');
    // Blue accent bar
    doc.setFillColor(...BLUE);
    doc.rect(0, 24, pageW, 2, 'F');

    // Logo top-left
    if (logoPng) {
      try {
        doc.addImage(logoPng, 'PNG', 8, 3, 32, 16);
      } catch (e) {
        console.warn('addImage logo failed:', e);
      }
    }

    const textX = logoPng ? 46 : 14;
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SERVER ROOM ACCESS LOGBOOK', textX, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SILVER);
    doc.text('Exponent Bizolution · Access Control & Audit System', textX, 17);

    const meta = dateRange
      ? `Period: ${dateRange.from}  to  ${dateRange.to}`
      : `Generated: ${new Date().toLocaleString()}`;
    doc.text(meta,                               pageW - 10, 11, { align: 'right' });
    doc.text(`${title}  ·  ${entries.length} records`, pageW - 10, 17, { align: 'right' });
  };

  // ── Page footer ───────────────────────────────────────────────
  const drawFooters = (startPg, endPg) => {
    const total = doc.internal.getNumberOfPages();
    for (let i = startPg; i <= endPg; i++) {
      doc.setPage(i);
      doc.setFillColor(...LIGHT_BG);
      doc.rect(0, pageH - 9, pageW, 9, 'F');
      doc.setDrawColor(...BORDER_COL);
      doc.setLineWidth(0.3);
      doc.line(0, pageH - 9, pageW, pageH - 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 130, 148);
      doc.text('CONFIDENTIAL  ·  SERVER ROOM ACCESS LOG  ·  EXPONENT BIZOLUTION', 10, pageH - 3.5);
      doc.text(`Page ${i} of ${total}`, pageW - 10, pageH - 3.5, { align: 'right' });
    }
  };

  // ── Access log table ──────────────────────────────────────────
  drawHeader('Access Log');

  autoTable(doc, {
    startY: 30,
    columns: [
      { header: '#',             dataKey: 'idx'              },
      { header: 'Date',          dataKey: 'date'             },
      { header: 'Time In',       dataKey: 'time_in'          },
      { header: 'Time Out',      dataKey: 'time_out'         },
      { header: 'Full Name',     dataKey: 'full_name'        },
      { header: 'Organization',  dataKey: 'organization'     },
      { header: 'Purpose',       dataKey: 'purpose'          },
      { header: 'Authorized By', dataKey: 'authorized_by'    },
      { header: 'Access Method', dataKey: 'access_method'    },
      { header: 'Equipment',     dataKey: 'equipment_handled'},
      { header: 'Escort',        dataKey: 'escort_required'  },
      { header: 'Signed',        dataKey: 'has_sig'          },
      { header: 'Remarks',       dataKey: 'remarks'          },
    ],
    body: entries.map((e, i) => ({
      idx:               String(i + 1),
      date:              e.date              || '',
      time_in:           e.time_in           || '',
      time_out:          e.time_out          || '-',
      full_name:         e.full_name         || '',
      organization:      e.organization      || '',
      purpose:           e.purpose           || '',
      authorized_by:     e.authorized_by     || '',
      access_method:     e.access_method     || '',
      equipment_handled: e.equipment_handled || '-',
      escort_required:   e.escort_required   ? 'Yes' : 'No',
      has_sig:           e.signature         ? 'Yes' : 'No',
      remarks:           e.remarks           || '-',
    })),
    styles: {
      font: 'helvetica', fontSize: 7.5, cellPadding: 3,
      valign: 'middle', textColor: [30, 30, 40],
      lineColor: BORDER_COL, lineWidth: 0.25, overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: BLUE, textColor: WHITE,
      fontStyle: 'bold', fontSize: 7.5, halign: 'left',
    },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      idx:          { cellWidth: 8,  halign: 'center' },
      date:         { cellWidth: 22 },
      time_in:      { cellWidth: 16 },
      time_out:     { cellWidth: 16 },
      full_name:    { cellWidth: 30, fontStyle: 'bold' },
      organization: { cellWidth: 28 },
      purpose:      { cellWidth: 26 },
      has_sig:      { cellWidth: 13, halign: 'center' },
      remarks:      { cellWidth: 26 },
    },
    margin: { top: 30, left: 10, right: 10 },
  });

  drawFooters(1, doc.internal.getNumberOfPages());

  // ── Signatures annex ──────────────────────────────────────────
  const withSigs = entries.filter(e => e.signature);
  if (withSigs.length > 0) {
    const loaded = await Promise.all(withSigs.map(e => loadImage(e.signature)));

    doc.addPage();
    const sigStart = doc.internal.getNumberOfPages();

    // Annex header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(0, 18, pageW, 2, 'F');

    if (logoPng) {
      try { doc.addImage(logoPng, 'PNG', 8, 2, 22, 11); } catch (e) {}
    }

    const sigTitleX = logoPng ? 36 : 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('SIGNATURES ANNEX', sigTitleX, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SILVER);
    doc.text('Visitor signatures captured at time of entry', sigTitleX, 16);
    doc.text(`${withSigs.length} signatures`, pageW - 10, 10, { align: 'right' });

    // Cards grid
    const cols      = 4;
    const cardW     = (pageW - 24) / cols;
    const cardH     = 42;
    const startY    = 26;
    const gap       = 4;
    const rowsPerPg = Math.floor((pageH - startY - 12) / (cardH + gap));

    withSigs.forEach((entry, idx) => {
      const col     = idx % cols;
      const row     = Math.floor(idx / cols);
      const pageRow = row % rowsPerPg;

      if (pageRow === 0 && idx !== 0 && col === 0) {
        doc.addPage();
        doc.setFillColor(...BLUE);
        doc.rect(0, 0, pageW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...WHITE);
        doc.text('SIGNATURES ANNEX (continued)  ·  Exponent Bizolution', 10, 5);
      }

      const x = 10 + col * (cardW + gap);
      const y = startY + pageRow * (cardH + gap);

      // Card shell
      doc.setFillColor(...LIGHT_BG);
      doc.setDrawColor(...BORDER_COL);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

      // Blue top bar
      doc.setFillColor(...BLUE);
      doc.roundedRect(x, y, cardW, 5, 2, 2, 'F');
      doc.rect(x, y + 3, cardW, 2, 'F');

      // Entry # and name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(...WHITE);
      doc.text(`#${entries.indexOf(entry) + 1}`, x + 3, y + 3.8);
      const name = entry.full_name.length > 24
        ? entry.full_name.slice(0, 22) + '...' : entry.full_name;
      doc.text(name, x + 12, y + 3.8);

      // Org & date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(80, 95, 115);
      const org = entry.organization.length > 28
        ? entry.organization.slice(0, 26) + '...' : entry.organization;
      doc.text(org, x + 2, y + 10);
      doc.text(`${entry.date}  ·  ${entry.time_in}`, x + 2, y + 14.5);

      // Separator
      doc.setDrawColor(...BORDER_COL);
      doc.setLineWidth(0.2);
      doc.line(x + 2, y + 17, x + cardW - 2, y + 17);

      // Signature image box
      const imgX = x + 2, imgY = y + 19, imgW = cardW - 4, imgH = cardH - 21;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(210, 220, 230);
      doc.rect(imgX, imgY, imgW, imgH, 'FD');

      const img = loaded[idx];
      if (img) {
        try {
          const sigPng = toPng(img, true); // white bg for signature ink
          if (sigPng) doc.addImage(sigPng, 'PNG', imgX + 1, imgY + 1, imgW - 2, imgH - 2);
        } catch {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(5.5);
          doc.setTextColor(160, 160, 170);
          doc.text('[signature on file]', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
        }
      }
    });

    drawFooters(sigStart, doc.internal.getNumberOfPages());
  }

  doc.save(`server_logbook_${new Date().toISOString().split('T')[0]}.pdf`);
}