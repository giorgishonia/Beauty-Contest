import { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/layout/PageTransition';
import { Standing } from '@/types/game';
import { motion } from 'framer-motion';
import { Trophy, Home, BarChart3 } from 'lucide-react';

const VictoryScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lobbyId } = useParams();
  const standings: Standing[] = location.state?.standings || [];

  useEffect(() => {
    if (standings.length === 0) {
      navigate('/lobby-browser');
    }
  }, [standings]);

  const winner = standings[0];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-secondary/20" />
          {/* Floating diamonds */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100 }}
              animate={{ 
                opacity: [0, 1, 0],
                y: [-100, -500],
                x: Math.random() * 100 - 50
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
              className="absolute text-4xl text-primary opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: 0
              }}
            >
              ♦
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Victory Title */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="text-center mb-12"
            >
              <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary font-orbitron mb-6"
                style={{ textShadow: '0 0 60px hsl(348 100% 50% / 0.5)' }}
              >
                # VICTORY
              </h1>
            </motion.div>

            {/* Winner Laurel */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center mb-12"
            >
              <div className="relative">
                {/* Laurel wreath effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="text-9xl text-primary opacity-30"
                  >
                    ◈
                  </motion.div>
                </div>
                
                {/* Winner avatar */}
                <div className="relative w-48 h-48 rounded-full border-8 border-primary shadow-[0_0_60px_hsl(348_100%_50%/0.6)] bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                  <div className="text-7xl font-bold font-orbitron text-foreground">
                    {winner?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <Trophy className="absolute -top-8 -right-8 w-16 h-16 text-primary" />
                </div>
              </div>
            </motion.div>

            {/* Winner Name */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mb-12"
            >
              <div className="text-5xl font-bold text-neon-cyan font-orbitron mb-2">
                {winner?.username || 'Unknown'}
              </div>
              <div className="text-2xl text-muted-foreground font-rajdhani">
                Victory Score: <span className="text-neon-cyan font-bold">{winner?.score || 0}</span>
              </div>
            </motion.div>

            {/* Final Standings */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="bg-card/80 backdrop-blur-sm border-4 border-neon-cyan rounded-lg p-8 mb-8"
            >
              <h2 className="text-3xl font-bold text-neon-cyan font-orbitron mb-6 text-center">
                FINAL STANDINGS
              </h2>
              <div className="space-y-3">
                {standings.map((standing, index) => (
                  <motion.div
                    key={standing.userId}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + index * 0.1 }}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300
                      ${index === 0
                        ? 'border-primary bg-primary/20'
                        : standing.isEliminated
                        ? 'border-neon-red/50 bg-neon-red/10 grayscale opacity-70'
                        : 'border-border bg-background/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        text-3xl font-bold font-orbitron w-12 text-center
                        ${index === 0 ? 'text-primary' : 'text-muted-foreground'}
                      `}>
                        {standing.rank}.
                      </div>
                      <div className="w-12 h-12 rounded-lg border-2 border-border bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-xl font-bold font-orbitron">
                          {standing.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className={`
                          text-xl font-bold font-rajdhani
                          ${index === 0 ? 'text-primary' : 'text-foreground'}
                        `}>
                          {standing.username}
                        </div>
                        {standing.isEliminated && (
                          <div className="text-sm text-neon-red font-rajdhani">
                            ELIMINATED
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`
                      text-3xl font-bold font-orbitron
                      ${standing.score >= 0 ? 'text-neon-cyan' : 'text-neon-red'}
                    `}>
                      {standing.score > 0 && '+'}{standing.score}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex flex-wrap justify-center gap-6"
            >
              <Button
                onClick={() => navigate('/lobby-browser')}
                size="lg"
                className="text-xl px-12 py-6 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red hover:shadow-[0_0_40px_hsl(348_100%_50%/0.8)] font-orbitron font-bold tracking-wider"
              >
                <Home className="mr-2 w-6 h-6" />
                RETURN TO LOBBY
              </Button>
              <Button
                onClick={() => navigate('/stats')}
                size="lg"
                variant="outline"
                className="text-xl px-12 py-6 border-2 border-secondary hover:bg-secondary/20 hover:border-secondary font-orbitron font-bold tracking-wider"
              >
                <BarChart3 className="mr-2 w-6 h-6" />
                VIEW STATS
              </Button>
            </motion.div>

            {/* Japanese text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="text-center mt-12"
            >
              <p className="text-4xl font-orbitron text-primary opacity-50">ゲームクリア</p>
              <p className="text-lg text-muted-foreground font-rajdhani mt-2">Game Clear</p>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default VictoryScreen;

