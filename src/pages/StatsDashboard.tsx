import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/layout/PageTransition';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserStats {
  games_played: number;
  games_won: number;
  total_rounds_played: number;
  total_rounds_survived: number;
  favorite_number: number | null;
}

const StatsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      // Load user stats
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (statsError) throw statsError;
      setStats(statsData);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const winRate = stats && stats.games_played > 0 
    ? ((stats.games_won / stats.games_played) * 100).toFixed(1) 
    : 0;

  const survivalRate = stats && stats.total_rounds_played > 0
    ? ((stats.total_rounds_survived / stats.total_rounds_played) * 100).toFixed(1)
    : 0;

  const avgSurvivalRounds = stats && stats.games_played > 0
    ? (stats.total_rounds_survived / stats.games_played).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-neon-red text-2xl font-orbitron animate-pulse">LOADING STATS...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(hsl(348 100% 50% / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(348 100% 50% / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

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
              className="text-center mb-12"
            >
              <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-orbitron mb-4">
                # STATISTICS DASHBOARD
              </h1>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Player Profile */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card/80 backdrop-blur-sm border-4 border-neon-cyan rounded-lg p-8"
              >
                <h2 className="text-3xl font-bold text-neon-cyan font-orbitron mb-6">
                  PLAYER PROFILE
                </h2>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-32 h-32 rounded-lg border-4 border-border bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                    <span className="text-5xl font-bold font-orbitron text-foreground">
                      {profile?.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground font-rajdhani mb-2">
                      {profile?.username || 'Unknown'}
                    </div>
                    <div className="text-sm text-muted-foreground font-rajdhani">
                      Player Since {new Date(profile?.created_at || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-background/50 rounded border-2 border-border">
                    <span className="text-lg text-neon-cyan font-rajdhani">Total Games Played</span>
                    <span className="text-3xl font-bold text-foreground font-orbitron">{stats?.games_played || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-background/50 rounded border-2 border-border">
                    <span className="text-lg text-neon-cyan font-rajdhani">Total Wins</span>
                    <span className="text-3xl font-bold text-neon-cyan font-orbitron">{stats?.games_won || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-background/50 rounded border-2 border-border">
                    <span className="text-lg text-neon-cyan font-rajdhani">Survival Rate</span>
                    <span className="text-3xl font-bold text-secondary font-orbitron">{survivalRate}%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-background/50 rounded border-2 border-border">
                    <span className="text-lg text-neon-cyan font-rajdhani">Avg Survival Rounds</span>
                    <span className="text-3xl font-bold text-foreground font-orbitron">{avgSurvivalRounds}</span>
                  </div>
                  {stats?.favorite_number !== null && (
                    <div className="flex justify-between items-center p-4 bg-background/50 rounded border-2 border-border">
                      <span className="text-lg text-neon-cyan font-rajdhani">Favorite Number</span>
                      <span className="text-3xl font-bold text-neon-red font-orbitron">{stats.favorite_number}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Performance Analytics */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card/80 backdrop-blur-sm border-4 border-neon-red rounded-lg p-8"
              >
                <h2 className="text-3xl font-bold text-neon-red font-orbitron mb-6">
                  PERFORMANCE ANALYTICS
                </h2>

                {/* Win/Loss Ratio Visual */}
                <div className="mb-8">
                  <div className="text-lg text-neon-cyan font-rajdhani mb-2">Win/Loss Ratio</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-16 bg-background rounded-lg overflow-hidden border-2 border-border flex">
                      <div 
                        className="bg-neon-cyan flex items-center justify-center text-background font-bold font-orbitron transition-all duration-500"
                        style={{ width: `${winRate}%` }}
                      >
                        {winRate > 15 && `${stats?.games_won || 0}W`}
                      </div>
                      <div 
                        className="bg-neon-red flex items-center justify-center text-white font-bold font-orbitron transition-all duration-500"
                        style={{ width: `${100 - Number(winRate)}%` }}
                      >
                        {100 - Number(winRate) > 15 && `${(stats?.games_played || 0) - (stats?.games_won || 0)}L`}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground font-orbitron min-w-[80px] text-right">
                      {winRate}%
                    </div>
                  </div>
                </div>

                {/* Number Selection Heatmap Placeholder */}
                <div className="mb-8">
                  <div className="text-lg text-neon-cyan font-rajdhani mb-4">Number Selection Heatmap</div>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-background/50 border border-border/30 rounded text-xs font-orbitron flex items-center justify-center text-muted-foreground hover:bg-primary/20 transition-colors cursor-pointer"
                        title={`Number ${i}`}
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground font-rajdhani mt-2 text-center">
                    (Heatmap data will be available after more games played)
                  </div>
                </div>

                {/* Survival Rate Over Time */}
                <div>
                  <div className="text-lg text-neon-cyan font-rajdhani mb-4">Survival Rate Over Time</div>
                  <div className="h-32 bg-background/50 border-2 border-border rounded-lg flex items-end justify-between p-4">
                    {/* Simplified bar chart */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex-1 mx-1 bg-neon-cyan/20 rounded-t" style={{ height: `${Math.random() * 100}%` }} />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground font-rajdhani mt-2 text-center">
                    Recent 10 games performance trend
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Games Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 bg-card/80 backdrop-blur-sm border-4 border-secondary rounded-lg p-8"
            >
              <h2 className="text-3xl font-bold text-secondary font-orbitron mb-6">
                RECENT GAMES
              </h2>
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-30">📊</div>
                <div className="text-xl text-muted-foreground font-rajdhani">
                  Your recent game history will appear here
                </div>
              </div>
            </motion.div>

            {/* Bottom Japanese text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mt-12"
            >
              <p className="text-3xl font-orbitron text-primary opacity-50">ゲーム統計</p>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default StatsDashboard;

