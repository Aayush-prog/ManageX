import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import ClockStatus from '../attendance/ClockStatus.jsx';
import SalaryWidget from '../payroll/SalaryWidget.jsx';

const DashboardLayout = ({
  title,
  children,
  hideClockStatus  = true,
  hideSalaryWidget = true,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = title ? `${title} — Nepal Marathon` : 'Nepal Marathon';
  }, [title]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header title={title} onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
          {/* Top widgets row */}
          {(!hideClockStatus || !hideSalaryWidget) && (
            <div className={`grid gap-4 ${!hideClockStatus && !hideSalaryWidget ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {!hideClockStatus  && <div className="lg:col-span-2"><ClockStatus /></div>}
              {!hideSalaryWidget && <SalaryWidget />}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
