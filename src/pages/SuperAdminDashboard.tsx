import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Store, UserProfile, Review } from '@/types';
import { Users, Store as StoreIcon, ShieldAlert, CheckCircle, MessageSquare, Star, Database, Plus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '@/lib/errorHandling';
import { useAuthStore } from '@/store/useAuthStore';
import { seedDatabase } from '@/lib/seed';

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<'stores' | 'users' | 'reviews' | 'create_admin'>('stores');
  
  // Create mini admin state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const handleSeed = async () => {
    if (!user || user.role !== 'super_admin') return;
    if (!window.confirm("Seed realistic data into the database?")) return;
    setSeeding(true);
    try {
      await seedDatabase(user.uid);
      alert("Database seeded successfully! Reload the page to see changes.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to seed database: " + (e as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const storesSnap = await getDocs(collection(db, 'stores'));
        setStores(storesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
        
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        
        const reviewsSnap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
        setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'super_admin');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleStoreStatus = async (storeId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'banned' : 'active';
      await updateDoc(doc(db, 'stores', storeId), { status: newStatus });
      setStores(stores.map(s => s.id === storeId ? { ...s, status: newStatus as any } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(reviews.filter(r => r.id !== reviewId));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'mini_admin' ? 'customer' : 'mini_admin';
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole as any } : u));
    } catch (e) {
      console.error(e);
      alert("Failed to update user role: " + (e as Error).message);
    }
  };

  const handleCreateMiniAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAdmin(true);
    try {
      const apiKey = auth.app.options.apiKey;
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword,
          returnSecureToken: true
        })
      });
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const uid = data.localId;
      const newUserProfile: UserProfile = {
        uid,
        email: newAdminEmail,
        displayName: newAdminName || newAdminEmail.split('@')[0],
        photoURL: '',
        role: 'mini_admin',
        phoneNumber: '',
        joinDate: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), newUserProfile);
      
      setUsers(prev => [...prev, newUserProfile]);
      alert('Mini admin created successfully!');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      setActiveTab('users');
    } catch (err: any) {
      console.error(err);
      alert('Failed to create mini admin: ' + err.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading system data...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Control Panel</h1>
          <p className="text-gray-500 mt-2">Manage all stores, users, and marketplace settings.</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {seeding ? <div className="w-5 h-5 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin" /> : <Database className="w-5 h-5" />}
          {seeding ? 'Seeding...' : 'Seed Test Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
             <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Stores</div>
            <div className="text-2xl font-bold text-gray-900">{stores.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
             <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Active Stores</div>
            <div className="text-2xl font-bold text-gray-900">{stores.filter(s => s.status === 'active').length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
             <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Users</div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
             <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Reviews</div>
            <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('stores')}
          className={`px-6 py-2 rounded-xl font-medium transition ${activeTab === 'stores' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Manage Stores
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 rounded-xl font-medium transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Manage Users
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`px-6 py-2 rounded-xl font-medium transition ${activeTab === 'reviews' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Moderate Reviews
        </button>
        <button 
          onClick={() => setActiveTab('create_admin')}
          className={`px-6 py-2 rounded-xl font-medium transition flex items-center gap-2 ${activeTab === 'create_admin' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-100'}`}
        >
          <Plus className="w-4 h-4" /> Create Mini Admin
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        {activeTab === 'stores' ? (
          <div className="p-6">
             {stores.length === 0 ? (
               <p className="text-gray-500 text-center py-8">No stores registered.</p>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="text-gray-500 text-sm border-b border-gray-100">
                       <th className="pb-3 font-medium">Store Name</th>
                       <th className="pb-3 font-medium">Owner ID</th>
                       <th className="pb-3 font-medium">Status</th>
                       <th className="pb-3 font-medium text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {stores.map(store => (
                       <tr key={store.id} className="group">
                         <td className="py-4 text-gray-900 font-medium">{store.name}</td>
                         <td className="py-4 text-gray-500 text-sm truncate max-w-[150px]">{store.ownerId}</td>
                         <td className="py-4">
                           <span className={`px-2 py-1 rounded text-xs font-medium ${
                             store.status === 'active' ? 'bg-green-100 text-green-700' :
                             store.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                           }`}>
                             {store.status.toUpperCase()}
                           </span>
                         </td>
                         <td className="py-4 text-right space-x-3">
                           {store.status === 'active' ? (
                             <button onClick={() => toggleStoreStatus(store.id, store.status)} className="text-red-600 text-sm font-medium hover:underline">Ban</button>
                           ) : (
                             <button onClick={() => toggleStoreStatus(store.id, store.status)} className="text-green-600 text-sm font-medium hover:underline">Activate</button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="p-6">
             {users.length === 0 ? (
               <p className="text-gray-500 text-center py-8">No users registered.</p>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="text-gray-500 text-sm border-b border-gray-100">
                       <th className="pb-3 font-medium">User ID</th>
                       <th className="pb-3 font-medium">Email</th>
                       <th className="pb-3 font-medium">Role</th>
                       <th className="pb-3 font-medium text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {users.map(u => (
                       <tr key={u.uid} className="group">
                         <td className="py-4 text-gray-500 text-sm truncate max-w-[150px]">{u.uid}</td>
                         <td className="py-4 text-gray-900 font-medium">{u.email}</td>
                         <td className="py-4">
                           <span className={`px-2 py-1 rounded text-xs font-medium ${
                             u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                             u.role === 'mini_admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                           }`}>
                             {u.role.toUpperCase()}
                           </span>
                         </td>
                         <td className="py-4 text-right space-x-3">
                           {u.role !== 'super_admin' && (
                             <button 
                               onClick={() => toggleUserRole(u.uid, u.role)} 
                               className="text-blue-600 text-sm font-medium hover:underline"
                             >
                               {u.role === 'mini_admin' ? 'Revoke Mini Admin' : 'Make Mini Admin'}
                             </button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        ) : activeTab === 'create_admin' ? (
          <div className="p-6 max-w-lg">
            <h2 className="text-xl font-bold mb-4">Create New Mini Admin (Vendor)</h2>
            <p className="text-gray-500 mb-6 text-sm">This creates a new user account with merchant privileges. You can give these credentials to the vendor so they can log in and set up their store.</p>
            <form onSubmit={handleCreateMiniAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email / Login</label>
                <input 
                  type="email" 
                  required
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / Display Name</label>
                <input 
                  type="text" 
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Minimum 6 characters"
                />
              </div>
              <button 
                type="submit" 
                disabled={creatingAdmin}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 mt-4"
              >
                {creatingAdmin ? 'Creating...' : 'Create Mini Admin Account'}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6">
             {reviews.length === 0 ? (
               <p className="text-gray-500 text-center py-8">No reviews yet.</p>
             ) : (
               <div className="space-y-4">
                 {reviews.map(review => (
                   <div key={review.id} className="border p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <div className="flex">
                           {[...Array(5)].map((_, i) => (
                             <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                           ))}
                         </div>
                         <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                       </div>
                       <p className="text-sm font-medium mb-1">{review.comment}</p>
                       <p className="text-xs text-gray-500">Store ID: {review.storeId} | User ID: {review.userId}</p>
                     </div>
                     <button onClick={() => deleteReview(review.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition">
                       Delete Review
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
