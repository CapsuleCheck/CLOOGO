import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import PostErrand from '@/pages/PostErrand';
import ErrandDetail from '@/pages/ErrandDetail';
import MyErrands from '@/pages/MyErrands';
import MyRuns from '@/pages/MyRuns';
import Profile from '@/pages/Profile';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Support from '@/pages/Support';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Navbar /><Dashboard /></ProtectedRoute>
        } />
        <Route path="/post-errand" element={
          <ProtectedRoute><Navbar /><PostErrand /></ProtectedRoute>
        } />
        <Route path="/errands/:id" element={
          <ProtectedRoute><Navbar /><ErrandDetail /></ProtectedRoute>
        } />
        <Route path="/my-errands" element={
          <ProtectedRoute><Navbar /><MyErrands /></ProtectedRoute>
        } />
        <Route path="/my-runs" element={
          <ProtectedRoute><Navbar /><MyRuns /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Navbar /><Profile /></ProtectedRoute>
        } />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/support" element={<Support />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
