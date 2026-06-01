import { create } from 'zustand';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import apiClient from '../api/axiosConfig';

export const useAuthStore = create((set) => ({
  firebaseUser: null,    
  dbUser: null,          
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. THE FIX: Grab the secure token directly from Google
          const token = await firebaseUser.getIdToken();
          
          // 2. THE FIX: Explicitly attach the token in the Headers
          const { data } = await apiClient.post('/auth/sync', {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          set({ 
            firebaseUser, 
            dbUser: data, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          console.error("Failed to sync user with database:", error);
          await signOut(auth);
          set({ 
            firebaseUser: null, 
            dbUser: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      } else {
        set({ 
          firebaseUser: null, 
          dbUser: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
    });
  },

  logout: async () => {
    await signOut(auth);
    set({ 
      firebaseUser: null, 
      dbUser: null, 
      isAuthenticated: false 
    });
  },
}));