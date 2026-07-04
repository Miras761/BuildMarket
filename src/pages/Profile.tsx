import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { UserCircle, Heart, Clock, Camera, Edit2, Check, X, Store, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/errorHandling';
import { Product, Store as StoreType } from '@/types';

export default function Profile() {
  const { user } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [uploading, setUploading] = useState(false);
  
  const [favoriteStores, setFavoriteStores] = useState<StoreType[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setPhoneNumber(user.phoneNumber || '');
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    setLoadingFavs(true);
    try {
      const favsRef = collection(db, 'users', user.uid, 'favorites');
      const favsSnap = await getDocs(query(favsRef));
      
      const storeIds: string[] = [];
      const productIds: string[] = [];
      
      favsSnap.forEach(d => {
        const data = d.data();
        if (data.type === 'store') storeIds.push(data.targetId);
        if (data.type === 'product') productIds.push(data.targetId);
      });

      // In a real app we'd fetch in chunks if the list is large, or just store a denormalized version.
      // For MVP, we'll just fetch all if we have ids.
      if (storeIds.length > 0) {
        const storeSnap = await getDocs(collection(db, 'stores'));
        const stores = storeSnap.docs.filter(d => storeIds.includes(d.id)).map(d => ({id: d.id, ...d.data()} as StoreType));
        setFavoriteStores(stores);
      }
      if (productIds.length > 0) {
        const productSnap = await getDocs(collection(db, 'products'));
        const products = productSnap.docs.filter(d => productIds.includes(d.id)).map(d => ({id: d.id, ...d.data()} as Product));
        setFavoriteProducts(products);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFavs(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        phoneNumber
      });
      setIsEditing(false);
      // Re-trigger auth store update or just rely on manual refresh for MVP
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL });
      
      window.location.reload();
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-blue-50 overflow-hidden relative">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-full h-full text-gray-400 bg-gray-50" />
              )}
              <div 
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </div>
          
          <div className="flex-grow w-full">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+7 777 000 0000" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
                    <Check className="w-4 h-4" /> Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start w-full">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
                  <p className="text-gray-500 mt-1">{user.email}</p>
                  {user.phoneNumber && <p className="text-gray-600 mt-1">{user.phoneNumber}</p>}
                  <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{user.role}</span>
                    <span className="flex items-center gap-1 text-gray-500"><Clock className="w-4 h-4" /> Joined {new Date(user.joinDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-xl transition">
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
         <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
           <Heart className="w-6 h-6 text-red-500" /> Favorites
         </h2>
         
         {loadingFavs ? (
           <div className="text-center py-12 text-gray-500">Loading favorites...</div>
         ) : favoriteStores.length === 0 && favoriteProducts.length === 0 ? (
           <div className="text-center py-12 text-gray-500">
             <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
             <p>You haven't saved any favorites yet.</p>
             <Link to="/search" className="inline-block mt-4 text-blue-600 font-medium hover:underline">Browse Marketplace</Link>
           </div>
         ) : (
           <div className="space-y-8">
             {favoriteStores.length > 0 && (
               <div>
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Store className="w-5 h-5 text-gray-400"/> Stores</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {favoriteStores.map(store => (
                     <Link key={store.id} to={`/store/${store.id}`} className="border p-4 rounded-xl flex items-center gap-4 hover:shadow-md transition">
                       {store.logoUrl ? (
                         <img src={store.logoUrl} className="w-12 h-12 rounded-lg object-cover" alt="store" />
                       ) : (
                         <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">{store.name.charAt(0)}</div>
                       )}
                       <div>
                         <div className="font-bold text-gray-900">{store.name}</div>
                         <div className="text-sm text-gray-500">{store.address}</div>
                       </div>
                     </Link>
                   ))}
                 </div>
               </div>
             )}
             
             {favoriteProducts.length > 0 && (
               <div>
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Package className="w-5 h-5 text-gray-400"/> Products</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {favoriteProducts.map(product => (
                     <Link key={product.id} to={`/store/${product.storeId}?product=${product.id}`} className="border rounded-xl overflow-hidden hover:shadow-md transition flex flex-col group">
                        <div className="h-32 bg-gray-50">
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0]} className="w-full h-full object-cover" alt="product" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-8 h-8" /></div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="font-medium text-sm line-clamp-2">{product.name}</div>
                          <div className="font-bold mt-1">{product.price.toLocaleString()} KZT</div>
                        </div>
                     </Link>
                   ))}
                 </div>
               </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
}
