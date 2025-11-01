import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Lock, Plus, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/layout/PageTransition';

interface Lobby {
  id: string;
  name: string;
  max_players: number;
  password: string | null;
  status: string;
  host_id: string;
  player_count?: number;
}

const LobbyBrowser = () => {
  const { user, signOut, isGuest } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchLobbies();

    const channel = supabase
      .channel('lobbies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobbies'
        },
        () => {
          fetchLobbies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchLobbies = async () => {
    try {
      const { data: lobbiesData, error } = await supabase
        .from('lobbies')
        .select(`
          *,
          lobby_players(count)
        `)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const lobbiesWithCount = lobbiesData?.map(lobby => ({
        ...lobby,
        player_count: lobby.lobby_players?.[0]?.count || 0
      })) || [];

      setLobbies(lobbiesWithCount);
    } catch (error) {
      console.error('Error fetching lobbies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lobbies',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async (lobbyId: string, hasPassword: boolean) => {
    if (hasPassword) {
      toast({
        title: 'Password Protected',
        description: 'Password protection coming soon',
      });
      return;
    }

    try {
      // Skip database insert for guest users
      if (!(user as any)?.isGuest) {
        // Check if already in lobby
        const { data: existingPlayer } = await supabase
          .from('lobby_players')
          .select('id')
          .eq('lobby_id', lobbyId)
          .eq('user_id', user!.id)
          .single();

        if (!existingPlayer) {
          // Add player to lobby
          const { error } = await supabase
            .from('lobby_players')
            .insert({
              lobby_id: lobbyId,
              user_id: user!.id
            });

          if (error) throw error;
        }
      }

      navigate(`/lobby/${lobbyId}`);
    } catch (error: any) {
      console.error('Error joining lobby:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to join lobby',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-neon-red text-2xl font-orbitron animate-pulse">LOADING LOBBIES...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Animated Header */}
        <div className="border-b-2 border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-lg animate-fade-in">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl text-primary animate-pulse">♦</span>
                <div>
                  <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-orbitron tracking-wider">
                    LOBBIES
                  </h1>
                  <p className="text-sm text-muted-foreground font-rajdhani">Choose your battleground</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/tutorial')}
                  variant="outline"
                  className="border-2 border-secondary hover:bg-secondary/20 hover:border-secondary transition-all duration-300 font-rajdhani font-semibold"
                >
                  How to Play
                </Button>
                <Button
                  onClick={() => navigate('/create-lobby')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red hover:shadow-[0_0_30px_hsl(348_100%_50%/0.8)] transition-all duration-300 hover:scale-105 font-orbitron font-bold"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Lobby
                </Button>
                <Button
                  onClick={signOut}
                  variant="outline"
                  className="border-2 border-border hover:bg-muted hover:border-primary transition-all duration-300 font-rajdhani font-semibold"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Lobbies List */}
        <div className="container mx-auto px-4 py-8">
          {lobbies.length === 0 ? (
            <div className="text-center py-24 animate-fade-in-up">
              <div className="text-8xl text-primary opacity-20 mb-6 animate-float">♦</div>
              <p className="text-2xl text-muted-foreground mb-8 font-rajdhani font-medium">No active lobbies found</p>
              <Button
                onClick={() => navigate('/create-lobby')}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red hover:shadow-[0_0_40px_hsl(348_100%_50%/0.8)] transition-all duration-300 hover:scale-105 font-orbitron font-bold text-lg px-8 py-6"
              >
                <Plus className="mr-2 h-6 w-6" />
                Create the First Lobby
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lobbies.map((lobby, index) => (
                <Card
                  key={lobby.id}
                  className="p-6 bg-card border-2 border-border hover:border-primary transition-all duration-500 cursor-pointer group hover:scale-105 hover:shadow-neon-red animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => joinLobby(lobby.id, !!lobby.password)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-bold text-foreground font-orbitron group-hover:text-primary transition-colors duration-300">
                      {lobby.name}
                    </h3>
                    {lobby.password && (
                      <div className="bg-primary/20 p-2 rounded">
                        <Lock className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-muted-foreground mb-4 font-rajdhani text-lg">
                    <Users className="w-5 h-5 text-secondary" />
                    <span className="font-semibold">
                      <span className="text-foreground">{lobby.player_count}</span> / {lobby.max_players} players
                    </span>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
                  
                  <Button
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-orbitron font-bold tracking-wide transition-all duration-300 hover:shadow-neon-cyan group-hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      joinLobby(lobby.id, !!lobby.password);
                    }}
                  >
                    Join Battle
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="fixed bottom-10 right-10 text-6xl text-primary opacity-10 animate-float pointer-events-none">♦</div>
        <div className="fixed top-1/3 left-10 text-4xl text-secondary opacity-10 animate-float pointer-events-none" style={{ animationDelay: '1s' }}>♦</div>
      </div>
    </PageTransition>
  );
};

export default LobbyBrowser;
