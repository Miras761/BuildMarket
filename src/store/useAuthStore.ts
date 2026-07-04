import { create } from 'zustand';
import { UserProfile } from '@/types';
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        set({ user: userSnap.data() as UserProfile, loading: false });
      } else {
        const newUser: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'New User',
          photoURL: firebaseUser.photoURL || '',
          role: 'customer',
          phoneNumber: firebaseUser.phoneNumber || '',
          joinDate: new Date().toISOString(),
        };
        await setDoc(userRef, newUser);
        set({ user: newUser, loading: false });
      }
    } else {
      set({ user: null, loading: false });
    }
  });

  return {
    user: null,
    loading: true,
    loginWithGoogle: async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        console.error('Login error:', error);
      }
    },
    loginWithEmail: async (email, pass) => {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    logout: async () => {
      await signOut(auth);
    }
  };
});
