import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, Truck, MoreHorizontal
} from 'lucide-react';

const bottomItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/orders', icon: Package, label: 'Orders' },
  { to: '/deliveries', icon: Truck, label: 'Deliveries' },
];

const BottomNav: React.FC = () => {
  const [showMore, setShowMore] = React.useState(false);

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {showMore && (
        <div className="fixed bottom-[72px] right-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 animate-slide-up lg:hidden">
          {[
            { to: '/subscriptions', label: 'Subscriptions' },
            { to: '/workers', label: 'Workers' },
            { to: '/attendance', label: 'Attendance' },
            { to: '/salaries', label: 'Salaries' },
            { to: '/billing', label: 'Billing' },
            { to: '/payments', label: 'Payments' },
            { to: '/reports', label: 'Reports' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setShowMore(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-dairy-50 text-dairy-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 lg:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-[68px] px-2">
          {bottomItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? 'bottom-nav-item-active' : 'bottom-nav-item'
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => setShowMore(!showMore)}
            className={`bottom-nav-item ${showMore ? 'text-dairy-600' : ''}`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
