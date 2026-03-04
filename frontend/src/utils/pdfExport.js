import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtBSDate, fmtBSDateStr, fmtTime } from './nepaliDate.js';

const BRAND = [30, 58, 95];   // #1e3a5f
const LIGHT = [248, 250, 252]; // #f8fafc

const addHeader = (doc, title, subtitle) => {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ManageX — Nepal Marathon', 14, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  doc.text(`Generated: ${fmtBSDate(now)} ${hhmm}`, 14, 17);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 210 - 14, 10, { align: 'right' });
  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 210 - 14, 17, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);
  return 28; // y after header
};

const tableStyles = {
  headStyles:    { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 8 },
  bodyStyles:    { fontSize: 8, textColor: [30, 30, 30] },
  alternateRowStyles: { fillColor: LIGHT },
  margin:        { left: 14, right: 14 },
};

const fmtNPR = (n) => `Rs. ${(n ?? 0).toLocaleString('en-IN')}`;
const fmtD   = (d) => d ? fmtBSDate(d) : '—';

// ── Attendance PDF ─────────────────────────────────────────────────────────────

export const downloadAttendancePDF = ({ records, summary, userName, month }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'Attendance Report', `${userName} — ${month}`);

  // Summary stats
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y + 2);
  y += 6;

  const stats = [
    ['Days Present', summary?.daysPresent ?? 0],
    ['Days Late',    summary?.daysLate    ?? 0],
    ['Total Hours',  summary?.totalHours  ?? 0],
    ['Avg Hrs/Day',  summary?.avgHoursPerDay ?? 0],
  ];
  stats.forEach(([label, val], i) => {
    const x = 14 + i * 46;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, 44, 14, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, x + 4, y + 5);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(String(val), x + 4, y + 12);
  });
  y += 20;

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status']],
    body: records.map((r) => [
      fmtBSDateStr(r.date),
      fmtTime(r.clockIn),
      fmtTime(r.clockOut),
      r.totalHours ?? '—',
      r.locationType ?? '—',
      r.isLate ? 'Late' : 'On Time',
    ]),
    ...tableStyles,
  });

  doc.save(`attendance_${userName.replace(/\s+/g, '_')}_${month}.pdf`);
};

// ── Leave PDF ─────────────────────────────────────────────────────────────────

export const downloadLeavePDF = ({ leaves, quota, userName, year }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'Leave Report', `${userName} — ${year}`);

  // Quota
  if (quota) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Leave Quota', 14, y + 2);
    y += 6;

    [
      ['Sick Leave',   quota.sick.used,   quota.sick.total],
      ['Annual Leave', quota.annual.used, quota.annual.total],
    ].forEach(([label, used, total], i) => {
      const x = 14 + i * 90;
      doc.setFillColor(...LIGHT);
      doc.roundedRect(x, y, 86, 14, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(label, x + 4, y + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${used} / ${total} days used`, x + 4, y + 12);
    });
    y += 20;
  }

  autoTable(doc, {
    startY: y,
    head: [['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Reviewed By']],
    body: leaves.map((l) => [
      l.type,
      fmtD(l.startDate),
      fmtD(l.endDate),
      l.days,
      l.reason || '—',
      l.status,
      l.approvedBy?.name ?? '—',
    ]),
    ...tableStyles,
    columnStyles: {
      5: { fontStyle: 'bold' },
    },
  });

  doc.save(`leave_${userName.replace(/\s+/g, '_')}_${year}.pdf`);
};

// ── Expenses PDF ──────────────────────────────────────────────────────────────

export const downloadExpensesPDF = ({ expenses, month }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Expenses Report', month);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Title', 'Category', 'Project', 'Amount', 'Notes', 'Added By']],
    body: expenses.map((e) => [
      fmtD(e.date),
      e.title,
      e.category,
      e.project?.name ?? '—',
      fmtNPR(e.amount),
      e.notes || '—',
      e.createdBy?.name ?? '—',
    ]),
    foot: [['', '', '', 'Total', fmtNPR(total), '', '']],
    footStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    ...tableStyles,
  });

  doc.save(`expenses_${month}.pdf`);
};

// ── Bills PDF ─────────────────────────────────────────────────────────────────

export const downloadBillsPDF = ({ bills }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Bills Report', fmtBSDate(new Date()));

  const unpaid = bills.filter((b) => b.status === 'Unpaid').reduce((s, b) => s + b.amount, 0);

  autoTable(doc, {
    startY: 30,
    head: [['Vendor', 'Description', 'Project', 'Amount', 'Due Date', 'Status', 'Paid At']],
    body: bills.map((b) => [
      b.vendorName,
      b.description || '—',
      b.project?.name ?? '—',
      fmtNPR(b.amount),
      fmtD(b.dueDate),
      b.status,
      b.paidAt ? fmtD(b.paidAt) : '—',
    ]),
    foot: [['', '', 'Outstanding', fmtNPR(unpaid), '', '', '']],
    footStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
    ...tableStyles,
  });

  doc.save(`bills_${new Date().toISOString().slice(0, 7)}.pdf`);
};

// ── Deposits PDF ──────────────────────────────────────────────────────────────

export const downloadDepositsPDF = ({ deposits, month }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Project Deposits Report', month);

  const total = deposits.reduce((s, d) => s + d.amount, 0);

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Title', 'Project', 'Category', 'Amount', 'Description', 'Added By']],
    body: deposits.map((d) => [
      fmtD(d.date),
      d.title,
      d.project?.name ?? '—',
      d.category,
      fmtNPR(d.amount),
      d.description || '—',
      d.createdBy?.name ?? '—',
    ]),
    foot: [['', '', '', 'Total', fmtNPR(total), '', '']],
    footStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
    ...tableStyles,
  });

  doc.save(`deposits_${month}.pdf`);
};

// ── All-leave management PDF (manager/admin) ──────────────────────────────────

export const downloadAllLeavesPDF = ({ leaves, year }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Leave Management Report', String(year));

  autoTable(doc, {
    startY: 30,
    head: [['Employee', 'Role', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Reviewed By']],
    body: leaves.map((l) => [
      l.user?.name ?? '—',
      l.user?.role ?? '—',
      l.type,
      fmtD(l.startDate),
      fmtD(l.endDate),
      l.days,
      l.reason || '—',
      l.status,
      l.approvedBy?.name ?? '—',
    ]),
    ...tableStyles,
    columnStyles: { 7: { fontStyle: 'bold' } },
  });

  doc.save(`leave_management_${year}.pdf`);
};
