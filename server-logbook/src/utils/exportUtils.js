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
    e.date,
    e.time_in,
    e.time_out || '',
    e.full_name,
    e.organization,
    e.purpose,
    e.authorized_by,
    e.access_method,
    e.equipment_handled || '',
    e.remarks || '',
    e.escort_required ? 'Yes' : 'No',
    e.signature ? 'Yes' : 'No',
    new Date(e.created_at).toLocaleString(),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Format helpers ─────────────────────────────────────────────
export function formatTime(timeStr) {
  if (!timeStr) return '-';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── Date filter helper ─────────────────────────────────────────
export function filterByDateRange(entries, from, to) {
  if (!from && !to) return entries;
  return entries.filter(e => {
    const d = e.date;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

// ── Helper: safely load a Base64 image ────────────────────────
function loadImage(dataURL) {
  return new Promise((resolve) => {
    if (!dataURL) return resolve(null);
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

// ── PDF Export ─────────────────────────────────────────────────
export async function exportToPDF(entries, dateRange = null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawHeader = (label) => {
    doc.setFillColor(13, 17, 23);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SERVER ROOM ACCESS LOGBOOK', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const generatedOn = `Generated: ${new Date().toLocaleString()}`;
    const rangeLabel = dateRange
      ? `  |  Period: ${dateRange.from} to ${dateRange.to}`
      : '  |  All Entries';
    doc.text(generatedOn + rangeLabel, 14, 20);
    doc.text(`${label} - ${entries.length} records`, pageWidth - 14, 20, { align: 'right' });
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.line(0, 28, pageWidth, 28);
  };

  const drawFooters = (startPage, endPage) => {
    const total = doc.internal.getNumberOfPages();
    for (let i = startPage; i <= endPage; i++) {
      doc.setPage(i);
      doc.setFillColor(248, 249, 251);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      doc.setDrawColor(220, 225, 234);
      doc.setLineWidth(0.3);
      doc.line(0, pageHeight - 10, pageWidth, pageHeight - 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(138, 148, 166);
      doc.text('CONFIDENTIAL - SERVER ROOM ACCESS LOG', 14, pageHeight - 4);
      doc.text(`Page ${i} of ${total}`, pageWidth - 14, pageHeight - 4, { align: 'right' });
    }
  };

  // ── Access Log Table ──────────────────────────────────────────
  drawHeader('Access Log');

  const columns = [
    { header: '#',             dataKey: 'idx' },
    { header: 'Date',          dataKey: 'date' },
    { header: 'Time In',       dataKey: 'time_in' },
    { header: 'Time Out',      dataKey: 'time_out' },
    { header: 'Full Name',     dataKey: 'full_name' },
    { header: 'Organization',  dataKey: 'organization' },
    { header: 'Purpose',       dataKey: 'purpose' },
    { header: 'Authorized By', dataKey: 'authorized_by' },
    { header: 'Access Method', dataKey: 'access_method' },
    { header: 'Equipment',     dataKey: 'equipment_handled' },
    { header: 'Escort',        dataKey: 'escort_required' },
    { header: 'Signed',        dataKey: 'has_sig' },
    { header: 'Remarks',       dataKey: 'remarks' },
  ];

  const tableRows = entries.map((e, i) => ({
    idx:               String(i + 1),
    date:              e.date || '',
    time_in:           e.time_in || '',
    time_out:          e.time_out || '-',
    full_name:         e.full_name || '',
    organization:      e.organization || '',
    purpose:           e.purpose || '',
    authorized_by:     e.authorized_by || '',
    access_method:     e.access_method || '',
    equipment_handled: e.equipment_handled || '-',
    escort_required:   e.escort_required ? 'Yes' : 'No',
    has_sig:           e.signature ? 'Yes' : 'No',
    remarks:           e.remarks || '-',
  }));

  // Use autoTable as a standalone function (not doc.autoTable)
  autoTable(doc, {
    startY: 32,
    columns,
    body: tableRows,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3,
      valign: 'middle',
      textColor: [30, 30, 40],
      lineColor: [220, 225, 234],
      lineWidth: 0.3,
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: [26, 86, 219],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      idx:          { cellWidth: 8,  halign: 'center' },
      date:         { cellWidth: 22 },
      time_in:      { cellWidth: 16 },
      time_out:     { cellWidth: 16 },
      full_name:    { cellWidth: 32, fontStyle: 'bold' },
      organization: { cellWidth: 30 },
      purpose:      { cellWidth: 28 },
      has_sig:      { cellWidth: 14, halign: 'center' },
      remarks:      { cellWidth: 28 },
    },
    margin: { top: 32, left: 10, right: 10 },
  });

  const afterTablePage = doc.internal.getNumberOfPages();
  drawFooters(1, afterTablePage);

  // ── Signatures Annex ─────────────────────────────────────────
  const withSigs = entries.filter(e => e.signature);

  if (withSigs.length > 0) {
    const loaded = await Promise.all(withSigs.map(e => loadImage(e.signature)));

    doc.addPage();
    const sigPageStart = doc.internal.getNumberOfPages();

    // Annex header
    doc.setFillColor(13, 17, 23);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('SIGNATURES ANNEX', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${withSigs.length} signatures captured`, pageWidth - 14, 13, { align: 'right' });
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(0, 20, pageWidth, 20);

    const cols = 4;
    const cardW = (pageWidth - 24) / cols;
    const cardH = 40;
    const startY = 26;
    const gap = 4;
    const rowsPerPage = Math.floor((pageHeight - startY - 14) / (cardH + gap));

    withSigs.forEach((entry, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const pageRow = row % rowsPerPage;

      if (pageRow === 0 && idx !== 0 && col === 0) {
        doc.addPage();
        doc.setFillColor(26, 86, 219);
        doc.rect(0, 0, pageWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text('SIGNATURES ANNEX (continued)', 14, 5.5);
      }

      const x = 10 + col * (cardW + gap);
      const y = startY + pageRow * (cardH + gap);

      // Card
      doc.setFillColor(248, 249, 251);
      doc.setDrawColor(220, 225, 234);
      doc.setLineWidth(0.3);
      doc.rect(x, y, cardW, cardH, 'FD');

      // Badge
      doc.setFillColor(26, 86, 219);
      doc.rect(x + 2, y + 2, 8, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`#${entries.indexOf(entry) + 1}`, x + 3, y + 5.5);

      // Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 40);
      const nameText = entry.full_name.length > 22
        ? entry.full_name.slice(0, 20) + '...'
        : entry.full_name;
      doc.text(nameText, x + 12, y + 5.5);

      // Org & date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 120);
      const orgText = entry.organization.length > 26
        ? entry.organization.slice(0, 24) + '...'
        : entry.organization;
      doc.text(orgText, x + 2, y + 11);
      doc.text(`${entry.date}  -  ${entry.time_in}`, x + 2, y + 15);

      // Signature box
      const imgX = x + 2;
      const imgY = y + 18;
      const imgW = cardW - 4;
      const imgH = cardH - 20;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 210, 220);
      doc.rect(imgX, imgY, imgW, imgH, 'FD');

      const img = loaded[idx];
      if (img) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const jpeg = canvas.toDataURL('image/jpeg', 0.9);
          doc.addImage(jpeg, 'JPEG', imgX + 1, imgY + 1, imgW - 2, imgH - 2);
        } catch (imgErr) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(160, 160, 160);
          doc.text('[signature on file]', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6);
        doc.setTextColor(160, 160, 160);
        doc.text('[no signature]', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
      }
    });

    const sigPageEnd = doc.internal.getNumberOfPages();
    drawFooters(sigPageStart, sigPageEnd);
  }

  const dateTag = new Date().toISOString().split('T')[0];
  doc.save(`server_logbook_${dateTag}.pdf`);
}
