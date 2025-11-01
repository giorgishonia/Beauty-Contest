import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSocket } from '@/contexts/SocketContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { ArrowLeft, Send, Crown, WifiOff } from 'lucide-react';
import { LobbyPlayer, ChatMessage, LobbyData } from '@/types/game';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const LobbyWaitingRoom = () => {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasJoinedRef = useRef(false);

  // Load lobby data
  useEffect(() => {
    if (!user || !lobbyId) {
      navigate('/');
      return;
    }

    loadLobbyData();
  }, [user, lobbyId]);

  // Socket connection and events
  useEffect(() => {
    if (!socket || !connected || !lobbyId || !user) {
      return;
    }

    // Join lobby only once
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      
      const joinData: any = {
        lobbyId,
        userId: user.id
      };

      // Everyone is treated as guest now (no Discord auth)
      joinData.isGuest = true;
      joinData.guestData = JSON.parse(localStorage.getItem('guest_user') || '{}');

      console.log('Joining lobby:', joinData);
      socket.emit('join_lobby', joinData);
    }

    // Socket event handlers
    socket.on('lobby_joined', (data) => {
      console.log('✅ Lobby joined:', data);
    });

    socket.on('room_state', (state) => {
      console.log('📊 Room state received:', state);
      if (state.players && Array.isArray(state.players)) {
        const roomPlayers: LobbyPlayer[] = state.players.map((player: any) => ({
          id: `room-${player.userId}`,
          userId: player.userId,
          username: player.username,
          avatar: player.avatar,
          isReady: player.isReady === true, // Explicitly check for true
          joinedAt: new Date().toISOString(),
          isConnected: player.isConnected !== false
        }));
        setPlayers(roomPlayers);
        
        // Sync ready status - ensure it's properly set
        const myPlayer = roomPlayers.find(p => p.userId === user!.id);
        if (myPlayer) {
          setIsReady(myPlayer.isReady === true);
        }
      }
    });

    socket.on('player_joined', (data) => {
      console.log('👤 Player joined:', data);
      toast({
        title: 'Player Joined',
        description: `${data.username} joined the lobby`
      });
    });

    socket.on('player_disconnected', (data) => {
      console.log('⚠️ Player disconnected:', data);
      toast({
        title: 'Player Disconnected',
        description: `${data.username} lost connection`,
        duration: 3000
      });
      
      // Update player connection status
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.userId === data.userId 
            ? { ...p, isConnected: false }
            : p
        )
      );
    });

    socket.on('player_reconnected', (data) => {
      console.log('✅ Player reconnected:', data);
      toast({
        title: 'Player Reconnected',
        description: `${data.username} rejoined`,
        duration: 3000
      });
      
      // Update player connection status
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.userId === data.userId 
            ? { ...p, isConnected: true }
            : p
        )
      );
    });

    socket.on('player_left', (data) => {
      console.log('👋 Player left:', data);
      toast({
        title: 'Player Left',
        description: `${data.username} left the lobby`
      });
    });

    socket.on('player_ready_changed', (data) => {
      console.log('✅ Player ready changed:', data);
      
      if (data.userId === user!.id) {
        setIsReady(data.isReady === true);
      }

      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.userId === data.userId 
            ? { ...p, isReady: data.isReady === true }
            : p
        )
      );
    });

    socket.on('new_message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socket.on('game_starting', (data) => {
      console.log('🎮 Game starting:', data);
      toast({
        title: 'Game Starting!',
        description: 'Get ready for battle...'
      });
      setTimeout(() => {
        navigate(`/game/${lobbyId}`);
      }, 2000);
    });

    socket.on('error', (data) => {
      console.error('❌ Socket error:', data);
      toast({
        title: 'Error',
        description: data.message,
        variant: 'destructive'
      });
    });

    return () => {
      hasJoinedRef.current = false;
      socket.off('lobby_joined');
      socket.off('room_state');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('player_disconnected');
      socket.off('player_reconnected');
      socket.off('player_ready_changed');
      socket.off('new_message');
      socket.off('game_starting');
      socket.off('error');
    };
  }, [socket, connected, lobbyId, user]);

  const loadLobbyData = async () => {
    try {
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single();

      if (lobbyError) throw lobbyError;
      
      const rawData = lobbyData as any;
      const mappedLobby: LobbyData = {
        id: rawData.id,
        name: rawData.name,
        hostId: rawData.host_id,
        maxPlayers: rawData.max_players,
        roundTimer: rawData.round_timer || 60,
        password: rawData.password,
        status: rawData.status as 'waiting' | 'in_progress' | 'finished'
      };
      
      setLobby(mappedLobby);
      await loadMessages();
    } catch (error) {
      console.error('Error loading lobby:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lobby data',
        variant: 'destructive'
      });
      navigate('/lobby-browser');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('lobby_messages')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedMessages = data.map((msg: any) => ({
        userId: msg.user_id,
        username: msg.profiles.username,
        message: msg.message,
        timestamp: msg.created_at
      }));

      setMessages(formattedMessages);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = () => {
    if (!socket || !messageInput.trim()) return;

    socket.emit('send_message', {
      lobbyId,
      userId: user!.id,
      message: messageInput.trim(),
      isGuest: true // Everyone is guest now
    });

    setMessageInput('');
  };

  const handleToggleReady = () => {
    if (!socket || !connected) {
      toast({
        title: 'Connection Error',
        description: 'Not connected to server. Please refresh and try again.',
        variant: 'destructive'
      });
      return;
    }

    const newReadyState = !isReady;
    console.log('Toggling ready:', { userId: user!.id, newReadyState, currentState: isReady });
    
    setIsReady(newReadyState);

    socket.emit('toggle_ready', {
      lobbyId,
      userId: user!.id,
      isReady: newReadyState,
      isGuest: true // Everyone is guest now
    });
  };

  const handleStartGame = () => {
    if (!socket) return;

    socket.emit('start_game', {
      lobbyId,
      userId: user!.id
    });
  };

  const handleLeaveLobby = async () => {
    if (socket) {
      socket.emit('leave_lobby', {
        lobbyId,
        userId: user!.id,
        isGuest: (user as any)?.isGuest || false
      });
    }
    hasJoinedRef.current = false;
    navigate('/lobby-browser');
  };

  const isHost = lobby?.hostId === user?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-neon-red text-2xl font-orbitron animate-pulse">LOADING LOBBY...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 right-10 text-6xl text-primary opacity-10 animate-float pointer-events-none">♦</div>
        <div className="absolute bottom-1/4 left-10 text-5xl text-secondary opacity-10 animate-float pointer-events-none" style={{ animationDelay: '1.5s' }}>♦</div>

        {/* Header */}
        <div className="border-b-2 border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={handleLeaveLobby}
                variant="outline"
                className="border-2 border-border hover:bg-muted hover:border-neon-red transition-all duration-300 font-rajdhani"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Leave Lobby
              </Button>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-orbitron mb-2">
                  {lobby?.name}
                </h1>
                <p className="text-sm text-muted-foreground font-rajdhani">
                  {players.length}/{lobby?.maxPlayers} Players • {lobby?.roundTimer}s per round
                </p>
              </div>
              <div className="w-32" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players Panel */}
            <div className="lg:col-span-2">
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-6">
                <h2 className="text-2xl font-bold text-neon-red mb-6 font-orbitron flex items-center gap-2">
                  <span className="text-3xl">👥</span> PLAYERS
                </h2>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`
                        p-4 border-2 rounded transition-all duration-300
                        ${player.isReady 
                          ? 'border-neon-cyan bg-neon-cyan/10' 
                          : 'border-border bg-background/50'
                        }
                        ${player.isConnected === false ? 'opacity-60' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16 rounded-lg border-2 border-border overflow-hidden">
                            <AvatarImage 
                              src={player.avatar || undefined} 
                              alt={player.username}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-2xl font-bold font-orbitron text-foreground/50">
                              {player.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold text-foreground font-rajdhani">
                                {player.username}
                              </span>
                              {player.userId === lobby?.hostId && (
                                <Crown className="w-5 h-5 text-primary" />
                              )}
                              {player.isConnected === false && (
                                <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/50 rounded px-2 py-0.5">
                                  <WifiOff className="w-3 h-3 text-yellow-500" />
                                  <span className="text-xs text-yellow-500 font-rajdhani font-semibold">OFFLINE</span>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground font-rajdhani">
                              Player {index + 1}
                            </div>
                          </div>
                        </div>
                        <div className={`
                          px-4 py-2 rounded font-bold font-orbitron text-sm
                          ${player.isReady 
                            ? 'bg-neon-cyan text-background' 
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          {player.isReady ? 'READY' : 'NOT READY'}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: (lobby?.maxPlayers || 5) - players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="p-4 border-2 border-dashed border-border/50 rounded bg-background/30"
                    >
                      <div className="flex items-center gap-4 opacity-30">
                        <div className="w-16 h-16 rounded-lg border-2 border-border bg-muted" />
                        <span className="text-lg text-muted-foreground font-rajdhani">
                          Waiting for player...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-1">
              <div className="bg-card/50 backdrop-blur-sm border-2 border-border rounded p-6 h-[600px] flex flex-col">
                <h2 className="text-2xl font-bold text-neon-cyan mb-4 font-orbitron flex items-center gap-2">
                  <span className="text-3xl">💬</span> CHAT
                </h2>
                
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-3">
                    {messages.map((msg, index) => (
                      <div key={index} className="animate-fade-in">
                        <div className="text-xs text-neon-cyan font-rajdhani">
                          {msg.username}
                        </div>
                        <div className="text-sm text-foreground font-rajdhani mt-1 bg-background/50 p-2 rounded">
                          {msg.message}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type message..."
                    className="flex-1 bg-background border-2 border-border focus:border-neon-cyan font-rajdhani"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="bg-secondary hover:bg-secondary/90 border-2 border-secondary font-orbitron"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-6 mt-8">
            <Button
              onClick={handleToggleReady}
              size="lg"
              className={`
                text-xl px-12 py-6 border-2 font-orbitron font-bold tracking-wider transition-all duration-300
                ${isReady
                  ? 'bg-muted hover:bg-muted/80 border-muted text-muted-foreground'
                  : 'bg-secondary hover:bg-secondary/90 border-secondary text-secondary-foreground shadow-neon-cyan hover:shadow-[0_0_40px_hsl(180_100%_50%/0.8)]'
                }
              `}
            >
              {isReady ? 'NOT READY' : 'READY'}
            </Button>

            {isHost && (
              <Button
                onClick={handleStartGame}
                size="lg"
                disabled={!players.filter(p => p.isConnected !== false).every(p => p.isReady === true) || players.filter(p => p.isConnected !== false).length < 3}
                className="text-xl px-12 py-6 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red hover:shadow-[0_0_40px_hsl(348_100%_50%/0.8)] font-orbitron font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                START GAME
              </Button>
            )}
          </div>

          {isHost && (
            <p className="text-center mt-4 text-sm text-muted-foreground font-rajdhani">
              All players must be ready to start the game
            </p>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default LobbyWaitingRoom;
