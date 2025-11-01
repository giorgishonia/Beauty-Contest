import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { UserPlus } from 'lucide-react';

const Landing = () => {
  const { user, loading, signInAsGuest } = useAuth();
  const navigate = useNavigate();
  const [guestName, setGuestName] = useState('');
  const [showGuestInput, setShowGuestInput] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/lobby-browser');
    }
  }, [user, navigate]);

  const handleGuestSignIn = () => {
    if (guestName.trim()) {
      signInAsGuest(guestName.trim());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-neon-red text-2xl font-orbitron animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background opacity-50" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50 animate-pulse" />
          
          {/* Floating diamonds */}
          <div className="absolute top-1/4 left-1/4 text-6xl text-primary opacity-10 animate-float">♦</div>
          <div className="absolute top-1/3 right-1/4 text-4xl text-secondary opacity-10 animate-float" style={{ animationDelay: '1s' }}>♦</div>
          <div className="absolute bottom-1/4 left-1/3 text-5xl text-primary opacity-10 animate-float" style={{ animationDelay: '2s' }}>♦</div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          {/* Title with staggered animation */}
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="mb-6 flex items-center justify-center gap-6">
              <span className="text-6xl text-primary animate-scale-pulse">♦</span>
              <h1 className="text-7xl md:text-9xl font-bold text-foreground tracking-tight font-orbitron">
                BALANCE
              </h1>
              <span className="text-6xl text-primary animate-scale-pulse" style={{ animationDelay: '0.5s' }}>♦</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary mb-4 animate-glow-pulse font-orbitron">
              SCALE
            </h2>
            <p className="text-2xl md:text-3xl text-muted-foreground font-light tracking-[0.3em] animate-fade-in" style={{ animationDelay: '0.3s' }}>
              答え / ANSWER
            </p>
          </div>

          {/* Game Description */}
          <div className="max-w-2xl mx-auto mb-12 p-8 border-2 border-border rounded bg-card/50 backdrop-blur-sm hover:border-primary transition-all duration-500 animate-fade-in-up shadow-lg hover:shadow-neon-red" style={{ animationDelay: '0.4s' }}>
            <p className="text-xl text-center text-foreground/90 leading-relaxed font-rajdhani font-medium">
              A multiplayer game of <span className="text-neon-red font-bold">strategy</span> and <span className="text-neon-cyan font-bold">psychology</span>. 
              Choose a number between <span className="text-neon-red font-bold">0</span> and <span className="text-neon-red font-bold">100</span>.
            </p>
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <p className="text-lg text-center text-muted-foreground font-rajdhani">
              The winning number is the <span className="text-neon-cyan">average × 0.8</span>
            </p>
            <p className="text-lg text-center text-muted-foreground mt-2 font-rajdhani">
              Closest player wins. Others lose. Reach <span className="text-neon-red font-bold">-10</span> points = <span className="text-neon-red font-bold">ELIMINATION</span>
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-neon-cyan">
              <span className="text-sm font-rajdhani tracking-wider">KING OF DIAMONDS</span>
              <span className="text-3xl animate-pulse">♦</span>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="flex flex-col items-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            {!showGuestInput ? (
              <Button
                onClick={() => setShowGuestInput(true)}
                size="lg"
                className="text-xl px-16 py-8 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red transition-all duration-300 hover:shadow-[0_0_40px_hsl(348_100%_50%/0.8)] hover:scale-105 font-orbitron font-bold tracking-wider relative overflow-hidden group"
              >
                <UserPlus className="mr-2 h-6 w-6" />
                <span className="relative z-10">PLAY NOW</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </Button>
            ) : (
              <div className="w-full max-w-md space-y-4 animate-fade-in">
                <div className="bg-card/80 backdrop-blur-sm border-2 border-secondary rounded-lg p-6">
                  <label className="block text-lg font-bold text-neon-cyan mb-3 font-orbitron">
                    ENTER YOUR NAME
                  </label>
                  <Input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGuestSignIn()}
                    placeholder="Enter your name"
                    maxLength={20}
                    className="text-lg h-12 bg-background border-2 border-border focus:border-secondary font-rajdhani mb-4"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleGuestSignIn}
                      disabled={!guestName.trim()}
                      className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground border-2 border-secondary font-orbitron font-bold"
                    >
                      CONTINUE
                    </Button>
                    <Button
                      onClick={() => {
                        setShowGuestInput(false);
                        setGuestName('');
                      }}
                      variant="outline"
                      className="border-2 border-border hover:bg-muted font-rajdhani"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground font-rajdhani text-center max-w-md">
              Enter your name to start playing instantly
            </p>
          </div>

          {/* Rules Preview */}
          <div className="mt-20 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="p-6 border-2 border-border rounded bg-card/30 backdrop-blur-sm hover:border-neon-red hover:bg-card/50 transition-all duration-300 hover:scale-105 hover:shadow-neon-red group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-neon-red font-bold text-xl font-orbitron">RULE 1</div>
                <div className="text-3xl opacity-50 group-hover:opacity-100 transition-opacity">♦</div>
              </div>
              <p className="text-base text-muted-foreground font-rajdhani">
                Unlocked after <span className="text-neon-red font-bold">2 eliminations</span>: Duplicate numbers become invalid
              </p>
            </div>
            <div className="p-6 border-2 border-border rounded bg-card/30 backdrop-blur-sm hover:border-neon-cyan hover:bg-card/50 transition-all duration-300 hover:scale-105 hover:shadow-neon-cyan group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-neon-cyan font-bold text-xl font-orbitron">RULE 2</div>
                <div className="text-3xl opacity-50 group-hover:opacity-100 transition-opacity">♦</div>
              </div>
              <p className="text-base text-muted-foreground font-rajdhani">
                With Rule 1: Exact match with target doubles penalty to <span className="text-neon-cyan font-bold">-2</span>
              </p>
            </div>
            <div className="p-6 border-2 border-border rounded bg-card/30 backdrop-blur-sm hover:border-neon-red hover:bg-card/50 transition-all duration-300 hover:scale-105 hover:shadow-neon-red group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-neon-red font-bold text-xl font-orbitron">RULE 3</div>
                <div className="text-3xl opacity-50 group-hover:opacity-100 transition-opacity">♦</div>
              </div>
              <p className="text-base text-muted-foreground font-rajdhani">
                After <span className="text-neon-red font-bold">3 eliminations</span>: If anyone picks 0, the 100 picker wins
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 text-center text-muted-foreground text-sm font-rajdhani animate-fade-in" style={{ animationDelay: '1s' }}>
            <p className="tracking-wide">Inspired by Alice in Borderland</p>
            <p className="mt-2 text-2xl font-orbitron text-primary opacity-50">ゲームオーバー</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Landing;
