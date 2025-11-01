import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface GuestUser {
  id: string;
  isGuest: true;
  username?: string;
  email?: string;
}

type ExtendedUser = (User & { isGuest?: false }) | GuestUser;

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInAsGuest: (username: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for guest session in localStorage
    const guestData = localStorage.getItem('guest_user');
    if (guestData) {
      try {
        const guestUser = JSON.parse(guestData);
        setUser(guestUser);
        setIsGuest(true);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('guest_user');
      }
    }

    // No Discord auth - set loading to false
    setUser(null);
    setIsGuest(false);
    setLoading(false);
  }, []);

  const signInAsGuest = (username: string) => {
    const guestUser: GuestUser = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isGuest: true,
      username: username,
      email: `${username}@guest.local`
    };
    
    localStorage.setItem('guest_user', JSON.stringify(guestUser));
    setUser(guestUser);
    setIsGuest(true);
    navigate('/profile-setup');
  };

  const signOut = async () => {
    if (isGuest) {
      localStorage.removeItem('guest_user');
      setUser(null);
      setIsGuest(false);
    } else {
      await supabase.auth.signOut();
    }
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
