import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, Package, Truck, UserCog,
  ClipboardList, Wallet, FileText, CreditCard, BarChart3, X, Milk
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/subscriptions', icon: CalendarCheck, label: 'Subscriptions' },
  { to: '/orders', icon: Package, label: 'Orders' },
  { to: '/deliveries', icon: Truck, label: 'Deliveries' },
  { to: '/workers', icon: UserCog, label: 'Workers' },
  { to: '/attendance', icon: ClipboardList, label: 'Attendance' },
  { to: '/salaries', icon: Wallet, label: 'Salaries' },
  { to: '/billing', icon: FileText, label: 'Billing' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-[260px] bg-white border-r border-gray-100
          shadow-sidebar z-50 transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-dairy-500 to-dairy-700 rounded-xl flex items-center justify-center shadow-sm">
              <Milk className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">DairyFlow</h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Dairy Management</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100%-80px)] scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
