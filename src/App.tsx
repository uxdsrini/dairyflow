import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import { Toaster } from 'react-hot-toast';

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
        <Route path="customers" element={<Customers />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="orders" element={<Orders />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="workers" element={<Workers />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="salaries" element={<Salaries />} />
        <Route path="billing" element={<Billing />} />
        <Route path="payments" element={<Payments />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
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
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
