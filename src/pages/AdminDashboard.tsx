import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Store, Product } from '@/types';
import { Store as StoreIcon, Package, MessageCircle, BarChart3, Plus, Settings, Camera, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '@/lib/errorHandling';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'chats'>('products');
  
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreData, setNewStoreData] = useState({ name: '', description: '', address: '', phone: '', workingHours: '', deliveryEnabled: true });

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({ name: '', price: '', quantity: '', description: '', manufacturer: '', expirationDate: '' });
  const [productImages, setProductImages] = useState<File[]>([]);
  const [uploadingProduct, setUploadingProduct] = useState(false);

  useEffect(() => {
    async function loadStore() {
      if (!user) return;
      try {
        const storeQuery = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
        const storeSnap = await getDocs(storeQuery);
        if (!storeSnap.empty) {
          const storeData = storeSnap.docs[0].data() as Store;
          storeData.id = storeSnap.docs[0].id;
          setStore(storeData);
          
          const productsQuery = query(collection(db, 'products'), where('storeId', '==', storeData.id));
          const productsSnap = await getDocs(productsQuery);
          setProducts(productsSnap.docs.map(d => {
             const p = d.data() as Product;
             p.id = d.id;
             return p;
          }));

          const chatsQuery = query(collection(db, 'chats'), where('storeId', '==', storeData.id));
          const chatsSnap = await getDocs(chatsQuery);
          setChats(chatsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'admin_dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, [user]);

  const handleCreateStore = async () => {
    if (!user) return;
    try {
      const storeRef = doc(collection(db, 'stores'));
      const storeDoc: Store = {
        id: storeRef.id,
        name: newStoreData.name,
        description: newStoreData.description,
        address: newStoreData.address,
        phone: newStoreData.phone,
        workingHours: newStoreData.workingHours,
        logoUrl: '',
        bannerUrl: '',
        gallery: [],
        latitude: 43.2389, // Default to Almaty for MVP
        longitude: 76.8897,
        ownerId: user.uid,
        status: 'active', // auto active for demo
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        verifiedBadge: false,
        deliveryEnabled: newStoreData.deliveryEnabled,
        rating: 0,
        reviewCount: 0
      };
      await setDoc(storeRef, storeDoc);
      setStore(storeDoc);
      setIsCreatingStore(false);
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'stores');
    }
  };

  const handleAddProduct = async () => {
    if (!store) return;
    setUploadingProduct(true);
    try {
      const imageUrls: string[] = [];
      for (const file of productImages) {
        const storageRef = ref(storage, `products/${store.id}_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      }

      const productRef = doc(collection(db, 'products'));
      const productDoc: Product = {
        id: productRef.id,
        storeId: store.id,
        name: newProductData.name,
        categoryId: 'general',
        manufacturer: newProductData.manufacturer,
        description: newProductData.description,
        price: Number(newProductData.price),
        quantity: Number(newProductData.quantity),
        expirationDate: newProductData.expirationDate || null,
        images: imageUrls,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(productRef, productDoc);
      setProducts([...products, productDoc]);
      setIsAddingProduct(false);
      setNewProductData({ name: '', price: '', quantity: '', description: '', manufacturer: '', expirationDate: '' });
      setProductImages([]);
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    } finally {
      setUploadingProduct(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      if (productImages.length + filesArray.length > 10) {
        alert("Maximum 10 images allowed.");
        return;
      }
      const validFiles = filesArray.filter(file => {
        if (!file.type.startsWith('image/')) {
          alert(`File ${file.name} is not an image.`);
          return false;
        }
        if (file.size > 2 * 1024 * 1024) {
          alert(`File ${file.name} is larger than 2MB.`);
          return false;
        }
        return true;
      });
      setProductImages(prev => [...prev, ...validFiles]);
    }
  };

  const removeImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  if (!store) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
          <StoreIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Welcome, Store Owner</h2>
          <p className="text-gray-500 mb-6">You haven't set up your store profile yet.</p>
          
          {isCreatingStore ? (
             <div className="max-w-md mx-auto text-left space-y-4">
               <input className="w-full border p-2 rounded-lg" placeholder="Store Name" value={newStoreData.name} onChange={e => setNewStoreData({...newStoreData, name: e.target.value})} />
               <input className="w-full border p-2 rounded-lg" placeholder="Address" value={newStoreData.address} onChange={e => setNewStoreData({...newStoreData, address: e.target.value})} />
               <input className="w-full border p-2 rounded-lg" placeholder="Phone" value={newStoreData.phone} onChange={e => setNewStoreData({...newStoreData, phone: e.target.value})} />
               <input className="w-full border p-2 rounded-lg" placeholder="Working Hours (e.g. 9:00 - 18:00)" value={newStoreData.workingHours} onChange={e => setNewStoreData({...newStoreData, workingHours: e.target.value})} />
               <div className="flex items-center gap-2">
                 <input type="checkbox" id="delivery" checked={newStoreData.deliveryEnabled} onChange={e => setNewStoreData({...newStoreData, deliveryEnabled: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                 <label htmlFor="delivery" className="text-gray-700">Delivery Available</label>
               </div>
               <textarea className="w-full border p-2 rounded-lg" placeholder="Description" value={newStoreData.description} onChange={e => setNewStoreData({...newStoreData, description: e.target.value})} />
               <div className="flex gap-2">
                 <button onClick={handleCreateStore} className="flex-1 bg-blue-600 text-white p-2 rounded-lg">Create</button>
                 <button onClick={() => setIsCreatingStore(false)} className="flex-1 bg-gray-200 text-gray-800 p-2 rounded-lg">Cancel</button>
               </div>
             </div>
          ) : (
            <button onClick={() => setIsCreatingStore(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition">
              Create Store Profile
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Store Dashboard</h1>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-800 transition">
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
             <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Total Views</div>
            <div className="text-2xl font-bold text-gray-900">1,245</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
             <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Active Products</div>
            <div className="text-2xl font-bold text-gray-900">{products.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
             <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Unread Messages</div>
            <div className="text-2xl font-bold text-gray-900">3</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('products')} 
          className={`pb-4 px-2 font-medium border-b-2 transition-colors ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Products
        </button>
        <button 
          onClick={() => setActiveTab('chats')} 
          className={`pb-4 px-2 font-medium border-b-2 transition-colors ${activeTab === 'chats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Customer Chats
        </button>
      </div>

      {activeTab === 'products' ? (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
           <h2 className="text-xl font-bold text-gray-900">Product Catalog</h2>
           <button onClick={() => setIsAddingProduct(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
             <Plus className="w-4 h-4" /> Add Product
           </button>
        </div>
        
        {isAddingProduct && (
           <div className="p-6 border-b border-gray-100 bg-gray-50">
             <h3 className="font-bold mb-4">New Product</h3>
             <div className="grid grid-cols-2 gap-4 max-w-3xl">
               <input className="border p-2 rounded-lg" placeholder="Product Name" value={newProductData.name} onChange={e => setNewProductData({...newProductData, name: e.target.value})} />
               <input className="border p-2 rounded-lg" placeholder="Manufacturer" value={newProductData.manufacturer} onChange={e => setNewProductData({...newProductData, manufacturer: e.target.value})} />
               <input type="number" className="border p-2 rounded-lg" placeholder="Price (KZT)" value={newProductData.price} onChange={e => setNewProductData({...newProductData, price: e.target.value})} />
               <input type="number" className="border p-2 rounded-lg" placeholder="Quantity" value={newProductData.quantity} onChange={e => setNewProductData({...newProductData, quantity: e.target.value})} />
               <input type="date" className="border p-2 rounded-lg" placeholder="Expiration Date" value={newProductData.expirationDate} onChange={e => setNewProductData({...newProductData, expirationDate: e.target.value})} />
               <input className="border p-2 rounded-lg" placeholder="Description" value={newProductData.description} onChange={e => setNewProductData({...newProductData, description: e.target.value})} />
             </div>
             
             <div className="mt-4 max-w-3xl">
               <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Camera className="w-4 h-4" /> Product Images (up to 10)</label>
               <input type="file" multiple accept="image/*" onChange={handleImageChange} className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
               <div className="flex gap-2 overflow-x-auto py-2">
                 {productImages.map((file, idx) => (
                   <div key={idx} className="relative w-16 h-16 rounded bg-gray-200 flex-shrink-0">
                     <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover rounded" />
                     <button onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-white rounded-full shadow text-red-500 p-0.5"><X className="w-3 h-3" /></button>
                   </div>
                 ))}
               </div>
             </div>
             
             <div className="mt-4 flex gap-2">
                 <button onClick={handleAddProduct} disabled={uploadingProduct} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                   {uploadingProduct ? 'Uploading...' : 'Save Product'}
                 </button>
                 <button onClick={() => setIsAddingProduct(false)} disabled={uploadingProduct} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg disabled:opacity-50">Cancel</button>
             </div>
           </div>
        )}

        <div className="p-6">
           {products.length === 0 ? (
             <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>You haven't added any products yet.</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="text-gray-500 text-sm border-b border-gray-100">
                     <th className="pb-3 font-medium">Product Name</th>
                     <th className="pb-3 font-medium">Price</th>
                     <th className="pb-3 font-medium">Stock</th>
                     <th className="pb-3 font-medium">Status</th>
                     <th className="pb-3 font-medium">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {products.map(product => (
                     <tr key={product.id} className="group">
                       <td className="py-4 text-gray-900 font-medium">{product.name}</td>
                       <td className="py-4 text-gray-900">{product.price.toLocaleString()} KZT</td>
                       <td className="py-4 text-gray-900">{product.quantity}</td>
                       <td className="py-4">
                         {product.quantity > 0 ? (
                           <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">In Stock</span>
                         ) : (
                           <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">Out of Stock</span>
                         )}
                       </td>
                       <td className="py-4">
                         <button className="text-blue-600 text-sm font-medium hover:underline">Edit</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Chats</h2>
          {chats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No messages yet.</div>
          ) : (
            <div className="space-y-4">
              {chats.map(chat => (
                <a 
                  key={chat.id} 
                  href={`/chat/${store.id}?chatId=${chat.id}`} 
                  className="block p-4 border border-gray-100 rounded-xl hover:border-blue-500 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">Customer {chat.userId.substring(0, 6)}...</span>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-gray-500">
                        {new Date(chat.lastMessageTime?.seconds * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm truncate">{chat.lastMessage}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
