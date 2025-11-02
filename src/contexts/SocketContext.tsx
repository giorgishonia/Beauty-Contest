import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth/AuthProvider';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

// Auto-detect socket URL based on current host
const getSocketUrl = () => {
  // If explicitly set via env var, use that (highest priority)
  if (import.meta.env.VITE_SOCKET_URL) {
    console.log('📡 Using socket URL from env:', import.meta.env.VITE_SOCKET_URL);
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // Check if we're running on Vercel (production)
  const hostname = window.location.hostname;
  const isVercel = hostname.includes('.vercel.app') || 
                   hostname.includes('vercel.app') ||
                   import.meta.env.VERCEL ||
                   import.meta.env.MODE === 'production';
  
  if (isVercel) {
    console.log('🌐 Detected Vercel deployment, using production server');
    return 'http://176.223.142.21:3001';
  }
  
  // Check if we're running on ngrok
  if (hostname.includes('.ngrok-free.app') || hostname.includes('.ngrok.io')) {
    // If frontend is on ngrok, assume socket server is also on ngrok
    // This assumes you're running socket server on same ngrok tunnel or have separate tunnel
    // For now, return localhost - user should set VITE_SOCKET_URL env var for ngrok
    console.warn('⚠️ Running on ngrok but VITE_SOCKET_URL not set. Using localhost - socket may not work!');
    console.warn('💡 Set VITE_SOCKET_URL in .env to your socket server ngrok URL');
    return 'http://localhost:3001';
  }
  
  // Default to localhost for local development
  return 'http://localhost:3001';
};

const SOCKET_URL = getSocketUrl();
console.log('🔌 Socket URL:', SOCKET_URL);

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, user, isGuest } = useAuth();

  useEffect(() => {
    // Only create socket if user is logged in (either authenticated or guest)
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
        setError(null);
      }
      return;
    }

    // Check if we need to use polling only (HTTPS page -> HTTP server)
    const isPageHttps = window.location.protocol === 'https:';
    const isServerHttps = SOCKET_URL.startsWith('https://') || SOCKET_URL.startsWith('wss://');
    const usePollingOnly = isPageHttps && !isServerHttps;

    if (usePollingOnly) {
      console.log('⚠️ HTTPS page detected with HTTP server, using polling transport only');
    }

    // Create socket connection
    // Use polling only if HTTPS page with HTTP server (mixed content prevention)
    const newSocket = io(SOCKET_URL, {
      transports: usePollingOnly ? ['polling'] : ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      // Force polling if mixed content detected
      upgrade: !usePollingOnly // Don't try to upgrade to websocket if polling only
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
      
      // Don't set error for intentional disconnects
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        setError(null);
      } else {
        setError('Connection lost. Reconnecting...');
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
      setError(null);
      setConnected(true);
    });

    newSocket.on('reconnect_error', (err) => {
      console.error('❌ Socket reconnection error:', err);
      setError('Reconnection failed. Please refresh the page.');
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
      setError('Unable to reconnect. Please refresh the page.');
    });

    newSocket.on('error', (data: { message: string }) => {
      console.error('❌ Socket error:', data.message);
      setError(data.message);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user, isGuest]); // Only depend on user/auth state

  return (
    <SocketContext.Provider value={{ socket, connected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
