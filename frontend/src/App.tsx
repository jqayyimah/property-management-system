import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Billing from './pages/Billing';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/landlord/LandlordDashboard';
import AdminLandlords from './pages/admin/Landlords';
import AdminConsumption from './pages/admin/Consumption';
import Properties from './pages/landlord/Properties';
import Apartments from './pages/landlord/Apartments';
import Tenants from './pages/landlord/Tenants';
import Rents from './pages/landlord/Rents';
import RentReminders from './pages/landlord/Reminders';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, authLoading } = useAuth();

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return user.role === 'ADMIN' ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/verify-email" element={<VerifyEmail />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="apartments" element={<Apartments />} />
            <Route path="properties" element={<Properties />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="rents" element={<Rents />} />
            <Route path="reminders" element={<RentReminders />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<ChangePassword />} />
            <Route
              path="admin/consumption"
              element={
                <AdminRoute>
                  <AdminConsumption />
                </AdminRoute>
              }
            />
            <Route
              path="admin/landlords"
              element={
                <AdminRoute>
                  <AdminLandlords />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
