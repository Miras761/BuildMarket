export type Role = 'customer' | 'mini_admin' | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: Role;
  phoneNumber: string;
  joinDate: string; // ISO string
}

export interface Store {
  id: string;
  name: string;
  logoUrl: string;
  bannerUrl: string;
  gallery: string[];
  description: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  workingHours: string;
  ownerId: string;
  status: 'pending' | 'active' | 'banned';
  createdAt: string;
  updatedAt: string;
  verifiedBadge: boolean;
  deliveryEnabled: boolean;
  rating: number;
  reviewCount: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  categoryId: string;
  manufacturer: string;
  description: string;
  price: number;
  quantity: number;
  expirationDate: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  storeId: string;
  userId: string;
  rating: number; // 1-5
  comment: string;
  reply: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
