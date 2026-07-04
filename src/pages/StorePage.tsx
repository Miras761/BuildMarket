import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Product, Review } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { MapPin, Phone, Clock, Star, Heart, Navigation, Truck, MessageCircle, Info, X, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { handleFirestoreError, OperationType } from '@/lib/errorHandling';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export default function StorePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const productId = searchParams.get('product');

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    
    async function fetchStore() {
      try {
        const storeRef = doc(db, 'stores', storeId!);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          setStore(storeSnap.data() as Store);
        }
        
        const productsQuery = query(collection(db, 'products'), where('storeId', '==', storeId));
        const productsSnap = await getDocs(productsQuery);
        const fetchedProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setProducts(fetchedProducts);
        
        const reviewsQuery = query(collection(db, 'reviews'), where('storeId', '==', storeId), orderBy('createdAt', 'desc'));
        const reviewsSnap = await getDocs(reviewsQuery);
        setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));

        if (user) {
          const favQuery = query(collection(db, 'users', user.uid, 'favorites'), where('targetId', '==', storeId));
          const favSnap = await getDocs(favQuery);
          setIsFavorite(!favSnap.empty);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'store_page');
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [storeId, user]);

  useEffect(() => {
    if (productId && products.length > 0) {
      const prod = products.find(p => p.id === productId);
      if (prod) {
        setSelectedProduct(prod);
        setCurrentImageIndex(0);
      }
    } else {
      setSelectedProduct(null);
    }
  }, [productId, products]);

  const toggleFavorite = async () => {
    if (!user || !storeId) return;
    try {
      const favQuery = query(collection(db, 'users', user.uid, 'favorites'), where('targetId', '==', storeId));
      const favSnap = await getDocs(favQuery);
      
      if (favSnap.empty) {
        const newFavRef = doc(collection(db, 'users', user.uid, 'favorites'));
        await setDoc(newFavRef, {
          type: 'store',
          targetId: storeId,
          createdAt: new Date().toISOString()
        });
        setIsFavorite(true);
      } else {
        await deleteDoc(favSnap.docs[0].ref);
        setIsFavorite(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitReview = async () => {
    if (!user || !storeId || !reviewText.trim()) return;
    setSubmittingReview(true);
    try {
      const reviewRef = doc(collection(db, 'reviews'));
      const newReview = {
        id: reviewRef.id,
        storeId,
        userId: user.uid,
        rating: reviewRating,
        comment: reviewText,
        createdAt: new Date().toISOString(),
        reply: null
      };
      await setDoc(reviewRef, newReview);
      setReviews([newReview as Review, ...reviews]);
      setReviewText('');
      setReviewRating(5);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const isOpenNow = (workingHoursStr: string) => {
    if (!workingHoursStr) return false;
    try {
      const parts = workingHoursStr.split('-');
      if (parts.length !== 2) return true;
      const [start, end] = parts.map(p => p.trim());
      
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [startH, startM] = start.split(':').map(Number);
      const startMinutes = startH * 60 + (startM || 0);
      
      const [endH, endM] = end.split(':').map(Number);
      const endMinutes = endH * 60 + (endM || 0);
      
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (e) {
      return true;
    }
  };

  if (loading) return <div className="p-8 text-center">Loading store...</div>;
  if (!store) return <div className="p-8 text-center text-red-500">Store not found.</div>;

  const isStoreOpen = isOpenNow(store.workingHours);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col md:flex-row">
            <button 
              onClick={() => setSearchParams({})} 
              className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-full md:w-1/2 bg-gray-100 relative min-h-[300px] flex items-center justify-center">
              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <>
                  <img src={selectedProduct.images[currentImageIndex]} alt={selectedProduct.name} className={`w-full h-full object-contain ${selectedProduct.quantity === 0 ? 'grayscale opacity-70' : ''}`} />
                  {selectedProduct.images.length > 1 && (
                    <>
                      <button 
                        onClick={() => setCurrentImageIndex(prev => prev === 0 ? selectedProduct.images.length - 1 : prev - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setCurrentImageIndex(prev => prev === selectedProduct.images.length - 1 ? 0 : prev + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                        {selectedProduct.images.map((_, idx) => (
                          <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-blue-600' : 'bg-gray-300'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                 <Package className="w-16 h-16 text-gray-300" />
              )}
              {selectedProduct.quantity === 0 && (
                <div className="absolute inset-0 bg-gray-900/10 flex items-center justify-center">
                  <span className="bg-gray-900/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">Out of Stock</span>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-1/2 p-8 flex flex-col">
              <h2 className={`text-2xl font-bold mb-2 ${selectedProduct.quantity === 0 ? 'text-gray-500' : 'text-gray-900'}`}>{selectedProduct.name}</h2>
              <div className="text-3xl font-bold text-gray-900 mb-6">{selectedProduct.price.toLocaleString()} KZT</div>
              
              <div className="space-y-4 mb-8">
                {selectedProduct.manufacturer && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Manufacturer</span>
                    <span className="font-medium">{selectedProduct.manufacturer}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Availability</span>
                  <span className={`font-medium ${selectedProduct.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedProduct.quantity > 0 ? `${selectedProduct.quantity} in stock` : 'Out of stock'}
                  </span>
                </div>
                {selectedProduct.expirationDate && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Expiration Date</span>
                    <span className="font-medium">{new Date(selectedProduct.expirationDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              <div className="mb-8">
                <h3 className="font-bold mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedProduct.description || 'No description provided.'}</p>
              </div>
              
              <div className="mt-auto">
                 <Link to={`/chat/${store.id}`} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition">
                   <MessageCircle className="w-5 h-5" /> Contact Seller
                 </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="h-64 md:h-80 w-full rounded-3xl overflow-hidden relative mb-8 bg-gray-200">
        {store.bannerUrl ? (
          <img src={store.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600" />
        )}
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute bottom-0 left-0 w-full p-8 flex items-end justify-between">
          <div className="flex items-end gap-6">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white bg-white">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-blue-600 bg-blue-50">{store.name.charAt(0)}</div>
              )}
            </div>
            <div className="mb-2 text-white">
              <h1 className="text-3xl md:text-4xl font-bold">{store.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-semibold">{store.rating || 'No ratings'}</span>
                  <span>({store.reviewCount || 0})</span>
                </div>
                {store.verifiedBadge && (
                  <div className="flex items-center gap-1 bg-green-500/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                    Verified Supplier
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Info & Map */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold mb-4">About Store</h2>
            <p className="text-gray-600 mb-6">{store.description || 'No description provided.'}</p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <span className="text-gray-700">{store.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{store.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-gray-700">{store.workingHours}</span>
                  {store.workingHours && (
                    <span className={`text-sm font-medium ${isStoreOpen ? 'text-green-600' : 'text-red-500'}`}>
                      {isStoreOpen ? 'Currently Open' : 'Currently Closed'}
                    </span>
                  )}
                </div>
              </div>
              {store.deliveryEnabled && (
                <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl mt-4">
                  <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <span className="text-blue-900 font-medium block">Delivery Available</span>
                    <span className="text-sm text-blue-700">Delivery price and conditions are agreed directly with the store via chat.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={toggleFavorite}
              className={`flex items-center justify-center gap-2 border px-4 py-3 rounded-xl font-medium transition ${
                isFavorite ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current text-red-600' : ''}`} /> 
              {isFavorite ? 'Favorited' : 'Favorite'}
            </button>
            <Link to={`/chat/${store.id}`} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl font-medium text-white transition">
              <MessageCircle className="w-5 h-5" /> Chat
            </Link>
          </div>

          {/* Map */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Location</h2>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                <Navigation className="w-4 h-4" /> Navigate
              </a>
            </div>
            <div className="h-64 rounded-xl overflow-hidden relative">
              {API_KEY ? (
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map 
                    defaultCenter={{lat: store.latitude, lng: store.longitude}} 
                    defaultZoom={15} 
                    mapId="STORE_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  >
                    <AdvancedMarker position={{lat: store.latitude, lng: store.longitude}}>
                      <Pin background="#2563EB" glyphColor="#fff" />
                    </AdvancedMarker>
                  </Map>
                </APIProvider>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center p-4 text-center text-gray-500 text-sm">
                  Google Maps API Key required to view map. Add GOOGLE_MAPS_PLATFORM_KEY to secrets.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Products & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Products */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Products ({products.length})</h2>
            {products.length === 0 ? (
              <p className="text-gray-500">No products listed yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {products.map(product => (
                  <Link key={product.id} to={`?product=${product.id}`} className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition flex flex-col group ${product.quantity === 0 ? 'border-gray-200 bg-gray-50 opacity-90' : 'border-gray-100'}`}>
                     <div className="h-32 sm:h-40 bg-gray-100 relative">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className={`w-full h-full object-cover ${product.quantity === 0 ? 'grayscale opacity-70' : ''}`} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                             <Package className="w-8 h-8" />
                          </div>
                        )}
                        {product.quantity === 0 && (
                          <div className="absolute inset-0 bg-gray-900/10 flex items-center justify-center">
                            <span className="bg-gray-900/80 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">Out of Stock</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <h3 className={`font-medium text-sm line-clamp-2 flex-grow ${product.quantity === 0 ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600 transition'}`}>{product.name}</h3>
                        <div className={`mt-2 font-bold ${product.quantity === 0 ? 'text-gray-500' : 'text-gray-900'}`}>{product.price.toLocaleString()} KZT</div>
                      </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div>
             <h2 className="text-2xl font-bold mb-6">Reviews</h2>
             
             {user && user.uid !== store.ownerId && (
               <div className="bg-white p-6 rounded-2xl border border-gray-100 mb-6 shadow-sm">
                 <h3 className="font-bold mb-4">Leave a Review</h3>
                 <div className="flex gap-1 mb-4">
                   {[1,2,3,4,5].map(star => (
                     <Star 
                       key={star} 
                       onClick={() => setReviewRating(star)}
                       className={`w-6 h-6 cursor-pointer transition ${star <= reviewRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                     />
                   ))}
                 </div>
                 <textarea 
                   className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                   placeholder="Share your experience with this store..."
                   rows={3}
                   value={reviewText}
                   onChange={e => setReviewText(e.target.value)}
                 />
                 <button 
                   onClick={submitReview}
                   disabled={!reviewText.trim() || submittingReview}
                   className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                 >
                   Submit Review
                 </button>
               </div>
             )}

             <div className="space-y-4">
               {reviews.length === 0 ? (
                 <p className="text-gray-500">No reviews yet.</p>
               ) : (
                 reviews.map(review => (
                   <div key={review.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-3">
                         <div className="flex">
                           {[...Array(5)].map((_, i) => (
                             <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                           ))}
                         </div>
                       </div>
                       <span className="text-xs text-gray-500 font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
                     </div>
                     <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                     {review.reply && (
                       <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
                         <div className="absolute top-0 left-6 -translate-y-1/2 w-3 h-3 bg-gray-50 border-t border-l border-gray-100 rotate-45"></div>
                         <span className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-1"><Info className="w-3 h-3 text-blue-600"/> Store Response:</span>
                         <p className="text-sm text-gray-700 mt-1">{review.reply}</p>
                       </div>
                     )}
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
