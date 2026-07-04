import { useEffect, useState } from 'react';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Product } from '@/types';
import { Link } from 'react-router-dom';
import { MapPin, Star, Package, ChevronRight } from 'lucide-react';
import { handleFirestoreError, OperationType } from '@/lib/errorHandling';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function loadHomeData() {
      try {
        // Load active stores
        const storesQuery = query(collection(db, 'stores'), where('status', '==', 'active'), limit(6));
        const storesSnap = await getDocs(storesQuery);
        setFeaturedStores(storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store)));

        // Load recent products
        const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(8));
        const productsSnap = await getDocs(productsQuery);
        setRecentProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'home_data');
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading marketplace...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="bg-blue-600 rounded-3xl p-8 md:p-16 text-white mb-12 shadow-xl overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{t('home.hero')}</h1>
          <p className="text-xl opacity-90 mb-8">{t('home.heroSub')}</p>
          <Link to="/search" className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg">
            {t('home.startSearch')} <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Featured Stores */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('home.featuredStores')}</h2>
          <Link to="/search?type=stores" className="text-blue-600 font-medium hover:underline flex items-center">
            View all <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        {featuredStores.length === 0 ? (
          <p className="text-gray-500 bg-white p-8 rounded-2xl border border-gray-100 text-center">No stores available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredStores.map(store => (
              <Link key={store.id} to={`/store/${store.id}`} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition group">
                <div className="flex items-start gap-4">
                  {store.logoUrl ? (
                    <img loading="lazy" src={store.logoUrl} alt={store.name} className="w-16 h-16 rounded-xl object-cover bg-gray-50 border border-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100">
                      {store.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition">{store.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500 text-sm mt-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-medium text-gray-700">{store.rating || 'New'}</span>
                      <span className="text-gray-400">({store.reviewCount || 0})</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{store.address}</span>
                </div>
                {store.verifiedBadge && (
                  <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                    Verified Supplier
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Products */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('home.newArrivals')}</h2>
          <Link to="/search?type=products" className="text-blue-600 font-medium hover:underline flex items-center">
            View all <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        {recentProducts.length === 0 ? (
           <p className="text-gray-500 bg-white p-8 rounded-2xl border border-gray-100 text-center">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recentProducts.map(product => (
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
        )}
      </div>
    </div>
  );
}
