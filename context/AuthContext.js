import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { getFcmToken, saveFcmToken, removeFcmToken } from '../src/fcm';
import { auth, GoogleAuthProvider } from '../src/firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleFcmToken = async (currentUser) => {
    if (currentUser && typeof window !== 'undefined') {
      const token = await getFcmToken();
      if (token) {
        await saveFcmToken(currentUser.id, token);
      }
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        handleFcmToken(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      const res = await axios.post('/api/auth/login', { idToken });
      setUser(res.data);
      handleFcmToken(res.data); // Handle FCM token on login
      router.push('/account');
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name, email, password) => {
    try {
      await axios.post('/api/auth/register', { name, email, password });
      router.push('/login');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        // Use a more user-friendly message as suggested by the user
        throw new Error('A user with this email address already exists. Please use a different email or log in.');
      }
      // For other errors, use the server message or a generic one.
      throw new Error(error.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const logout = async () => {
    if (user && typeof window !== 'undefined') {
        const token = await getFcmToken();
        if (token) {
            await removeFcmToken(user.id, token);
        }
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await axios.post('/api/auth/google', { idToken });
      setUser(res.data);
      handleFcmToken(res.data);
      router.push('/account');
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Google login failed');
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
