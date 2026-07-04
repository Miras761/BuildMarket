import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import StorePage from '@/pages/StorePage';
import Profile from '@/pages/Profile';
import AdminDashboard from '@/pages/AdminDashboard';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import SearchPage from '@/pages/SearchPage';
import InitializationGuard from '@/components/InitializationGuard';

import FloatingAssistant from '@/components/FloatingAssistant';

import ChatPage from '@/pages/ChatPage';

export default function App() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <InitializationGuard>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/store/:storeId" element={<StorePage />} />
              
              {/* Protected Routes */}
              <Route path="/chat/:storeId" element={user ? <ChatPage /> : <Navigate to="/" />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
              <Route path="/admin" element={user?.role === 'mini_admin' || user?.role === 'super_admin' ? <AdminDashboard /> : <Navigate to="/" />} />
              <Route path="/super-admin" element={user?.role === 'super_admin' ? <SuperAdminDashboard /> : <Navigate to="/" />} />
            </Routes>
          </main>
          <FloatingAssistant />
        </div>
      </Router>
    </InitializationGuard>
  );
}
