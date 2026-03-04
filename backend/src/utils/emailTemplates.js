const base = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .header { background: #1e3a5f; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 600; }
  .header p  { color: #a8c4e0; margin: 4px 0 0; font-size: 13px; }
  .body { padding: 28px 32px; color: #374151; font-size: 14px; line-height: 1.6; }
  .body h2 { color: #1e3a5f; margin: 0 0 16px; font-size: 16px; }
  .info-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
  .info-row:last-child { border: none; }
  .info-row .label { color: #6b7280; font-size: 13px; }
  .info-row .value { color: #111827; font-weight: 500; font-size: 13px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge-green  { background: #d1fae5; color: #065f46; }
  .badge-red    { background: #fee2e2; color: #991b1b; }
  .badge-amber  { background: #fef3c7; color: #92400e; }
  .badge-blue   { background: #dbeafe; color: #1e40af; }
  .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; text-align: center; }
</style></head>
<body>
<div class="wrap">
  <div class="header"><h1>ManageX</h1><p>Nepal Marathon — Internal Management</p></div>
  <div class="body"><h2>${title}</h2>${body}</div>
  <div class="footer">This is an automated notification from ManageX. Do not reply to this email.</div>
</div>
</body>
</html>`;

// ── Leave ─────────────────────────────────────────────────────────────────────

export const leaveRequested = ({ employeeName, type, startDate, endDate, days, reason }) => ({
  subject: `Leave Request: ${employeeName} — ${type} (${days} day${days > 1 ? 's' : ''})`,
  html: base('New Leave Request', `
    <p><strong>${employeeName}</strong> has submitted a leave request that requires your attention.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Employee</span><span class="value">${employeeName}</span></div>
      <div class="info-row"><span class="label">Type</span><span class="value"><span class="badge badge-blue">${type} Leave</span></span></div>
      <div class="info-row"><span class="label">From</span><span class="value">${startDate}</span></div>
      <div class="info-row"><span class="label">To</span><span class="value">${endDate}</span></div>
      <div class="info-row"><span class="label">Duration</span><span class="value">${days} day${days > 1 ? 's' : ''}</span></div>
      ${reason ? `<div class="info-row"><span class="label">Reason</span><span class="value">${reason}</span></div>` : ''}
    </div>
    <p>Please log in to ManageX to approve or reject this request.</p>
  `),
});

export const leaveApproved = ({ employeeName, type, startDate, endDate, days, approvedBy }) => ({
  subject: `Your ${type} Leave has been Approved`,
  html: base('Leave Approved', `
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your leave request has been <span class="badge badge-green">Approved</span>.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Leave Type</span><span class="value">${type} Leave</span></div>
      <div class="info-row"><span class="label">From</span><span class="value">${startDate}</span></div>
      <div class="info-row"><span class="label">To</span><span class="value">${endDate}</span></div>
      <div class="info-row"><span class="label">Duration</span><span class="value">${days} day${days > 1 ? 's' : ''}</span></div>
      <div class="info-row"><span class="label">Approved By</span><span class="value">${approvedBy}</span></div>
    </div>
  `),
});

export const leaveRejected = ({ employeeName, type, startDate, endDate, days, approvedBy, reason }) => ({
  subject: `Your ${type} Leave Request has been Rejected`,
  html: base('Leave Rejected', `
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your leave request has been <span class="badge badge-red">Rejected</span>.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Leave Type</span><span class="value">${type} Leave</span></div>
      <div class="info-row"><span class="label">From</span><span class="value">${startDate}</span></div>
      <div class="info-row"><span class="label">To</span><span class="value">${endDate}</span></div>
      <div class="info-row"><span class="label">Duration</span><span class="value">${days} day${days > 1 ? 's' : ''}</span></div>
      <div class="info-row"><span class="label">Reviewed By</span><span class="value">${approvedBy}</span></div>
      ${reason ? `<div class="info-row"><span class="label">Reason</span><span class="value">${reason}</span></div>` : ''}
    </div>
    <p>Please contact your manager if you have any questions.</p>
  `),
});

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectAdded = ({ memberName, projectName, description, createdBy }) => ({
  subject: `You've been added to project: ${projectName}`,
  html: base('New Project Assignment', `
    <p>Hi <strong>${memberName}</strong>,</p>
    <p>You have been added as a member to a new project.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Project</span><span class="value">${projectName}</span></div>
      ${description ? `<div class="info-row"><span class="label">Description</span><span class="value">${description}</span></div>` : ''}
      <div class="info-row"><span class="label">Created By</span><span class="value">${createdBy}</span></div>
    </div>
    <p>Log in to ManageX to view project details and tasks.</p>
  `),
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const taskAssigned = ({ assigneeName, taskTitle, projectName, priority, dueDate, assignedBy }) => ({
  subject: `Task Assigned: ${taskTitle}`,
  html: base('New Task Assigned', `
    <p>Hi <strong>${assigneeName}</strong>,</p>
    <p>A task has been assigned to you.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Task</span><span class="value">${taskTitle}</span></div>
      <div class="info-row"><span class="label">Project</span><span class="value">${projectName}</span></div>
      <div class="info-row"><span class="label">Priority</span>
        <span class="value">
          <span class="badge ${priority === 'Critical' ? 'badge-red' : priority === 'High' ? 'badge-amber' : 'badge-blue'}">${priority}</span>
        </span>
      </div>
      ${dueDate ? `<div class="info-row"><span class="label">Due Date</span><span class="value">${dueDate}</span></div>` : ''}
      <div class="info-row"><span class="label">Assigned By</span><span class="value">${assignedBy}</span></div>
    </div>
    <p>Log in to ManageX to view the task details.</p>
  `),
});

export const taskOverdue = ({ assigneeName, tasks }) => ({
  subject: `You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}`,
  html: base('Overdue Tasks', `
    <p>Hi <strong>${assigneeName}</strong>,</p>
    <p>You have <strong>${tasks.length}</strong> overdue task${tasks.length > 1 ? 's' : ''} that need your attention:</p>
    <div class="info-box">
      ${tasks.map((t) => `
        <div class="info-row">
          <span class="label">${t.project}</span>
          <span class="value">
            ${t.title}
            <span class="badge badge-red" style="margin-left:6px">Due ${t.dueDate}</span>
          </span>
        </div>
      `).join('')}
    </div>
    <p>Please log in to ManageX and update the status of these tasks.</p>
  `),
});
