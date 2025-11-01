import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/layout/PageTransition';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const StrategyTutorial = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(hsl(180 100% 50% / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(180 100% 50% / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-10 text-6xl text-primary opacity-10 animate-float pointer-events-none">♦</div>
        <div className="absolute bottom-1/4 left-10 text-5xl text-secondary opacity-10 animate-float pointer-events-none" style={{ animationDelay: '1.5s' }}>♦</div>

        {/* Header */}
        <div className="relative z-10 border-b-2 border-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <Button
              onClick={() => navigate('/lobby-browser')}
              variant="outline"
              className="border-2 border-border hover:bg-muted hover:border-primary transition-all duration-300 font-rajdhani"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobbies
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-orbitron mb-4">
                # STRATEGY TIPS & TUTORIAL
              </h1>
              <div className="text-2xl text-neon-cyan font-rajdhani">King of Diamonds • Beauty Contest</div>
            </motion.div>

            {/* Section 1: How to Play */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <div className="bg-card/80 backdrop-blur-sm border-4 border-neon-cyan rounded-lg p-8">
                <h2 className="text-4xl font-bold text-neon-cyan font-orbitron mb-6 flex items-center gap-3">
                  <span className="text-5xl">1.</span> HOW TO PLAY
                </h2>
                <div className="space-y-4 text-lg text-foreground font-rajdhani leading-relaxed">
                  <p className="text-xl">
                    <span className="font-bold text-neon-red">Objective:</span> Choose a number 0-100. 
                    Win by picking the number closest to (the average of all choices) × 0.8. 
                    Lose -1 point per loss. -10 points = <span className="font-bold text-neon-red">ELIMINATION</span>.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Section 2: Dynamic Rules */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-12"
            >
              <div className="bg-card/80 backdrop-blur-sm border-4 border-neon-red rounded-lg p-8">
                <h2 className="text-4xl font-bold text-neon-red font-orbitron mb-8 flex items-center gap-3">
                  <span className="text-5xl">2.</span> DYNAMIC RULES EXPLAINED
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Rule 1 */}
                  <div className="border-2 border-neon-cyan rounded-lg p-6 bg-neon-cyan/10">
                    <div className="text-2xl font-bold text-neon-cyan font-orbitron mb-3">
                      Rule 1
                    </div>
                    <div className="text-sm text-muted-foreground font-rajdhani mb-3">
                      (Unlocked after 2 eliminations):
                    </div>
                    <div className="text-lg text-foreground font-rajdhani">
                      <span className="font-bold">DUPLICATE NUMBERS</span><br/>
                      <span className="font-bold">BECOME INVALID</span>
                    </div>
                  </div>

                  {/* Rule 2 */}
                  <div className="border-2 border-neon-cyan rounded-lg p-6 bg-neon-cyan/10">
                    <div className="text-2xl font-bold text-neon-cyan font-orbitron mb-3">
                      Rule 2
                    </div>
                    <div className="text-sm text-muted-foreground font-rajdhani mb-3">
                      (Unlocked with Rule 1):
                    </div>
                    <div className="text-lg text-foreground font-rajdhani">
                      <span className="font-bold">EXACT MATCH DOUBLES</span><br/>
                      <span className="font-bold">LOSER PENALTY (-2)</span>
                    </div>
                  </div>

                  {/* Rule 3 */}
                  <div className="border-2 border-neon-red rounded-lg p-6 bg-neon-red/10">
                    <div className="text-2xl font-bold text-neon-red font-orbitron mb-3">
                      Rule 3
                    </div>
                    <div className="text-sm text-muted-foreground font-rajdhani mb-3">
                      (Unlocked after 3 eliminations):
                    </div>
                    <div className="text-lg text-foreground font-rajdhani">
                      <span className="font-bold">IF ANYONE CHOOSES 0,</span><br/>
                      <span className="font-bold">PLAYER CHOOSING 100 WINS</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Section 3: Game Theory */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-12"
            >
              <div className="bg-card/80 backdrop-blur-sm border-4 border-secondary rounded-lg p-8">
                <h2 className="text-4xl font-bold text-neon-cyan font-orbitron mb-8 flex items-center gap-3">
                  <span className="text-5xl">3.</span> GAME THEORY CONCEPTS
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Text */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-secondary font-orbitron mb-3">
                        KEYNESIAN BEAUTY CONTEST:
                      </h3>
                      <p className="text-lg text-foreground font-rajdhani leading-relaxed">
                        Predict what <span className="text-neon-cyan font-bold">others think</span> the average will be, 
                        not what <span className="text-neon-red font-bold">you think</span> it should be.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-secondary font-orbitron mb-3">
                        NASH EQUILIBRIUM:
                      </h3>
                      <p className="text-lg text-foreground font-rajdhani leading-relaxed">
                        A state where no player can improve by changing their strategy 
                        <span className="text-neon-cyan font-bold"> ALONE</span>.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-neon-red font-orbitron mb-3">
                        OPTIMAL STRATEGY:
                      </h3>
                      <p className="text-lg text-foreground font-rajdhani leading-relaxed">
                        Aim <span className="text-neon-red font-bold">LOWER</span> with fewer rules & players. 
                        Adapt strategy as eliminations unlock new dynamics.
                      </p>
                    </div>
                  </div>

                  {/* Right: Visual */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-64 h-64">
                      {/* Tree diagram representation */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 200 200" className="w-full h-full opacity-50">
                          {/* Lines */}
                          <line x1="100" y1="50" x2="50" y2="100" stroke="hsl(180 100% 50%)" strokeWidth="2"/>
                          <line x1="100" y1="50" x2="150" y2="100" stroke="hsl(180 100% 50%)" strokeWidth="2"/>
                          <line x1="50" y1="100" x2="30" y2="150" stroke="hsl(180 100% 50%)" strokeWidth="2"/>
                          <line x1="50" y1="100" x2="70" y2="150" stroke="hsl(180 100% 50%)" strokeWidth="2"/>
                          <line x1="150" y1="100" x2="130" y2="150" stroke="hsl(180 100% 50%)" strokeWidth="2"/>
                          <line x1="150" y1="100" x2="170" y2="150" stroke="hsl(180 100% 50%)" strokeWidth="2"/>
                          {/* Nodes */}
                          <circle cx="100" cy="50" r="15" fill="hsl(348 100% 50%)" />
                          <circle cx="50" cy="100" r="12" fill="hsl(180 100% 50%)" />
                          <circle cx="150" cy="100" r="12" fill="hsl(180 100% 50%)" />
                          <circle cx="30" cy="150" r="10" fill="hsl(180 100% 50%)" />
                          <circle cx="70" cy="150" r="10" fill="hsl(180 100% 50%)" />
                          <circle cx="130" cy="150" r="10" fill="hsl(180 100% 50%)" />
                          <circle cx="170" cy="150" r="10" fill="hsl(180 100% 50%)" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-6xl text-primary opacity-30 animate-pulse">⚖️</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <Button
                onClick={() => navigate('/lobby-browser')}
                size="lg"
                className="text-2xl px-16 py-8 bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary shadow-neon-red hover:shadow-[0_0_40px_hsl(348_100%_50%/0.8)] hover:scale-105 font-orbitron font-bold tracking-wider"
              >
                READY TO PLAY
              </Button>
              <div className="mt-8 text-3xl text-primary opacity-50 font-orbitron">ゲーム発始</div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default StrategyTutorial;

