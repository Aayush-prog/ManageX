# ManageX — Internal Management System

Nepal Marathon internal system built with React + Node.js + MongoDB.

---

## Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18, Vite 5, TailwindCSS 3, React Router 6 |
| Backend   | Node.js (ES modules), Express 4               |
| Database  | MongoDB 7 + Mongoose 8                        |
| Auth      | JWT (access 15m + refresh 7d, httpOnly cookie)|
| DnD       | @hello-pangea/dnd                             |
| Deploy    | PM2 + Nginx (Ubuntu VPS)                      |

---

## Project Structure

```
management/
├── backend/
│   ├── server.js                    # Entry point
│   ├── package.json
│   └── src/
│       ├── app.js                   # Express app (Helmet, CORS, Morgan)
│       ├── config/
│       │   ├── db.js                # Mongoose connect
│       │   └── env.js               # Typed env vars with warnings
│       ├── middleware/
│       │   ├── auth.js              # authenticate + allowRoles
│       │   └── errorHandler.js      # Global error handler
│       ├── models/
│       │   ├── User.js
│       │   ├── Attendance.js
│       │   ├── Payroll.js
│       │   ├── SSFAccount.js
│       │   ├── Project.js
│       │   ├── Task.js
│       │   ├── Expense.js
│       │   ├── Bill.js
│       │   └── ProjectBudget.js
│       ├── services/
│       │   ├── auth.service.js
│       │   ├── attendance.service.js
│       │   ├── payroll.service.js
│       │   ├── project.service.js
│       │   └── accounting.service.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── attendance.controller.js
│       │   ├── payroll.controller.js
│       │   ├── project.controller.js
│       │   └── accounting.controller.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── auth.routes.js
│       │   ├── attendance.routes.js
│       │   ├── payroll.routes.js
│       │   ├── user.routes.js
│       │   ├── project.routes.js
│       │   ├── task.routes.js
│       │   └── accounting.routes.js
│       ├── jobs/
│       │   └── autoClockOut.js      # Polls every 5min, fires at 5PM ±15min
│       └── utils/
│           └── time.js              # Nepal TZ helpers (UTC+5:45)
│
└── frontend/
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── services/
        │   └── api.js               # Axios + silent refresh interceptor
        ├── store/
        │   └── AuthContext.jsx      # Global auth state
        ├── routes/
        │   ├── AppRouter.jsx
        │   └── ProtectedRoute.jsx
        ├── components/
        │   ├── layout/
        │   │   ├── DashboardLayout.jsx
        │   │   ├── Sidebar.jsx
        │   │   └── Header.jsx
        │   ├── attendance/
        │   │   ├── ClockStatus.jsx
        │   │   └── MonthlySummary.jsx
        │   ├── payroll/
        │   │   └── SalaryWidget.jsx
        │   └── projects/
        │       ├── TaskCard.jsx
        │       ├── CreateProjectModal.jsx
        │       ├── CreateTaskModal.jsx
        │       └── TaskDetailModal.jsx
        └── pages/
            ├── auth/Login.jsx
            ├── dashboards/
            │   ├── CeoDashboard.jsx
            │   ├── FinanceDashboard.jsx
            │   ├── ManagerDashboard.jsx
            │   ├── ITDashboard.jsx
            │   ├── VideographerDashboard.jsx
            │   └── PhotographerDashboard.jsx
            ├── attendance/AttendancePage.jsx
            ├── payroll/MyPayrollPage.jsx
            ├── finance/
            │   ├── PayrollPage.jsx
            │   └── AccountingPage.jsx
            └── projects/
                ├── ProjectsPage.jsx
                ├── KanbanPage.jsx
                └── MyTasksPage.jsx
```

---

## Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/managex

# JWT
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_strong_refresh_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Attendance (Nepal TZ)
OFFICE_IP=192.168.1.100          # comma-separated for multiple IPs
TIMEZONE=Asia/Kathmandu
LATE_HOUR=12                     # late if clock-in after 12:00 PM
CLOCKOUT_HOUR=17                 # auto clock-out at 17:00
CLOCKOUT_MINUTE=0
CLOCKOUT_GRACE_MINUTES=15        # ±15 min window
```

---

## Running Locally

```bash
# Backend
cd backend
npm install
npm run dev          # nodemon server.js on port 5000

# Frontend
cd frontend
npm install
npm run dev          # Vite dev server on port 5173
```

---

## API Reference

All routes are prefixed with `/api`.

### Auth
| Method | Route              | Access  | Description              |
|--------|--------------------|---------|--------------------------|
| POST   | /auth/login        | Public  | Login, auto clock-in     |
| POST   | /auth/refresh      | Public  | Rotate token pair        |
| POST   | /auth/logout       | Auth    | Auto clock-out, clear RT |

### Attendance
| Method | Route              | Access          | Description           |
|--------|--------------------|-----------------|----------------------|
| GET    | /attendance/me/today | Auth          | Today's clock status |
| GET    | /attendance/me     | Auth            | My monthly summary   |
| GET    | /attendance/team   | manager, ceo    | Team attendance      |
| GET    | /attendance/all    | ceo             | All staff attendance |

### Payroll
| Method | Route                    | Access        | Description              |
|--------|--------------------------|---------------|--------------------------|
| GET    | /payroll/my-payroll      | Auth          | My payroll history       |
| GET    | /payroll/my-ssf          | Auth          | My SSF account           |
| GET    | /payroll/month/:month    | finance, ceo  | Monthly payroll list     |
| POST   | /payroll/generate/:month | finance, ceo  | Generate payroll records |
| PATCH  | /payroll/mark-paid/:id   | finance, ceo  | Mark payroll as paid     |

### Users
| Method | Route                      | Access       | Description       |
|--------|----------------------------|--------------|-------------------|
| GET    | /users                     | finance, ceo | List active users |
| PATCH  | /users/update-salary/:id   | finance, ceo | Update salary     |
| PATCH  | /users/update-ssf/:id      | finance, ceo | Update SSF %      |

### Projects & Tasks
| Method | Route                      | Access       | Description              |
|--------|----------------------------|--------------|--------------------------|
| GET    | /projects                  | Auth         | List projects (filtered) |
| POST   | /projects                  | manager, ceo | Create project           |
| GET    | /projects/:id              | Auth         | Kanban board data        |
| PATCH  | /projects/:id              | manager, ceo | Update project           |
| POST   | /projects/:id/tasks        | manager, ceo | Create task              |
| GET    | /tasks/my-tasks            | Auth         | My assigned tasks        |
| PATCH  | /tasks/:id                 | Auth         | Update task status       |
| POST   | /tasks/:id/comments        | Auth         | Add comment              |

### Accounting
| Method | Route                         | Access       | Description           |
|--------|-------------------------------|--------------|----------------------|
| GET    | /accounting/expenses          | finance, ceo | List expenses        |
| POST   | /accounting/expenses          | finance, ceo | Add expense          |
| PATCH  | /accounting/expenses/:id/status | finance, ceo | Approve/Reject     |
| GET    | /accounting/bills             | finance, ceo | List bills           |
| POST   | /accounting/bills             | finance, ceo | Add bill             |
| PATCH  | /accounting/bills/:id/paid    | finance, ceo | Mark bill paid       |
| GET    | /accounting/budgets           | finance, ceo | List project budgets |
| POST   | /accounting/budgets           | finance, ceo | Set project budget   |
| GET    | /accounting/summary           | finance, ceo | Monthly financial summary |

---

## Roles & Access

| Role         | Dashboard | Attendance | Payroll | Payroll Mgmt | Accounting | Projects | Tasks |
|--------------|-----------|------------|---------|--------------|------------|----------|-------|
| ceo          | ✓         | ✓ (all)    | ✓       | ✓            | ✓          | ✓ (all)  | ✓     |
| manager      | ✓         | ✓ (team)   | ✓       | ✗            | ✗          | ✓ (create)| ✓    |
| finance      | ✓         | ✓          | ✓       | ✓            | ✓          | ✓        | ✓     |
| it           | ✓         | ✓          | ✓       | ✗            | ✗          | ✓        | ✓     |
| videographer | ✓         | ✓          | ✓       | ✗            | ✗          | ✓        | ✓     |
| photographer | ✓         | ✓          | ✓       | ✗            | ✗          | ✓        | ✓     |

---

## SSF Calculation (Nepal Standard)

```
employeeSSF        = monthlySalary × (ssfEmployeePercent / 100)   [default 11%]
employerSSF        = monthlySalary × (ssfEmployerPercent / 100)   [default 20%]
totalSSF           = employeeSSF + employerSSF
finalPayableSalary = monthlySalary - employeeSSF
```

---

## Attendance Logic

- **Clock-in**: Automatic on login. IP checked against `OFFICE_IP` → `locationType = Office | Remote`.
- **Late detection**: Clock-in after `LATE_HOUR` (12:00 PM) → `isLate = true`.
- **Clock-out**: Automatic on logout. Also auto-clocked at 17:00 ±15 min by background job.
- **Duplicate prevention**: Compound unique index `{user, date}`.
- **Timezone**: All dates use `Asia/Kathmandu` (UTC+5:45) via `Intl.DateTimeFormat`.

---

## Production Deployment (Ubuntu VPS)

### PM2
```bash
cd backend
npm install -g pm2
pm2 start server.js --name managex-api
pm2 save
pm2 startup
```

### Nginx (reverse proxy)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (built static files)
    location / {
        root /var/www/managex/dist;
        try_files $uri /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Build Frontend
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

---

## Calendar Bulk Upload (XLSX Format)

Managers and admins can bulk-import calendar events via the **"Bulk Upload"** button on the Calendar page.

### File Requirements

- Format: `.xlsx` or `.xls`
- First row must be the **header row** (column names)
- Dates must be in **`YYYY-MM-DD`** format using **Bikram Sambat (BS)** — e.g. `2081-11-14`
- Maximum file size: **5 MB**

### Columns

| Column        | Required | Allowed Values                      | Description                          |
|---------------|----------|-------------------------------------|--------------------------------------|
| `title`       | Yes      | Any text                            | Event name                           |
| `date`        | Yes      | `YYYY-MM-DD` BS (e.g. `2081-11-14`) | Date of the event in Nepali calendar |
| `type`        | Yes      | `road`, `trail`, `event`            | Category of the event                |
| `description` | No       | Any text                            | Optional notes or details            |

> Column names are case-insensitive (`Title` = `title`).
> Dates are entered in **BS (Bikram Sambat)** — the system converts them to AD automatically.

### Example

| title              | date       | type  | description                   |
|--------------------|------------|-------|-------------------------------|
| Kathmandu Road Run | 2081-12-30 | road  | Annual spring road race       |
| Everest Trail Race | 2082-02-05 | trail | High altitude trail marathon  |
| Club Meet & Greet  | 2082-01-22 | event | Monthly club gathering        |

### Notes

- Rows with a missing `title`, invalid `date`, or invalid `type` are **skipped** and reported back.
- Valid rows are imported even if some rows have errors.
- The upload response shows: rows imported, rows skipped, and per-row error messages.

---

## Known Gaps / TODO

- No seed script — users must be created manually via MongoDB shell or admin API
- No rate limiting (`express-rate-limit` not installed)
- No file upload handler (attachment fields exist in schema but S3/disk upload not implemented)
- Manager, IT, Videographer, Photographer dashboards are placeholders
- No test suite (Jest / Vitest)
- No audit log collection
- Production secrets must be changed from default `changeme_*` values

---

## License

Internal use only — Nepal Marathon.
