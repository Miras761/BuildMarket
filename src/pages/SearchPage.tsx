import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Product } from '@/types';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, MapPin, Package, Star } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'products';
  const initialQuery = searchParams.get('q') || '';
  
  const [searchType, setSearchType] = useState<'products' | 'stores'>(initialType as 'products' | 'stores');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a real app with large data, we would use Algolia or Typesense.
    // Here we will fetch all active and filter client-side for simplicity in MVP.
    async function performSearch() {
      setLoading(true);
      try {
        if (searchType === 'products') {
          const snap = await getDocs(collection(db, 'products'));
          const allProducts = snap.docs.map(d => d.data() as Product);
          if (searchQuery) {
            setProducts(allProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())));
          } else {
            setProducts(allProducts);
          }
        } else {
          const snap = await getDocs(collection(db, 'stores'));
          const allStores = snap.docs.map(d => d.data() as Store).filter(s => s.status === 'active');
          if (searchQuery) {
            setStores(allStores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.address?.toLowerCase().includes(searchQuery.toLowerCase())));
          } else {
            setStores(allStores);
          }
        }
      } catch(error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    
    performSearch();
    
    setSearchParams({ type: searchType, q: searchQuery });
  }, [searchType, searchQuery, setSearchParams]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Search Marketplace</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder={`Search ${searchType}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setSearchType('products')}
              className={`px-6 py-2 rounded-lg font-medium text-sm transition ${searchType === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Products
            </button>
            <button 
              onClick={() => setSearchType('stores')}
              className={`px-6 py-2 rounded-lg font-medium text-sm transition ${searchType === 'stores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Stores
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Searching...</div>
      ) : (
        <div>
          {searchType === 'products' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {products.length === 0 ? <p className="col-span-full text-center text-gray-500 py-12">No products found.</p> : products.map(product => (
                <Link key={product.id} to={`/store/${product.storeId}?product=${product.id}`} className={`bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition group flex flex-col ${product.quantity === 0 ? 'border-gray-200 bg-gray-50 opacity-90' : 'border-gray-100'}`}>
                  <div className="h-48 bg-gray-50 relative">
                    {product.images && product.images.length > 0 ? (
                      <img loading="lazy" src={product.images[0]} alt={product.name} className={`w-full h-full object-cover ${product.quantity === 0 ? 'grayscale opacity-70' : ''}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    {product.quantity === 0 && (
                      <div className="absolute inset-0 bg-gray-900/10 flex items-center justify-center">
                        <span className="bg-gray-900/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className={`font-medium line-clamp-2 flex-grow ${product.quantity === 0 ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'}`}>{product.name}</h3>
                    <div className={`mt-3 font-bold text-lg ${product.quantity === 0 ? 'text-gray-500' : 'text-gray-900'}`}>{product.price.toLocaleString()} KZT</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {stores.length === 0 ? <p className="col-span-full text-center text-gray-500 py-12">No stores found.</p> : stores.map(store => (
                 <Link key={store.id} to={`/store/${store.id}`} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition group">
                   <div className="flex items-start gap-4">
                     {store.logoUrl ? (
                       <img loading="lazy" src={store.logoUrl} alt={store.name} className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
                     ) : (
                       <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100">{store.name.charAt(0)}</div>
                     )}
                     <div>
                       <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition">{store.name}</h3>
                       <div className="flex items-center gap-1 text-yellow-500 text-sm mt-1">
                         <Star className="w-4 h-4 fill-current" />
                         <span className="font-medium text-gray-700">{store.rating || 'New'}</span>
                       </div>
                     </div>
                   </div>
                   <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                     <MapPin className="w-4 h-4" />
                     <span className="truncate">{store.address}</span>
                   </div>
                 </Link>
               ))}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
