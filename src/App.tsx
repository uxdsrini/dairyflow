import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Subscriptions from './pages/Subscriptions';
import Orders from './pages/Orders';
import Deliveries from './pages/Deliveries';
import Workers from './pages/Workers';
import Attendance from './pages/Attendance';
import Salaries from './pages/Salaries';
import Billing from './pages/Billing';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import UpgradeCallback from './pages/UpgradeCallback';
import { Toaster } from 'react-hot-toast';
import FeatureLockedState from './components/billing/FeatureLockedState';
import UpgradeModal from './components/billing/UpgradeModal';
import { FeatureKey } from './config/plans';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
};

const PlanRoute: React.FC<{
  featureKey: FeatureKey;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ featureKey, title, description, children }) => {
  const { loading, canAccessFeature, requestFeatureAccess } = useSubscription();
  const hasAccess = canAccessFeature(featureKey);
  const promptShownRef = useRef(false);

  useEffect(() => {
    if (!loading && !hasAccess && !promptShownRef.current) {
      promptShownRef.current = true;
      requestFeatureAccess(featureKey);
    }
  }, [featureKey, hasAccess, loading, requestFeatureAccess]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return <FeatureLockedState featureKey={featureKey} title={title} description={description} />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="customers"
          element={
            <PlanRoute
              featureKey="customers"
              title="Customer management is locked"
              description="Choose a DairyFlow plan to continue managing customers, routes, subscriptions, and billing records."
            >
              <Customers />
            </PlanRoute>
          }
        />
        <Route
          path="subscriptions"
          element={
            <PlanRoute
              featureKey="subscriptions"
              title="Subscriptions are locked"
              description="Choose a DairyFlow plan to continue managing recurring milk subscriptions."
            >
              <Subscriptions />
            </PlanRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PlanRoute
              featureKey="orders"
              title="Orders are locked"
              description="Choose a DairyFlow plan to continue managing daily and one-time orders."
            >
              <Orders />
            </PlanRoute>
          }
        />
        <Route
          path="deliveries"
          element={
            <PlanRoute
              featureKey="deliveries"
              title="Delivery tracking is locked"
              description="Delivery tracking is part of the Growth Plan. Upgrade to manage daily routes and delivery operations."
            >
              <Deliveries />
            </PlanRoute>
          }
        />
        <Route
          path="workers"
          element={
            <PlanRoute
              featureKey="workers"
              title="Worker management is locked"
              description="Upgrade to the Growth Plan to manage workers, delivery staff, and payroll operations."
            >
              <Workers />
            </PlanRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <PlanRoute
              featureKey="attendance"
              title="Attendance management is locked"
              description="Upgrade to the Growth Plan to track worker attendance and daily operations."
            >
              <Attendance />
            </PlanRoute>
          }
        />
        <Route
          path="salaries"
          element={
            <PlanRoute
              featureKey="salaries"
              title="Salary management is locked"
              description="Upgrade to the Growth Plan to calculate salaries, advances, and payouts."
            >
              <Salaries />
            </PlanRoute>
          }
        />
        <Route
          path="billing"
          element={
            <PlanRoute
              featureKey="billing"
              title="Billing is locked"
              description="Choose a DairyFlow plan to continue generating invoices and monthly billing summaries."
            >
              <Billing />
            </PlanRoute>
          }
        />
        <Route
          path="payments"
          element={
            <PlanRoute
              featureKey="payments"
              title="Payment tracking is locked"
              description="Choose a DairyFlow plan to continue recording and managing customer payments."
            >
              <Payments />
            </PlanRoute>
          }
        />
        <Route
          path="expenses"
          element={
            <PlanRoute
              featureKey="expenses"
              title="Expense tracking is locked"
              description="Upgrade to the Growth Plan to track fuel, feed, maintenance, and business expenses."
            >
              <Expenses />
            </PlanRoute>
          }
        />
        <Route
          path="reports"
          element={
            <PlanRoute
              featureKey="reports"
              title="Reports are locked"
              description="Upgrade to the Growth Plan to access profit reports, exports, and financial summaries."
            >
              <Reports />
            </PlanRoute>
          }
        />
        <Route path="upgrade/callback" element={<UpgradeCallback />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AppRoutes />
          <UpgradeModal />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#ffffff',
                color: '#1f2937',
                borderRadius: '16px',
                border: '1px solid #f3f4f6',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              },
            }}
          />
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
