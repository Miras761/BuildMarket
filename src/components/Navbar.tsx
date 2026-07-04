import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, UserCircle, LogIn, LayoutDashboard, Bell, Globe, X } from 'lucide-react';
import { Notification } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageCode } from '@/i18n';

export default function Navbar() {
  const { user, loginWithGoogle, loginWithEmail, logout } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await loginWithEmail(email, password);
      setShowLoginModal(false);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (for vendors/admins)</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              {loginError && <div className="text-red-500 text-sm">{loginError}</div>}
              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isLoggingIn ? 'Signing in...' : 'Sign In with Email'}
              </button>
            </form>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
            </div>
            
            <button 
              onClick={() => {
                loginWithGoogle();
                setShowLoginModal(false);
              }} 
              className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-2 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path fill="none" d="M1 1h22v22H1z" /></svg>
              Google
            </button>
          </div>
        </div>
      )}
      <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">BuildMarket</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/search" className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full">
              <Search className="w-5 h-5" />
            </Link>

            {/* Language Selector */}
            <div className="relative group cursor-pointer">
              <button onClick={() => setShowLanguage(!showLanguage)} className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full">
                <Globe className="w-5 h-5" />
              </button>
              {(showLanguage) && (
                 <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg py-1 border z-50">
                    <button onClick={() => { setLanguage('en'); setShowLanguage(false); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${language === 'en' ? 'font-bold' : ''}`}>English</button>
                    <button onClick={() => { setLanguage('ru'); setShowLanguage(false); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${language === 'ru' ? 'font-bold' : ''}`}>Русский</button>
                    <button onClick={() => { setLanguage('kk'); setShowLanguage(false); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${language === 'kk' ? 'font-bold' : ''}`}>Қазақша</button>
                 </div>
              )}
            </div>
            
            {user ? (
              <div className="flex items-center gap-4">
                
                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-50">
                        <h3 className="font-bold text-gray-900">{t('navbar.notifications')}</h3>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline font-medium">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications yet.</div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => markAsRead(n.id)}
                              className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${n.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                            >
                              <p className="text-sm font-medium text-gray-900">{n.title}</p>
                              <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {user.role === 'super_admin' && (
                  <Link to="/super-admin" className="text-sm font-medium text-gray-700 hover:text-blue-600 flex items-center gap-1">
                    <LayoutDashboard className="w-4 h-4" /> {t('navbar.superAdmin')}
                  </Link>
                )}
                {user.role === 'mini_admin' && (
                  <Link to="/admin" className="text-sm font-medium text-gray-700 hover:text-blue-600 flex items-center gap-1">
                    <LayoutDashboard className="w-4 h-4" /> {t('navbar.myStore')}
                  </Link>
                )}
                <div className="relative group cursor-pointer">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border" />
                  ) : (
                    <UserCircle className="w-8 h-8 text-gray-400" />
                  )}
                  <div className="absolute right-0 w-48 mt-2 bg-white rounded-md shadow-lg py-1 hidden group-hover:block border z-50">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      {user.displayName}
                    </div>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('navbar.profile')}</Link>
                    <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                      {t('navbar.signOut')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition font-medium text-sm">
                <LogIn className="w-4 h-4" /> {t('navbar.signIn')}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
