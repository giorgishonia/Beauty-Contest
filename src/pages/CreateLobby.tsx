import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { ArrowLeft, Users, Timer, Lock } from 'lucide-react';

const CreateLobby = () => {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [roundTimer, setRoundTimer] = useState(60);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const handleCreate = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    if (!lobbyName.trim()) {
      toast({
        title: 'Lobby Name Required',
        description: 'Please enter a name for your lobby',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Get server URL - use same logic as SocketContext
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const isVercel = hostname.includes('.vercel.app') || 
                       hostname.includes('vercel.app') ||
                       import.meta.env.VERCEL ||
                       import.meta.env.MODE === 'production';
      
      // Use environment variable if set, otherwise detect based on deployment
      let serverUrl: string;
      if (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL) {
        serverUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      } else if (isVercel) {
        // Use relative URL when on Vercel (will be proxied)
        serverUrl = `${protocol}//${hostname}`;
      } else {
        serverUrl = 'http://localhost:3001';
      }
      
      console.log('🌐 Creating lobby via server:', serverUrl);

      // Use server endpoint for lobby creation (works for guests)
      const response = await fetch(`${serverUrl}/api/lobbies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: lobbyName.trim(),
          hostId: user.id,
          maxPlayers: maxPlayers,
          roundTimer: roundTimer,
          password: password.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create lobby' }));
        const errorMessage = error.details || error.error || 'Failed to create lobby';
        console.error('Server error:', error);
        throw new Error(errorMessage);
      }

      const { lobby } = await response.json();

      toast({
        title: 'Lobby Created',
        description: `"${lobbyName}" has been created successfully`
      });

      // Navigate to lobby waiting room
      navigate(`/lobby/${lobby.id}`);
    } catch (error: any) {
      console.error('Error creating lobby:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create lobby',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background opacity-50" />
        <div className="absolute top-1/3 right-1/4 text-6xl text-primary opacity-10 animate-float">♦</div>
        <div className="absolute bottom-1/3 left-1/4 text-5xl text-secondary opacity-10 animate-float" style={{ animationDelay: '1.5s' }}>♦</div>

        {/* Header */}
        <div className="relative z-10 border-b-2 border-border bg-card/50 backdrop-blur-sm sticky top-0 shadow-lg">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/lobby-browser')}
                variant="outline"
                className="border-2 border-border hover:bg-muted hover:border-primary transition-all duration-300 font-rajdhani"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lobbies
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-3xl text-primary animate-pulse">♦</span>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-orbitron">
                  CREATE LOBBY
                </h1>
              </div>
              <div className="w-32" /> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            {/* Lobby Name */}
            <div className="mb-8 animate-fade-in-up">
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-6 hover:border-primary transition-all duration-300">
                <Label className="text-lg font-bold text-neon-cyan mb-4 font-orbitron flex items-center gap-2">
                  <span className="text-2xl">📝</span> LOBBY NAME
                </Label>
                <Input
                  type="text"
                  value={lobbyName}
                  onChange={(e) => setLobbyName(e.target.value)}
                  placeholder="Enter lobby name"
                  maxLength={30}
                  className="text-lg h-12 bg-background border-2 border-border focus:border-primary font-rajdhani"
                />
                <p className="mt-2 text-sm text-muted-foreground font-rajdhani">
                  {lobbyName.length}/30 characters
                </p>
              </div>
            </div>

            {/* Max Players */}
            <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-6 hover:border-secondary transition-all duration-300">
                <Label className="text-lg font-bold text-neon-cyan mb-4 font-orbitron flex items-center gap-2">
                  <Users className="w-6 h-6" /> MAX PLAYERS
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[maxPlayers]}
                    onValueChange={(value) => setMaxPlayers(value[0])}
                    min={3}
                    max={8}
                    step={1}
                    className="flex-1"
                  />
                  <div className="text-3xl font-bold text-neon-cyan font-orbitron min-w-[60px] text-center">
                    {maxPlayers}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground font-rajdhani">
                  Minimum 3 players, maximum 8 players
                </p>
              </div>
            </div>

            {/* Round Timer */}
            <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-6 hover:border-primary transition-all duration-300">
                <Label className="text-lg font-bold text-neon-cyan mb-4 font-orbitron flex items-center gap-2">
                  <Timer className="w-6 h-6" /> ROUND TIMER
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[roundTimer]}
                    onValueChange={(value) => setRoundTimer(value[0])}
                    min={30}
                    max={90}
                    step={10}
                    className="flex-1"
                  />
                  <div className="text-3xl font-bold text-neon-red font-orbitron min-w-[80px] text-center">
                    {roundTimer}s
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground font-rajdhani">
                  Time limit per round (30-90 seconds)
                </p>
              </div>
            </div>

            {/* Password (Optional) */}
            <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-6 hover:border-secondary transition-all duration-300">
                <Label className="text-lg font-bold text-neon-cyan mb-4 font-orbitron flex items-center gap-2">
                  <Lock className="w-6 h-6" /> PASSWORD (OPTIONAL)
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for public lobby"
                  maxLength={20}
                  className="text-lg h-12 bg-background border-2 border-border focus:border-primary font-rajdhani"
                />
                <p className="mt-2 text-sm text-muted-foreground font-rajdhani">
                  Optional: Set a password to make this a private lobby
                </p>
              </div>
            </div>

            {/* Create Button */}
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Button
                onClick={handleCreate}
                disabled={loading || !lobbyName.trim()}
                size="lg"
                className="text-xl px-16 py-8 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red transition-all duration-300 hover:shadow-[0_0_40px_hsl(348_100%_50%/0.8)] hover:scale-105 font-orbitron font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'CREATING...' : 'CREATE LOBBY'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default CreateLobby;

