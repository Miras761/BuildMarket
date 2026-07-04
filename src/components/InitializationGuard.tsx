import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { Shield, Loader } from 'lucide-react';

export default function InitializationGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [needsInit, setNeedsInit] = useState(false);

  useEffect(() => {
    const checkInit = async () => {
      try {
        const initDoc = await getDoc(doc(db, 'settings', 'initialization'));
        if (!initDoc.exists()) {
          setNeedsInit(true);
        }
      } catch (error) {
        console.error("Error checking initialization", error);
      } finally {
        setLoading(false);
      }
    };
    checkInit();
  }, []);

  const handleInit = async () => {
    if (!user) {
      alert('Please log in first to become Super Admin.');
      return;
    }
    
    if (user.email !== 'saiynmiras@gmail.com') {
      alert('Unauthorized account.');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create initialization doc
      await setDoc(doc(db, 'settings', 'initialization'), {
        firstAdminUid: user.uid,
        initializedAt: new Date().toISOString()
      });

      // 2. Update self to super_admin
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'super_admin'
      });

      // 3. Force reload to get updated role
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Failed to initialize system. Are you sure you are the first user?');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (needsInit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
        <Shield className="w-24 h-24 text-blue-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">System Initialization</h1>
        <p className="text-gray-400 text-center max-w-md mb-8">
          The application requires an initial Super Admin to setup the platform. 
          Only the authorized administrator can perform this action.
        </p>
        {!user ? (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
            <p className="mb-4">Please log in with the authorized account.</p>
            <LoginButton />
          </div>
        ) : user.email === 'saiynmiras@gmail.com' ? (
          <button 
            onClick={handleInit}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Claim Super Admin Role
          </button>
        ) : (
          <div className="bg-red-900/50 p-6 rounded-lg border border-red-700 text-center">
            <p className="text-red-200 mb-4">Unauthorized email address: {user.email}</p>
            <p className="text-sm text-gray-400">You do not have permission to initialize the system.</p>
            <div className="mt-4">
              <LoginButton />
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

function LoginButton() {
  const { loginWithGoogle } = useAuthStore();
  return (
    <button 
      onClick={loginWithGoogle}
      className="px-6 py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mx-auto"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Sign in with Google
    </button>
  );
}
