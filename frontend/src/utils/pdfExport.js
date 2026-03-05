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

// ── Team Attendance PDF (manager/admin) ───────────────────────────────────────

export const downloadTeamAttendancePDF = ({ records, monthLabel }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Team Attendance Report', monthLabel);

  // Per-user summary section
  const userMap = {};
  for (const r of records) {
    const uid = String(r.user?._id ?? r.user?.name ?? 'unknown');
    if (!userMap[uid]) {
      userMap[uid] = { name: r.user?.name ?? '—', role: r.user?.role ?? '—', recs: [] };
    }
    userMap[uid].recs.push(r);
  }

  const summaryRows = Object.values(userMap).map(({ name, role, recs }) => {
    const late  = recs.filter((r) => r.isLate).length;
    const hours = recs.reduce((s, r) => s + (r.totalHours ?? 0), 0);
    return [name, role, recs.length, late, hours.toFixed(1)];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Employee', 'Role', 'Days Present', 'Days Late', 'Total Hours']],
    body: summaryRows,
    ...tableStyles,
  });

  const afterSummary = doc.lastAutoTable.finalY + 6;

  // Detail records
  autoTable(doc, {
    startY: afterSummary,
    head: [['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status']],
    body: records.map((r) => [
      r.user?.name ?? '—',
      fmtBSDateStr(r.date),
      fmtTime(r.clockIn),
      fmtTime(r.clockOut),
      r.totalHours != null ? r.totalHours : '—',
      r.locationType ?? '—',
      r.isLate ? 'Late' : 'On Time',
    ]),
    ...tableStyles,
  });

  doc.save(`team_attendance_${monthLabel.replace(/\s+/g, '_')}.pdf`);
};

export const downloadUserAttendanceFromTeam = ({ records, userName, monthLabel }) => {
  const userRecords = records.filter((r) => (r.user?.name ?? '') === userName);
  const daysPresent = userRecords.length;
  const daysLate    = userRecords.filter((r) => r.isLate).length;
  const totalHours  = parseFloat(userRecords.reduce((s, r) => s + (r.totalHours ?? 0), 0).toFixed(2));
  const summary     = {
    daysPresent,
    daysLate,
    totalHours,
    avgHoursPerDay: daysPresent ? parseFloat((totalHours / daysPresent).toFixed(2)) : 0,
  };
  downloadAttendancePDF({ records: userRecords, summary, userName, month: monthLabel });
};

// ── User Overall Report PDF ───────────────────────────────────────────────────

export const downloadUserReportPDF = ({ report, periodLabel }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { user, attendance, leaves, payroll, tasks } = report;

  let y = addHeader(doc, 'Employee Report', `${user.name} — ${periodLabel}`);

  // ── User info ──────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Role: ${user.role}   |   Email: ${user.email}   |   Salary: ${fmtNPR(user.monthlySalary)}`, 14, y + 4);
  y += 10;

  // ── Summary stat boxes ─────────────────────────────────────────────────────
  const stats = [
    ['Days Present',  attendance.summary.daysPresent],
    ['Days Late',     attendance.summary.daysLate],
    ['Total Hours',   attendance.summary.totalHours],
    ['Tasks Done',    `${tasks.done} / ${tasks.total}`],
    ['Leaves Taken',  leaves.records.filter((l) => l.status === 'Approved').reduce((s, l) => s + l.days, 0)],
    ['Salary Paid',   fmtNPR(payroll.totalPaid)],
  ];

  const boxW = (210 - 28 - 10) / 3;
  stats.forEach(([label, val], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * (boxW + 5);
    const yy = y + row * 18;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, yy, boxW, 14, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, x + 3, yy + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(String(val), x + 3, yy + 12);
  });
  y += 40;

  // ── Attendance ─────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Attendance', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Clock In', 'Clock Out', 'Hours', 'Location', 'Status']],
    body: attendance.records.map((r) => [
      fmtBSDateStr(r.date),
      fmtTime(r.clockIn),
      fmtTime(r.clockOut),
      r.totalHours ?? '—',
      r.locationType ?? '—',
      r.isLate ? 'Late' : 'On Time',
    ]),
    ...tableStyles,
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Leaves ─────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Leaves', 14, y);
  y += 3;

  if (leaves.records.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No leave records for this period.', 14, y + 5);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Type', 'From', 'To', 'Days', 'Status', 'Reason']],
      body: leaves.records.map((l) => [
        l.type,
        fmtD(l.startDate),
        fmtD(l.endDate),
        l.days,
        l.status,
        l.reason || '—',
      ]),
      ...tableStyles,
      columnStyles: { 4: { fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Payroll ────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Payroll', 14, y);
  y += 3;

  if (payroll.records.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No payroll records for this period.', 14, y + 5);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Month', 'Base Salary', 'Emp SSF', 'Emr SSF', 'Net Pay', 'Status', 'Paid On']],
      body: payroll.records.map((r) => [
        r.month,
        fmtNPR(r.baseSalary),
        fmtNPR(r.employeeSSF),
        fmtNPR(r.employerSSF),
        fmtNPR(r.finalPayableSalary),
        r.status,
        r.paidAt ? fmtD(r.paidAt) : '—',
      ]),
      foot: [['', '', '', 'Total Paid', fmtNPR(payroll.totalPaid), '', '']],
      footStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
      ...tableStyles,
      columnStyles: { 5: { fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  // Add new page if needed
  if (y > 230) { doc.addPage(); y = 20; }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Tasks (all time — ${tasks.total} total)`, 14, y);
  y += 3;

  if (tasks.list.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No tasks assigned.', 14, y + 5);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Task', 'Project', 'Priority', 'Status', 'Due']],
      body: tasks.list.map((t) => [
        t.title,
        t.project,
        t.priority,
        t.status,
        t.dueDate ? fmtD(t.dueDate) : '—',
      ]),
      ...tableStyles,
      columnStyles: { 3: { fontStyle: 'bold' } },
    });
  }

  doc.save(`report_${user.name.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.pdf`);
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
