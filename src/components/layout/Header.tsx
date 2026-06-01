import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/subscriptions': 'Subscriptions',
  '/orders': 'Orders',
  '/deliveries': 'Deliveries',
  '/workers': 'Workers',
  '/attendance': 'Attendance',
  '/salaries': 'Salaries',
  '/billing': 'Billing',
  '/payments': 'Payments',
  '/reports': 'Reports',
};

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { logout, currentUser } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'DairyFlow';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="btn-icon lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-icon relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-dairy-500 rounded-full" />
          </button>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200 ml-1">
            <div className="w-8 h-8 bg-dairy-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-dairy-700">
                {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-sm text-gray-600 max-w-[120px] truncate">
              {currentUser?.email || 'User'}
            </span>
          </div>

          <button
            onClick={logout}
            className="btn-icon text-gray-400 hover:text-red-500"
            title="Logout"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
