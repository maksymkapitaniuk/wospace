import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BookingsPage from './pages/client/BookingsPage';
import NewBookingPage from './pages/client/NewBookingPage';
import EditBookingPage from './pages/client/EditBookingPage';
import SubscriptionsPage from './pages/client/SubscriptionsPage';
import ManagerBookingsPage from './pages/manager/ManagerBookingsPage';
import ManagerNewBookingPage from './pages/manager/ManagerNewBookingPage';
import ManagerEditBookingPage from './pages/manager/ManagerEditBookingPage';
import ManagersPage from './pages/admin/ManagersPage';
import AdministratorsPage from './pages/admin/AdministratorsPage';
import PricesPage from './pages/admin/PricesPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Client routes */}
            <Route element={<ProtectedRoute roles={['client']} />}>
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/bookings/new" element={<NewBookingPage />} />
              <Route path="/bookings/:id/edit" element={<EditBookingPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
            </Route>

            {/* Manager routes */}
            <Route element={<ProtectedRoute roles={['manager']} />}>
              <Route path="/manager/bookings" element={<ManagerBookingsPage />} />
              <Route path="/manager/bookings/new" element={<ManagerNewBookingPage />} />
              <Route path="/manager/bookings/:id/edit" element={<ManagerEditBookingPage />} />
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin/managers" element={<ManagersPage />} />
              <Route path="/admin/administrators" element={<AdministratorsPage />} />
              <Route path="/admin/prices" element={<PricesPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
