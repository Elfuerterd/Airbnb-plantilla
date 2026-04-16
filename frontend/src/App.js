import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster, toast } from './components/ui/sonner';
import useWebSocket from './hooks/useWebSocket';
import '@/App.css';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallback from './pages/AuthCallback';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import SearchPage from './pages/SearchPage';
import BookingsPage from './pages/BookingsPage';
import FavoritesPage from './pages/FavoritesPage';
import PaymentPage from './pages/PaymentPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import HostDashboardPage from './pages/HostDashboardPage';
import NewPropertyPage from './pages/NewPropertyPage';
import EditPropertyPage from './pages/EditPropertyPage';
import MessagesPage from './pages/MessagesPage';
import WriteReviewPage from './pages/WriteReviewPage';
import HostPayoutsPage from './pages/HostPayoutsPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// WebSocket Notification Handler
const NotificationHandler = () => {
  const { isConnected, lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'new_message') {
        toast.info(`New message from ${lastMessage.message.sender_name}`, {
          description: lastMessage.message.content.substring(0, 50) + '...',
          action: {
            label: 'View',
            onClick: () => window.location.href = '/messages'
          }
        });
      } else if (lastMessage.type === 'notification') {
        toast(lastMessage.notification.message, {
          description: lastMessage.notification.type.replace(/_/g, ' ')
        });
      }
    }
  }, [lastMessage]);

  return null;
};

// App Router with OAuth Callback Detection
function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id (OAuth callback) - synchronous check before routes
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <>
      <NotificationHandler />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/property/:id" element={<PropertyDetailsPage />} />

        {/* Protected Routes - Guest */}
        <Route path="/bookings" element={
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        } />
        <Route path="/booking/:bookingId/payment" element={
          <ProtectedRoute>
            <PaymentPage />
          </ProtectedRoute>
        } />
        <Route path="/booking-success" element={
          <ProtectedRoute>
            <BookingSuccessPage />
          </ProtectedRoute>
        } />
        <Route path="/reviews/write" element={
          <ProtectedRoute>
            <WriteReviewPage />
          </ProtectedRoute>
        } />

        {/* Protected Routes - Messages */}
        <Route path="/messages" element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        } />
        <Route path="/messages/:conversationId" element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        } />

        {/* Protected Routes - Host */}
        <Route path="/host/dashboard" element={
          <ProtectedRoute>
            <HostDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/host/properties" element={
          <ProtectedRoute>
            <HostDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/host/properties/new" element={
          <ProtectedRoute>
            <NewPropertyPage />
          </ProtectedRoute>
        } />
        <Route path="/host/properties/:propertyId/edit" element={
          <ProtectedRoute>
            <EditPropertyPage />
          </ProtectedRoute>
        } />
        <Route path="/host/payouts" element={
          <ProtectedRoute>
            <HostPayoutsPage />
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
