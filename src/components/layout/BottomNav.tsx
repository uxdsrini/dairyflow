import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, Truck, MoreHorizontal, Lock
} from 'lucide-react';
import { FeatureKey, ROUTE_FEATURES } from '../../config/plans';
import { useSubscription } from '../../contexts/SubscriptionContext';

const bottomItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', featureKey: ROUTE_FEATURES['/'] },
  { to: '/customers', icon: Users, label: 'Customers', featureKey: ROUTE_FEATURES['/customers'] },
  { to: '/orders', icon: Package, label: 'Orders', featureKey: ROUTE_FEATURES['/orders'] },
  { to: '/deliveries', icon: Truck, label: 'Deliveries', featureKey: ROUTE_FEATURES['/deliveries'] },
];

const BottomNav: React.FC = () => {
  const [showMore, setShowMore] = React.useState(false);
  const { loading, canAccessFeature, openUpgradeModal } = useSubscription();

  const handleNavClick = (event: React.MouseEvent, featureKey?: FeatureKey | null) => {
    if (loading || !featureKey || canAccessFeature(featureKey)) {
      return;
    }

    event.preventDefault();
    openUpgradeModal(featureKey);
  };

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
            { to: '/subscriptions', label: 'Subscriptions', featureKey: ROUTE_FEATURES['/subscriptions'] },
            { to: '/workers', label: 'Workers', featureKey: ROUTE_FEATURES['/workers'] },
            { to: '/attendance', label: 'Attendance', featureKey: ROUTE_FEATURES['/attendance'] },
            { to: '/salaries', label: 'Salaries', featureKey: ROUTE_FEATURES['/salaries'] },
            { to: '/billing', label: 'Billing', featureKey: ROUTE_FEATURES['/billing'] },
            { to: '/payments', label: 'Payments', featureKey: ROUTE_FEATURES['/payments'] },
            { to: '/reports', label: 'Reports', featureKey: ROUTE_FEATURES['/reports'] },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(event) => {
                handleNavClick(event, item.featureKey);
                if (!event.defaultPrevented) {
                  setShowMore(false);
                }
              }}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-dairy-50 text-dairy-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span className="flex items-center gap-2">
                {item.label}
                {item.featureKey && !loading && !canAccessFeature(item.featureKey) && <Lock className="w-3.5 h-3.5" />}
              </span>
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
              onClick={(event) => handleNavClick(event, item.featureKey)}
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
