
import React from 'react';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import AccommodationPortal from '@/components/AccommodationPortal';
import AuthPage from '@/components/AuthPage';

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <AccommodationPortal /> : <AuthPage />;
};

function App() {
  return (
    <AuthProvider>
      <Helmet>
        <title>מערכת ניהול אכסניות - Accommodation Management</title>
        <meta name="description" content="Complete accommodation management portal for managing apartments, guests, and assignments" />
      </Helmet>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
