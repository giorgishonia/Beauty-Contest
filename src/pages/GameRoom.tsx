import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/hooks/use-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { PlayerCard } from '@/components/game/PlayerCard';
import { NumberSelector } from '@/components/game/NumberSelector';
import { ResultDisplay } from '@/components/game/ResultDisplay';
import { RulesPanel } from '@/components/game/RulesPanel';
import { Timer } from '@/components/game/Timer';
import { GameState, Player, ScoreUpdates } from '@/types/game';
import { motion, AnimatePresence } from 'framer-motion';

const GameRoom = () => {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>({
    lobbyId: lobbyId!,
    gameId: null,
    roundNumber: 1,
    phase: 'waiting',
    activeRules: [],
    timeRemaining: 60,
    players: [],
    roundHistory: [],
    currentChoice: null,
    hasSubmitted: false
  });

  const [eliminationCount, setEliminationCount] = useState(0);
  const [roundTimer, setRoundTimer] = useState(60);
  const [revealData, setRevealData] = useState<any>(null);
  const [scoreUpdates, setScoreUpdates] = useState<ScoreUpdates>({});
  const [newlyEliminated, setNewlyEliminated] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !lobbyId || !socket || !connected) {
      if (!socket || !connected) {
        toast({
          title: 'Connection Error',
          description: 'Not connected to server. Please refresh.',
          variant: 'destructive'
        });
      }
      navigate('/lobby-browser');
      return;
    }

    // Join lobby if not already joined
    const joinData: any = {
      lobbyId,
      userId: user.id
    };

    // Everyone is treated as guest now (no Discord auth)
    joinData.isGuest = true;
    joinData.guestData = JSON.parse(localStorage.getItem('guest_user') || '{}');

    socket.emit('join_lobby', joinData);

    // Socket event handlers
    socket.on('room_state', (state) => {
      console.log('📊 Room state:', state);
      setGameState(prev => ({
        ...prev,
        ...state,
        players: state.players || [],
        // Only preserve choice/submission if game is actually in submission phase
        currentChoice: state.phase === 'submission' ? prev.currentChoice : null,
        hasSubmitted: state.phase === 'submission' ? prev.hasSubmitted : false
      }));
    });

    socket.on('game_starting', (data) => {
      console.log('🎮 Game starting event received:', data);
      // Game is starting, round_start should follow shortly
      toast({
        title: 'Game Starting!',
        description: 'Get ready...'
      });
    });

    socket.on('round_start', (data) => {
      console.log('🎮 Round start:', data);
      setGameState(prev => ({
        ...prev,
        roundNumber: data.roundNumber,
        phase: 'submission',
        timeRemaining: data.timeRemaining,
        activeRules: data.activeRules,
        players: data.players,
        currentChoice: null,
        hasSubmitted: false
      }));
      setRevealData(null);
      setScoreUpdates({});
      setNewlyEliminated([]);
      setRoundTimer(data.timeRemaining);
    });

    socket.on('timer_update', (data) => {
      setGameState(prev => ({
        ...prev,
        timeRemaining: data.timeRemaining
      }));
    });

    socket.on('player_submitted', (data) => {
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.userId === data.userId
            ? { ...p, hasSubmitted: true }
            : p
        )
      }));
    });

    socket.on('submission_confirmed', () => {
      setGameState(prev => ({
        ...prev,
        hasSubmitted: true
      }));
      toast({
        title: 'Choice Locked',
        description: 'Your number has been submitted'
      });
    });

    socket.on('submission_error', (data) => {
      toast({
        title: 'Submission Failed',
        description: data.message,
        variant: 'destructive'
      });
      setGameState(prev => ({
        ...prev,
        hasSubmitted: false
      }));
    });

    socket.on('round_reveal', (data) => {
      console.log('🎯 Round reveal:', data);
      setRevealData(data);
      setGameState(prev => ({
        ...prev,
        phase: 'reveal',
        players: prev.players.map(p => {
          const choice = data.choices.find((c: any) => c.userId === p.userId);
          return choice ? { ...p, currentChoice: choice.number } : p;
        })
      }));
    });

    socket.on('round_scored', (data) => {
      console.log('📊 Round scored:', data);
      setScoreUpdates(data.scoreUpdates);
      setNewlyEliminated(data.eliminatedPlayers.map((p: any) => p.userId));
      
      if (data.newRulesUnlocked.length > 0) {
        toast({
          title: 'New Rules Unlocked!',
          description: 'Check the rules panel for updates'
        });
      }

      setGameState(prev => ({
        ...prev,
        phase: 'scoring',
        players: prev.players.map(p => ({
          ...p,
          score: data.scoreUpdates[p.userId]?.newScore ?? p.score,
          isEliminated: data.eliminatedPlayers.some((ep: any) => ep.userId === p.userId) || p.isEliminated
        }))
      }));

      if (data.eliminatedPlayers.length > 0) {
        setEliminationCount(prev => prev + data.eliminatedPlayers.length);
      }
    });

    socket.on('game_over', (data) => {
      console.log('🏆 Game over:', data);
      setTimeout(() => {
        navigate(`/victory/${lobbyId}`, { state: { standings: data.standings } });
      }, 3000);
    });

    socket.on('player_disconnected', (data) => {
      console.log('⚠️ Player disconnected:', data);
      toast({
        title: 'Player Disconnected',
        description: `${data.username} lost connection`,
        duration: 3000
      });
      
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.userId === data.userId
            ? { ...p, isConnected: false }
            : p
        )
      }));
    });

    socket.on('player_reconnected', (data) => {
      console.log('✅ Player reconnected:', data);
      toast({
        title: 'Player Reconnected',
        description: `${data.username} rejoined`,
        duration: 3000
      });
      
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.userId === data.userId
            ? { ...p, isConnected: true }
            : p
        )
      }));
    });

    socket.on('error', (data) => {
      toast({
        title: 'Error',
        description: data.message,
        variant: 'destructive'
      });
    });

    return () => {
      socket.off('room_state');
      socket.off('game_starting');
      socket.off('round_start');
      socket.off('timer_update');
      socket.off('player_submitted');
      socket.off('submission_confirmed');
      socket.off('submission_error');
      socket.off('round_reveal');
      socket.off('round_scored');
      socket.off('game_over');
      socket.off('player_disconnected');
      socket.off('player_reconnected');
      socket.off('error');
    };
  }, [socket, connected, lobbyId, user]);

  const handleSubmitNumber = (number: number) => {
    if (!socket || !connected) {
      toast({
        title: 'Connection Error',
        description: 'Not connected to server',
        variant: 'destructive'
      });
      return;
    }

    socket.emit('submit_number', {
      lobbyId,
      userId: user!.id,
      number
    });

    setGameState(prev => ({
      ...prev,
      currentChoice: number,
      hasSubmitted: true
    }));
  };

  const myPlayer = gameState.players.find(p => p.userId === user?.id);
  const winnerId = revealData?.winnerId;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(hsl(180 100% 50% / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(180 100% 50% / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Header */}
        <div className="relative z-10 border-b-2 border-border bg-card/80 backdrop-blur-sm py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              {/* Round Number */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-sm text-muted-foreground font-rajdhani">ROUND</div>
                  <div className="text-3xl font-bold text-neon-red font-orbitron">
                    {gameState.roundNumber}
                  </div>
                </div>
              </div>

              {/* Timer */}
              {gameState.phase === 'submission' && (
                <Timer timeRemaining={gameState.timeRemaining} roundTimer={roundTimer} />
              )}

              {/* Your Score */}
              <div className="text-right">
                <div className="text-sm text-muted-foreground font-rajdhani">YOUR SCORE</div>
                <div className={`
                  text-3xl font-bold font-orbitron
                  ${(myPlayer?.score ?? 0) >= 0 ? 'text-neon-cyan' : 'text-neon-red'}
                `}>
                  {(myPlayer?.score ?? 0) > 0 && '+'}{myPlayer?.score ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Game Area */}
            <div className="lg:col-span-3 space-y-8">
              {/* Player Cards */}
              <div className="grid grid-cols-5 gap-4">
                {gameState.players.map((player) => (
                  <PlayerCard
                    key={player.userId}
                    player={player}
                    isWinner={gameState.phase === 'reveal' && player.userId === winnerId}
                    scoreChange={scoreUpdates[player.userId]?.scoreChange}
                    showChoice={gameState.phase !== 'submission' && gameState.phase !== 'waiting'}
                  />
                ))}
              </div>

              {/* Phase Content */}
              <AnimatePresence mode="wait">
                {gameState.phase === 'submission' && (
                  <motion.div
                    key="submission"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="py-8"
                  >
                    {gameState.hasSubmitted ? (
                      <div className="text-center py-16">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="text-6xl text-neon-cyan mb-4"
                        >
                          ⏳
                        </motion.div>
                        <div className="text-3xl font-bold text-neon-cyan font-orbitron mb-2">
                          WAITING FOR OTHERS
                        </div>
                        <div className="text-lg text-muted-foreground font-rajdhani">
                          Your choice: {gameState.currentChoice}
                        </div>
                      </div>
                    ) : (
                      <NumberSelector
                        onSubmit={handleSubmitNumber}
                        disabled={gameState.hasSubmitted || myPlayer?.isEliminated}
                      />
                    )}
                  </motion.div>
                )}

                {(gameState.phase === 'reveal' || gameState.phase === 'scoring') && revealData && (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="py-8"
                  >
                    <ResultDisplay
                      average={revealData.average}
                      winningNumber={revealData.winningNumber}
                      show={true}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rules Sidebar */}
            <div className="lg:col-span-1">
              <RulesPanel
                activeRules={gameState.activeRules}
                eliminationCount={eliminationCount}
              />
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="fixed bottom-10 right-10 text-6xl text-primary opacity-10 animate-float pointer-events-none">♦</div>
        <div className="fixed top-1/3 left-10 text-4xl text-secondary opacity-10 animate-float pointer-events-none" style={{ animationDelay: '1s' }}>♦</div>
      </div>
    </PageTransition>
  );
};

export default GameRoom;
